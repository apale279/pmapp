import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteDoc, doc, getDoc, type Timestamp } from 'firebase/firestore'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { useAuth } from '../../context/AuthContext'
import { useRankTheme } from '../../hooks/useRankTheme'
import { db } from '../../lib/firebase'
import { staffSoftRefFromUser } from '../../lib/staffSoftRef'
import { createPazienteWithProgressivo } from '../../lib/createPazienteWithProgressivo'
import { updateSchedaPazienteGranular } from '../../lib/updateSchedaPaziente'
import { usePazientiForPma } from '../../hooks/usePazientiForPma'
import { usePmaDocSnapshot } from '../../hooks/usePmaDocNome'
import { useManifestazioneDoc } from '../../hooks/useManifestazioneDoc'
import { useDimessiManifestazione } from '../../hooks/useDimessiManifestazione'
import { parsePazienteFromFirestore } from '../../hooks/usePazienteDoc'
import {
  buildMailtoReportPaziente,
  buildPazientePdfBlob,
  defaultPdfFilename,
  sanitizeFilePart,
} from '../../lib/pdf/pazientePdfReport'
import type { CodiceColorePaziente } from '../../types/paziente'
import { CODICE_COLORE_LABEL, PAZIENTE_STATO_LABEL } from '../../types/paziente'
import type { PazienteListItem } from '../../hooks/usePazientiForPma'

/** Ordine triage per elenchi (rosso in cima). */
const CODICI_ORDINE_TRIAGE: CodiceColorePaziente[] = ['rosso', 'giallo', 'verde', 'bianco']
/** Ordine pallini conteggio in UI (bianco → rosso, come da specifica). */
const CODICI_ORDINE_PILLS: CodiceColorePaziente[] = ['bianco', 'verde', 'giallo', 'rosso']

const COLORE_BADGE: Record<CodiceColorePaziente, string> = {
  rosso: 'bg-red-600 text-white ring-red-700/30',
  giallo: 'bg-amber-400 text-slate-900 ring-amber-600/25',
  verde: 'bg-emerald-600 text-white ring-emerald-700/30',
  bianco: 'bg-slate-200 text-slate-800 ring-slate-400/30',
}

const DOT_BG: Record<CodiceColorePaziente, string> = {
  rosso: 'bg-red-600',
  giallo: 'bg-amber-400',
  verde: 'bg-emerald-600',
  bianco: 'bg-slate-300',
}

function formatPermanenza(apertura: Timestamp | null, nowMs: number): string {
  if (!apertura?.toMillis) return '—'
  const m = Math.floor((nowMs - apertura.toMillis()) / 60_000)
  if (m < 0) return '—'
  if (m < 1) return '< 1 min'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

function sortByColoreCodice(list: PazienteListItem[]) {
  return [...list].sort((a, b) => {
    const ia = CODICI_ORDINE_TRIAGE.indexOf(a.codice_colore)
    const ib = CODICI_ORDINE_TRIAGE.indexOf(b.codice_colore)
    if (ia !== ib) return ia - ib
    return a.id_paziente_visibile.localeCompare(b.id_paziente_visibile, 'it')
  })
}

function countByColor(list: PazienteListItem[], col: CodiceColorePaziente) {
  return list.filter((p) => p.codice_colore === col).length
}

function ConteggioPallini({
  lista,
  policy,
  compact,
  dense,
  variant = 'default',
  align = 'end',
}: {
  lista: PazienteListItem[]
  policy: 'nonzero' | 'all'
  compact?: boolean
  /** Sidebar: pallini ancora più piccoli (solo se variant default). */
  dense?: boolean
  /** `dashboardMain`: contatori area PMA; `sidebarTab`: tab In arrivo / In attesa con numeri più leggibili. */
  variant?: 'default' | 'dashboardMain' | 'sidebarTab'
  align?: 'start' | 'center' | 'end'
}) {
  const size =
    variant === 'dashboardMain'
      ? 'h-9 min-w-[2.25rem] px-1.5 text-base font-extrabold leading-none tabular-nums'
      : variant === 'sidebarTab'
        ? 'h-7 min-w-[1.85rem] px-1 text-sm font-bold leading-none tabular-nums'
        : dense
          ? 'h-4 min-w-[1rem] px-0.5 text-[8px] leading-none'
          : compact
            ? 'h-5 min-w-[1.25rem] px-1 text-[9px] leading-none'
            : 'h-6 min-w-[1.35rem] px-1 text-[10px] leading-none'
  const justify =
    align === 'center'
      ? 'justify-center sm:justify-start'
      : align === 'start'
        ? 'justify-start'
        : 'justify-end'
  return (
    <div className={`flex flex-wrap items-center gap-1 ${justify}`}>
      {CODICI_ORDINE_PILLS.map((c) => {
        const n = countByColor(lista, c)
        if (policy === 'nonzero' && n === 0) return null
        return (
          <span
            key={c}
            title={CODICE_COLORE_LABEL[c]}
            className={`inline-flex items-center justify-center rounded-full font-bold tabular-nums ring-1 ring-black/10 ${size} ${COLORE_BADGE[c]}`}
          >
            {n}
          </span>
        )
      })}
    </div>
  )
}

function RigaPaziente({
  pz,
  pmaId,
  isTriage,
  onInCarico,
  canDelete,
  onDeleteClick,
  showStatoBadge = true,
  compact = false,
  dense = false,
}: {
  pz: PazienteListItem
  pmaId: string
  isTriage: boolean
  onInCarico: (id: string) => void
  canDelete: boolean
  onDeleteClick: (id: string, label: string) => void
  showStatoBadge?: boolean
  compact?: boolean
  dense?: boolean
}) {
  const rowPad = dense ? 'py-1 first:pt-0' : compact ? 'py-1.5 first:pt-0' : 'py-2.5 first:pt-0'
  const textSize = dense ? 'text-[11px]' : compact ? 'text-xs' : 'text-sm'
  const isDense = dense || compact
  return (
    <li
      className={
        isDense
          ? `flex flex-col gap-0.5 ${rowPad} sm:flex-row sm:items-center sm:justify-between`
          : 'flex flex-col gap-2 py-2.5 first:pt-0 sm:flex-row sm:items-center sm:justify-between'
      }
    >
      <Link
        to={`/pma/${encodeURIComponent(pmaId)}/paziente/${encodeURIComponent(pz.id)}`}
        className={
          isDense
            ? `min-w-0 flex-1 ${textSize} font-medium text-slate-900 hover:text-blue-800 hover:underline`
            : 'min-w-0 flex-1 text-sm font-medium text-slate-900 hover:text-blue-800 hover:underline'
        }
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`${dense ? 'h-1.5 w-1.5 ring-1' : 'h-2 w-2 ring-2'} shrink-0 rounded-full ring-white ${DOT_BG[pz.codice_colore]}`}
            aria-hidden
          />
          <span className="font-mono text-slate-700">{pz.id_paziente_visibile}</span>
        </span>
        <span className="mx-1.5 text-slate-300">·</span>
        <span>{[pz.cognome, pz.nome].filter(Boolean).join(' ') || '—'}</span>
      </Link>
      <div className="flex flex-wrap items-center gap-1">
        {showStatoBadge ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
            {PAZIENTE_STATO_LABEL[pz.stato]}
          </span>
        ) : null}
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${COLORE_BADGE[pz.codice_colore]}`}>
          {CODICE_COLORE_LABEL[pz.codice_colore]}
        </span>
        {isTriage && pz.stato === 'in_arrivo' ? (
          <button
            type="button"
            onClick={() => onInCarico(pz.id)}
            className="rounded bg-purple-700 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-purple-800"
          >
            In carico
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            onClick={() => onDeleteClick(pz.id, pz.id_paziente_visibile)}
            className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-800 hover:bg-red-100"
          >
            Elimina
          </button>
        ) : null}
      </div>
    </li>
  )
}

function ListaColonna({
  titolo,
  lista,
  pmaId,
  empty,
  isTriage,
  onInCarico,
  canDelete,
  onDeleteClick,
  showStatoBadge,
  highlight,
  compact,
  dotPolicy = 'nonzero',
  omitEmptyMessage = false,
  sidebarDense = false,
}: {
  titolo: string
  lista: PazienteListItem[]
  pmaId: string
  empty: string
  isTriage: boolean
  onInCarico: (id: string) => void
  canDelete: boolean
  onDeleteClick: (id: string, label: string) => void
  showStatoBadge?: boolean
  highlight?: boolean
  compact?: boolean
  dotPolicy?: 'nonzero' | 'all'
  /** Se true e lista vuota: niente testo sotto il titolo. */
  omitEmptyMessage?: boolean
  /** Elenco sidebar ancora più compatto. */
  sidebarDense?: boolean
}) {
  const h2Class = sidebarDense
    ? 'text-[9px] font-bold uppercase tracking-widest text-slate-500'
    : compact
      ? 'text-[10px] font-bold uppercase tracking-widest text-slate-500'
      : 'text-[11px] font-bold uppercase tracking-widest text-slate-500'

  return (
    <section
      className={`rounded-lg border bg-white shadow-sm ${
        compact ? (sidebarDense ? 'p-2' : 'p-2') : 'p-4 sm:p-4'
      } ${highlight ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'}`}
    >
      <div
        className={`flex min-w-0 flex-col gap-1 ${
          compact ? 'sm:flex-row sm:flex-wrap sm:items-center sm:justify-between' : ''
        }`}
      >
        <h2 className={`shrink-0 ${h2Class}`}>
          {titolo} ({lista.length})
        </h2>
        <ConteggioPallini
          lista={lista}
          policy={dotPolicy}
          compact={compact}
          dense={sidebarDense}
          variant={sidebarDense ? 'sidebarTab' : 'default'}
        />
      </div>
      {lista.length === 0 ? (
        omitEmptyMessage ? null : (
          <p className={compact ? 'mt-1.5 text-xs text-slate-500' : 'mt-3 text-sm text-slate-500'}>{empty}</p>
        )
      ) : (
        <ul
          className={`mt-1.5 divide-y divide-slate-100 ${
            compact ? (sidebarDense ? 'max-h-40 overflow-y-auto pr-0.5' : 'max-h-52 overflow-y-auto pr-0.5') : ''
          }`}
        >
          {lista.map((pz) => (
            <RigaPaziente
              key={pz.id}
              pz={pz}
              pmaId={pmaId}
              isTriage={isTriage}
              onInCarico={onInCarico}
              canDelete={canDelete}
              onDeleteClick={onDeleteClick}
              showStatoBadge={showStatoBadge}
              compact={compact}
              dense={sidebarDense}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function ListaPazientiInCarico({
  lista,
  pmaId,
  nowMs,
  canDelete,
  onDeleteClick,
  emptyMessage = 'Nessun paziente in carico.',
  evidenzaIds,
}: {
  lista: PazienteListItem[]
  pmaId: string
  nowMs: number
  canDelete: boolean
  onDeleteClick: (id: string, label: string) => void
  emptyMessage?: string
  /** Pazienti “in carico a me” (evidenza visiva in cima alla lista unificata). */
  evidenzaIds?: Set<string>
}) {
  if (lista.length === 0) {
    return <p className="mt-2 text-center text-xs text-slate-500">{emptyMessage}</p>
  }

  return (
    <div className="mt-2 max-h-[min(78vh,34rem)] overflow-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-2.5 py-1.5">
              Paziente
            </th>
            <th scope="col" className="hidden w-[1%] whitespace-nowrap px-2 py-1.5 sm:table-cell">
              Colore
            </th>
            <th scope="col" className="w-[1%] whitespace-nowrap px-2.5 py-1.5">
              Perm.
            </th>
            <th scope="col" className="w-[1%] px-2 py-1.5 text-right">
              <span className="sr-only">Azioni</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lista.map((pz) => {
            const nome = [pz.cognome, pz.nome].filter(Boolean).join(' ') || 'Senza nome'
            const err = pz.stato === 'errore'
            const inEvidenza = evidenzaIds?.has(pz.id) ?? false
            return (
              <tr
                key={pz.id}
                className={`align-middle transition-colors hover:bg-slate-50/90 ${
                  inEvidenza ? 'border-l-[3px] border-l-blue-600' : ''
                } ${err ? 'bg-red-50/60' : inEvidenza ? 'bg-blue-50/85' : ''}`}
              >
                <td className={`max-w-0 px-2.5 py-1.5 ${inEvidenza ? 'pl-2' : ''}`}>
                  <Link
                    to={`/pma/${encodeURIComponent(pmaId)}/paziente/${encodeURIComponent(pz.id)}?tab=generale`}
                    className="block min-w-0 text-base font-semibold leading-snug text-slate-900 hover:text-blue-800 hover:underline sm:text-lg"
                  >
                    {nome}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-sm text-slate-600">
                    <span className="font-medium">{pz.id_paziente_visibile}</span>
                    {pz.infermiere_rif.trim() || pz.medico_rif.trim() ? (
                      <span className="block w-full max-w-prose font-sans text-sm font-normal leading-snug text-slate-700">
                        {pz.infermiere_rif.trim() ? (
                          <span>
                            Inf.{' '}
                            <span className="font-semibold text-slate-900">{pz.infermiere_rif.trim()}</span>
                          </span>
                        ) : null}
                        {pz.infermiere_rif.trim() && pz.medico_rif.trim() ? (
                          <span className="mx-1.5 text-slate-300" aria-hidden>
                            ·
                          </span>
                        ) : null}
                        {pz.medico_rif.trim() ? (
                          <span>
                            Med.{' '}
                            <span className="font-semibold text-slate-900">{pz.medico_rif.trim()}</span>
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                    <span
                      className={`sm:hidden ${COLORE_BADGE[pz.codice_colore]} inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ring-1`}
                    >
                      <span className={`h-2 w-2 rounded-full ${DOT_BG[pz.codice_colore]}`} aria-hidden />
                      {CODICE_COLORE_LABEL[pz.codice_colore]}
                    </span>
                    {err ? (
                      <span className="rounded bg-red-200/80 px-1.5 py-0.5 text-xs font-semibold text-red-900">
                        {PAZIENTE_STATO_LABEL.errore}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="hidden whitespace-nowrap px-2 py-1.5 sm:table-cell">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${COLORE_BADGE[pz.codice_colore]}`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_BG[pz.codice_colore]}`} aria-hidden />
                    {CODICE_COLORE_LABEL[pz.codice_colore]}
                  </span>
                  {err ? (
                    <span className="ml-1 inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-800">
                      {PAZIENTE_STATO_LABEL.errore}
                    </span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-2.5 py-1.5 text-sm tabular-nums text-slate-800">
                  {formatPermanenza(pz.apertura_scheda, nowMs)}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right">
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => onDeleteClick(pz.id, pz.id_paziente_visibile)}
                      className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-100"
                    >
                      Elimina
                    </button>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function PMADashboardPage() {
  const { id } = useParams<{ id: string }>()
  const pmaId = id ? decodeURIComponent(id) : ''
  const navigate = useNavigate()
  const { user } = useAuth()
  const theme = useRankTheme()
  const pmaSnap = usePmaDocSnapshot(pmaId || undefined)
  const { data: manZipMeta } = useManifestazioneDoc(pmaSnap.idManifestazione || undefined)
  const { items: pazienti, loading: listaLoading, error: listaError } = usePazientiForPma(
    pmaId || undefined,
  )

  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [dimessiModalOpen, setDimessiModalOpen] = useState(false)
  const [dimessiModalSearch, setDimessiModalSearch] = useState('')
  const [dimessiModalBusyId, setDimessiModalBusyId] = useState<string | null>(null)
  const [dimessiModalErr, setDimessiModalErr] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ id: string; label: string; step: 1 | 2 } | null>(
    null,
  )
  const [deleteErr, setDeleteErr] = useState<string | null>(null)
  const [zipBusy, setZipBusy] = useState(false)
  const [zipErr, setZipErr] = useState<string | null>(null)

  const manifestazioneForCreate =
    user?.id_manifestazione?.trim() || pmaSnap.idManifestazione?.trim() || ''

  const attivi = useMemo(() => pazienti.filter((p) => p.stato !== 'dimesso'), [pazienti])
  const inArrivo = useMemo(() => sortByColoreCodice(attivi.filter((p) => p.stato === 'in_arrivo')), [attivi])
  const inAttesa = useMemo(() => sortByColoreCodice(attivi.filter((p) => p.stato === 'in_attesa')), [attivi])
  const inCarico = useMemo(
    () =>
      sortByColoreCodice(
        attivi.filter((p) => p.stato === 'in_carico' || p.stato === 'errore'),
      ),
    [attivi],
  )

  const staffRefCorrente = useMemo(() => staffSoftRefFromUser(user), [user?.uid, user?.nome, user?.email])

  const inCaricoAMie = useMemo(() => {
    if (user?.rank !== 'Infermiere' && user?.rank !== 'Medico') return []
    return sortByColoreCodice(
      inCarico.filter((p) => {
        if (user.rank === 'Infermiere') return p.infermiere_rif.trim() === staffRefCorrente
        return p.medico_rif.trim() === staffRefCorrente
      }),
    )
  }, [inCarico, user?.rank, staffRefCorrente])

  const idsCaricoAMe = useMemo(() => new Set(inCaricoAMie.map((p) => p.id)), [inCaricoAMie])

  /** Pazienti “a me” in cima, poi gli altri in carico ordinati per triage. */
  const inCaricoListaDisplay = useMemo(() => {
    const mineSet = new Set(inCaricoAMie.map((p) => p.id))
    const others = sortByColoreCodice(inCarico.filter((p) => !mineSet.has(p.id)))
    return [...inCaricoAMie, ...others]
  }, [inCarico, inCaricoAMie])
  const dimessi = useMemo(() => {
    const d = pazienti.filter((p) => p.stato === 'dimesso')
    return [...d].sort((a, b) => {
      const ta = a.dimesso_at?.toMillis?.() ?? 0
      const tb = b.dimesso_at?.toMillis?.() ?? 0
      return tb - ta
    })
  }, [pazienti])

  const manifestazioneIdDimessiQuery = dimessiModalOpen
    ? pmaSnap.idManifestazione?.trim() || undefined
    : undefined
  const {
    items: dimessiManifestRaw,
    loading: dimessiManifestLoading,
    error: dimessiManifestErr,
  } = useDimessiManifestazione(manifestazioneIdDimessiQuery)

  const dimessiModalListaCompleta = useMemo(() => {
    if (manifestazioneIdDimessiQuery) {
      return dimessiManifestRaw
        .filter((r) => r.id_pma === pmaId.trim())
        .map(
          (r): PazienteListItem => ({
            id: r.id,
            id_paziente_visibile: r.id_paziente_visibile,
            nome: r.nome,
            cognome: r.cognome,
            stato: 'dimesso',
            codice_colore: r.codice_colore,
            apertura_scheda: null,
            dimesso_at: r.dimesso_at,
            id_pma: r.id_pma,
            infermiere_rif: '',
            medico_rif: '',
          }),
        )
    }
    return dimessi
  }, [manifestazioneIdDimessiQuery, dimessiManifestRaw, pmaId, dimessi])

  const dimessiModalFiltrati = useMemo(() => {
    const q = dimessiModalSearch.trim().toLowerCase()
    let rows = dimessiModalListaCompleta
    if (q) {
      rows = rows.filter((p) => {
        const blob = `${p.id_paziente_visibile} ${p.nome} ${p.cognome}`.toLowerCase()
        return blob.includes(q)
      })
    }
    return [...rows].sort((a, b) => {
      const ta = a.dimesso_at?.toMillis?.() ?? 0
      const tb = b.dimesso_at?.toMillis?.() ?? 0
      return tb - ta
    })
  }, [dimessiModalListaCompleta, dimessiModalSearch])

  const ultimi5Dimessi = useMemo(() => dimessi.slice(0, 5), [dimessi])

  const isTriage = user?.rank === 'Triage'
  const canDeletePaziente =
    Boolean(user && (user.rank === 'Centrale' || user.rank === 'Medico')) && Boolean(db)

  const canCreatePaziente =
    Boolean(db && manifestazioneForCreate && pmaId.trim() !== '') &&
    (user?.rank === 'Superadmin' ||
      user?.rank === 'Centrale' ||
      user?.rank === 'Medico' ||
      user?.rank === 'Infermiere' ||
      user?.rank === 'Triage' ||
      user?.rank === 'Soccorritore')

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  async function handleNuovoPazienteImmediato() {
    if (!db || !manifestazioneForCreate || !pmaId.trim() || !user) return
    setCreateErr(null)
    setCreating(true)
    try {
      const nuovoId = await createPazienteWithProgressivo(db, {
        manifestazioneId: manifestazioneForCreate,
        idPma: pmaId,
        creatorRank: user.rank,
        creatorUid: user.uid,
      })
      navigate(
        `/pma/${encodeURIComponent(pmaId)}/paziente/${encodeURIComponent(nuovoId)}?tab=generale`,
      )
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : 'Creazione non riuscita.')
    } finally {
      setCreating(false)
    }
  }

  async function handleInCarico(pazienteId: string) {
    if (!db) return
    try {
      await updateSchedaPazienteGranular(db, pazienteId, { stato: 'in_carico' })
    } catch {
      /* opzionale toast */
    }
  }

  async function eseguiElimina() {
    if (!db || !deleteModal) return
    setDeleteErr(null)
    try {
      await deleteDoc(doc(db, 'pazienti', deleteModal.id))
      setDeleteModal(null)
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : 'Eliminazione non riuscita.')
    }
  }

  async function handleZipDimessi() {
    if (!db || user?.rank !== 'Centrale' || !pmaId.trim()) return
    if (dimessi.length === 0) return
    setZipErr(null)
    setZipBusy(true)
    try {
      const zip = new JSZip()
      const manNome = manZipMeta?.nome ?? ''
      const pmaNome = pmaSnap.nome ?? pmaId
      const ctx = { manifestazioneNome: manNome, pmaNome }
      for (const row of dimessi) {
        const snap = await getDoc(doc(db, 'pazienti', row.id))
        if (!snap.exists()) continue
        const full = parsePazienteFromFirestore(snap.id, snap.data() as Record<string, unknown>)
        const blob = await buildPazientePdfBlob(full, ctx)
        zip.file(defaultPdfFilename(full), blob)
      }
      const out = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const day = new Date().toISOString().slice(0, 10)
      saveAs(out, `Report_PMA_${sanitizeFilePart(pmaNome)}_${day}.zip`)
    } catch (e) {
      setZipErr(e instanceof Error ? e.message : 'Creazione archivio non riuscita.')
    } finally {
      setZipBusy(false)
    }
  }

  async function downloadDimessoPdf(patientId: string) {
    if (!db) return
    setDimessiModalErr(null)
    setDimessiModalBusyId(patientId)
    try {
      const snap = await getDoc(doc(db, 'pazienti', patientId))
      if (!snap.exists()) throw new Error('Paziente non trovato.')
      const full = parsePazienteFromFirestore(snap.id, snap.data() as Record<string, unknown>)
      const blob = await buildPazientePdfBlob(full, {
        manifestazioneNome: manZipMeta?.nome ?? '',
        pmaNome: pmaSnap.nome ?? pmaId,
      })
      saveAs(blob, defaultPdfFilename(full))
    } catch (e) {
      setDimessiModalErr(e instanceof Error ? e.message : 'Download PDF non riuscito.')
    } finally {
      setDimessiModalBusyId(null)
    }
  }

  async function mailDimessoPdf(patientId: string) {
    if (!db) return
    setDimessiModalErr(null)
    setDimessiModalBusyId(patientId)
    try {
      const snap = await getDoc(doc(db, 'pazienti', patientId))
      if (!snap.exists()) throw new Error('Paziente non trovato.')
      const full = parsePazienteFromFirestore(snap.id, snap.data() as Record<string, unknown>)
      let to = full.email?.trim() ?? ''
      if (!to) {
        const entered = window.prompt(
          'Email del destinatario non presente sulla scheda. Inserisci l’indirizzo per aprire il messaggio.',
        )
        if (!entered?.trim()) return
        to = entered.trim()
      }
      const blob = await buildPazientePdfBlob(full, {
        manifestazioneNome: manZipMeta?.nome ?? '',
        pmaNome: pmaSnap.nome ?? pmaId,
      })
      const fname = defaultPdfFilename(full)
      saveAs(blob, fname)
      window.location.assign(
        buildMailtoReportPaziente({
          toEmail: to,
          pazienteIdVisibile: full.id_paziente_visibile,
          pdfFilename: fname,
        }),
      )
    } catch (e) {
      setDimessiModalErr(e instanceof Error ? e.message : 'Invio non riuscito.')
    } finally {
      setDimessiModalBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-2 pb-5">
      <header className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="min-w-0 flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-slate-500">PMA</span>
            <h1 className="min-w-0 truncate text-lg font-semibold leading-tight tracking-tight text-slate-900 sm:text-xl">
              {pmaSnap.nome ?? (pmaId || '—')}
            </h1>
            <code className="hidden max-w-[10rem] truncate text-xs text-slate-500 sm:inline">{pmaId || '—'}</code>
          </div>
          <div className="flex min-w-0 flex-1 basis-[min(100%,28rem)] flex-col items-stretch justify-end gap-2 sm:max-w-2xl sm:flex-row sm:items-center">
            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-1 sm:flex-row sm:gap-2">
              <button
                type="button"
                disabled={!canCreatePaziente || !manifestazioneForCreate || creating || !pmaId.trim()}
                title={
                  !canCreatePaziente
                    ? 'Permessi insufficienti per creare una nuova scheda.'
                    : !manifestazioneForCreate
                      ? 'Manifestazione non disponibile.'
                      : undefined
                }
                onClick={() => void handleNuovoPazienteImmediato()}
                className={`min-h-[2.75rem] w-full rounded-md border px-2 text-sm font-bold uppercase tracking-wide transition disabled:opacity-50 sm:min-w-[9.5rem] sm:flex-1 ${
                  canCreatePaziente && manifestazioneForCreate
                    ? 'border-blue-400 bg-white text-blue-900 hover:bg-blue-50'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                {creating ? '…' : 'Nuovo paziente'}
              </button>
              <button
                type="button"
                disabled={!pmaId.trim()}
                onClick={() => {
                  setDimessiModalOpen(true)
                  setDimessiModalSearch('')
                  setDimessiModalErr(null)
                }}
                className="min-h-[2.75rem] w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-bold uppercase tracking-wide text-slate-800 hover:bg-slate-50 disabled:opacity-50 sm:min-w-[9.5rem] sm:flex-1"
              >
                Pazienti dimessi
              </button>
              <Link
                to={`/pma/${encodeURIComponent(pmaId)}/impostazioni`}
                aria-disabled={!pmaId.trim()}
                onClick={(e) => {
                  if (!pmaId.trim()) e.preventDefault()
                }}
                className={`flex min-h-[2.75rem] w-full items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-center text-sm font-bold uppercase tracking-wide text-slate-800 hover:bg-slate-50 sm:min-w-[9.5rem] sm:flex-1 ${!pmaId.trim() ? 'pointer-events-none opacity-50' : ''}`}
              >
                Impostazioni PMA
              </Link>
            </div>
            {user?.rank === 'Centrale' && dimessi.length > 0 ? (
              <button
                type="button"
                disabled={zipBusy || !db}
                onClick={() => void handleZipDimessi()}
                className={`inline-flex min-h-[2.5rem] shrink-0 items-center gap-1.5 self-center rounded-md border border-violet-200 bg-violet-50/90 px-3 text-xs font-bold uppercase tracking-wide text-violet-900 hover:bg-violet-100 disabled:opacity-50`}
              >
                {zipBusy ? (
                  <>
                    <span
                      className={`h-3 w-3 shrink-0 animate-spin rounded-full border-2 ${theme.spinnerAccent}`}
                      aria-hidden
                    />
                    ZIP…
                  </>
                ) : (
                  `ZIP (${dimessi.length})`
                )}
              </button>
            ) : null}
          </div>
        </div>
        {canCreatePaziente && !manifestazioneForCreate ? (
          <p className="mt-1.5 text-[10px] text-amber-800">Manifestazione non disponibile: creazione disabilitata.</p>
        ) : null}
        {createErr ? (
          <p className="mt-1 text-[11px] text-red-700" role="alert">
            {createErr}
          </p>
        ) : null}
        {zipErr ? (
          <p className="mt-1 text-[11px] text-red-700" role="alert">
            {zipErr}
          </p>
        ) : null}
      </header>

      {!pmaId.trim() ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          URL PMA non valido.
        </p>
      ) : null}

      {listaError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {listaError}
        </div>
      ) : null}

      {listaLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span
            className={`h-5 w-5 animate-spin rounded-full border-2 ${theme.spinnerAccent}`}
            aria-hidden
          />
          Caricamento pazienti…
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
            <main className="min-w-0 flex-1 lg:max-w-[calc(100%-13rem)] lg:flex-[1.25]">
              <section className="rounded-lg border border-blue-200 bg-gradient-to-b from-white to-slate-50/90 p-3 shadow-sm">
                <ConteggioPallini lista={inCarico} policy="all" align="center" variant="dashboardMain" />
                <h2 className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-blue-900">
                  Pazienti in carico ({inCarico.length})
                </h2>
                <ListaPazientiInCarico
                  lista={inCaricoListaDisplay}
                  pmaId={pmaId}
                  nowMs={nowMs}
                  canDelete={canDeletePaziente}
                  onDeleteClick={(pid, label) => setDeleteModal({ id: pid, label, step: 1 })}
                  evidenzaIds={idsCaricoAMe}
                />
              </section>
            </main>

            <aside className="w-full shrink-0 space-y-2 lg:max-w-[13rem] lg:flex-[0_0_13rem]">
              <ListaColonna
                titolo="In arrivo"
                lista={inArrivo}
                pmaId={pmaId}
                empty="Nessuno."
                isTriage={isTriage}
                onInCarico={handleInCarico}
                canDelete={canDeletePaziente}
                onDeleteClick={(pid, label) => setDeleteModal({ id: pid, label, step: 1 })}
                compact
                omitEmptyMessage
                sidebarDense
              />
              <ListaColonna
                titolo="In attesa"
                lista={inAttesa}
                pmaId={pmaId}
                empty="Nessuno."
                isTriage={isTriage}
                onInCarico={handleInCarico}
                canDelete={canDeletePaziente}
                onDeleteClick={(pid, label) => setDeleteModal({ id: pid, label, step: 1 })}
                compact
                omitEmptyMessage
                sidebarDense
              />

              <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-2 shadow-sm">
                <h2 className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                  Ultimi 5 dimessi ({ultimi5Dimessi.length})
                </h2>
                {ultimi5Dimessi.length > 0 ? (
                  <ul className="mt-1.5 max-h-40 divide-y divide-slate-200 overflow-y-auto rounded border border-slate-200 bg-white">
                    {ultimi5Dimessi.map((pz) => (
                      <RigaPaziente
                        key={pz.id}
                        pz={pz}
                        pmaId={pmaId}
                        isTriage={false}
                        onInCarico={() => {}}
                        canDelete={canDeletePaziente}
                        onDeleteClick={(pid, label) => setDeleteModal({ id: pid, label, step: 1 })}
                        showStatoBadge={false}
                        compact
                        dense
                      />
                    ))}
                  </ul>
                ) : null}
              </div>
            </aside>
          </div>
        </>
      )}

      {dimessiModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-10 sm:pt-14"
          role="dialog"
          aria-modal
          aria-labelledby="dimessi-modal-title"
          onClick={() => setDimessiModalOpen(false)}
        >
          <div
            className="my-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2 id="dimessi-modal-title" className="text-lg font-semibold text-slate-900">
                  Pazienti dimessi
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {manifestazioneIdDimessiQuery
                    ? 'Elenco da manifestazione (query indicizzata), filtrato su questo PMA.'
                    : 'Elenco dal PMA corrente (nessun id manifestazione sul PMA).'}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setDimessiModalOpen(false)}
              >
                Chiudi
              </button>
            </div>
            <div className="space-y-3 px-4 py-3 sm:px-5 sm:py-4">
              <label className="block text-xs font-medium text-slate-700">
                Cerca per nome, cognome o ID
                <input
                  type="search"
                  value={dimessiModalSearch}
                  onChange={(e) => setDimessiModalSearch(e.target.value)}
                  placeholder="Es. Rossi, ID visibile…"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              {dimessiModalErr ? (
                <p className="text-sm text-red-700" role="alert">
                  {dimessiModalErr}
                </p>
              ) : null}
              {dimessiManifestErr ? (
                <p className="text-sm text-amber-800" role="alert">
                  {dimessiManifestErr}
                </p>
              ) : null}
              {manifestazioneIdDimessiQuery && dimessiManifestLoading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-slate-600">
                  <span
                    className={`h-5 w-5 animate-spin rounded-full border-2 ${theme.spinnerAccent}`}
                    aria-hidden
                  />
                  Caricamento elenco dimessi…
                </div>
              ) : dimessiModalFiltrati.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Nessun risultato.</p>
              ) : (
                <ul className="max-h-[min(60vh,28rem)] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                  {dimessiModalFiltrati.map((pz) => {
                    const busy = dimessiModalBusyId === pz.id
                    const nome = [pz.cognome, pz.nome].filter(Boolean).join(' ') || '—'
                    return (
                      <li
                        key={pz.id}
                        className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                      >
                        <Link
                          to={`/pma/${encodeURIComponent(pmaId)}/paziente/${encodeURIComponent(pz.id)}?tab=generale`}
                          className="min-w-0 flex-1 rounded-md py-0.5 text-left hover:bg-slate-50 sm:pr-2"
                          onClick={() => setDimessiModalOpen(false)}
                        >
                          <span className="block font-semibold text-slate-900">{nome}</span>
                          <span className="mt-0.5 block font-mono text-xs text-slate-500">
                            {pz.id_paziente_visibile}
                          </span>
                        </Link>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy || !db}
                            onClick={() => void downloadDimessoPdf(pz.id)}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {busy ? '…' : 'Scarica PDF'}
                          </button>
                          <button
                            type="button"
                            disabled={busy || !db}
                            onClick={() => void mailDimessoPdf(pz.id)}
                            className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-100 disabled:opacity-50"
                          >
                            {busy ? '…' : 'Invia via mail'}
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {deleteModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="del-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="del-title" className="text-lg font-semibold text-slate-900">
              {deleteModal.step === 1 ? 'Eliminare la scheda?' : 'Conferma definitiva'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {deleteModal.step === 1
                ? `Scheda ${deleteModal.label}: l’operazione è irreversibile.`
                : 'Ultima conferma: il documento paziente verrà rimosso da Firestore.'}
            </p>
            {deleteErr ? (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {deleteErr}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => {
                  setDeleteModal(null)
                  setDeleteErr(null)
                }}
              >
                Annulla
              </button>
              {deleteModal.step === 1 ? (
                <button
                  type="button"
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                  onClick={() => setDeleteModal({ ...deleteModal, step: 2 })}
                >
                  Continua
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                  onClick={() => void eseguiElimina()}
                >
                  Elimina definitivamente
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
