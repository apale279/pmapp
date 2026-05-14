import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { deleteDoc, doc, getDoc, collection, query, where, limit, onSnapshot, deleteField, serverTimestamp, type Timestamp } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { useSyncLive } from '../../context/SyncLiveContext'
import { useRankTheme } from '../../hooks/useRankTheme'
import { db } from '../../lib/firebase'
import { staffSoftRefFromUser } from '../../lib/staffSoftRef'
import { createPazienteWithProgressivo } from '../../lib/createPazienteWithProgressivo'
import { updateSchedaPazienteGranular } from '../../lib/updateSchedaPaziente'
import { usePazientiForPma } from '../../hooks/usePazientiForPma'
import { usePmaDocSnapshot } from '../../hooks/usePmaDocNome'
import { useManifestazioneDoc } from '../../hooks/useManifestazioneDoc'
import { useManifestazioneListeCliniche } from '../../hooks/useManifestazioneListeCliniche'
import { useDimessiManifestazione } from '../../hooks/useDimessiManifestazione'
import { parsePazienteFromFirestore } from '../../hooks/usePazienteDoc'
import { buildMailtoReportPaziente, defaultPdfFilename } from '../../lib/pdf/pazientePdfHelpers'
import { CodiciMinoriModal } from '../../components/pma/CodiciMinoriModal'
import { PmaManagerShell } from '../../components/pma/PmaManagerShell'
import { opToolbarBtnSm } from '../../components/layout/operativeTokens'
import { useInfermiereSmartphone } from '../../hooks/useInfermiereSmartphone'
import type { CodiceColorePaziente } from '../../types/paziente'
import { CODICE_COLORE_LABEL, PAZIENTE_STATO_LABEL } from '../../types/paziente'
import type { PazienteListItem } from '../../hooks/usePazientiForPma'

/** Ordine triage per elenchi (rosso in cima). */
const CODICI_ORDINE_TRIAGE: CodiceColorePaziente[] = ['rosso', 'giallo', 'verde', 'bianco']

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

/** In carico: prima i pazienti «a me» (infermiere_rif / medico_rif = staff), poi gli altri; in ogni gruppo ordine triage. */
function partitionInCaricoMineThenOthers(
  list: PazienteListItem[],
  rank: string | undefined,
  staffRef: string,
): { ordered: PazienteListItem[]; mineCount: number } {
  const ref = staffRef.trim()
  if (!ref || list.length === 0) return { ordered: sortByColoreCodice(list), mineCount: 0 }
  const mine: PazienteListItem[] = []
  const other: PazienteListItem[] = []
  for (const p of list) {
    const inf = p.infermiere_rif.trim() === ref
    const med = p.medico_rif.trim() === ref
    let isMine = false
    if (rank === 'Infermiere') isMine = inf
    else if (rank === 'Medico') isMine = med
    else isMine = inf || med
    ;(isMine ? mine : other).push(p)
  }
  if (mine.length === 0) return { ordered: sortByColoreCodice(list), mineCount: 0 }
  return {
    ordered: [...sortByColoreCodice(mine), ...sortByColoreCodice(other)],
    mineCount: mine.length,
  }
}

/** Medico/Infermiere: pazienti con lo stesso riferimento soft in cima (poi triage sugli altri). */
function partitionRefFirstMedicoInfermiere(
  list: PazienteListItem[],
  rank: string | undefined,
  staffRef: string,
): PazienteListItem[] {
  if (!staffRef || (rank !== 'Medico' && rank !== 'Infermiere')) return sortByColoreCodice(list)
  const mine: PazienteListItem[] = []
  const other: PazienteListItem[] = []
  for (const p of list) {
    const isMine =
      rank === 'Infermiere' ? p.infermiere_rif.trim() === staffRef : p.medico_rif.trim() === staffRef
    ;(isMine ? mine : other).push(p)
  }
  return [...sortByColoreCodice(mine), ...sortByColoreCodice(other)]
}

function countByColor(list: PazienteListItem[], col: CodiceColorePaziente) {
  return list.filter((p) => p.codice_colore === col).length
}

/** Colonna destra mock: box bianco, titolo su due righe (es. Pazienti / IN ARRIVO). */
function ManagerQueueBox({
  titleLine1,
  titleLine2,
  lista,
  pmaId,
  takeChargeFromQueues,
  onInCarico,
}: {
  titleLine1: string
  titleLine2: string
  lista: PazienteListItem[]
  pmaId: string
  /** Prendi in carico da coda IN ARRIVO, IN ATTESA o IN SOSPESO (staff clinico). */
  takeChargeFromQueues: boolean
  onInCarico: (id: string) => void
}) {
  const preview = lista.slice(0, 2)
  return (
    <section className="pma-card">
      <div className="border-b border-slate-100 pb-2 text-center">
        <div className="text-lg font-bold text-slate-900">{titleLine1}</div>
        <div className="pma-card__hdr mb-0 mt-1 text-center">{titleLine2}</div>
      </div>
      {preview.length === 0 ? (
        <p className="mt-2 text-center text-sm text-slate-400">—</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {preview.map((pz) => {
            const nome = [pz.cognome, pz.nome].filter(Boolean).join(' ') || '—'
            const schedaTo = `/pma/${encodeURIComponent(pmaId)}/paziente/${encodeURIComponent(pz.id)}?tab=generale`
            return (
              <li key={pz.id} className="relative rounded-md border border-slate-100 bg-slate-50/40">
                <Link
                  to={schedaTo}
                  className="absolute inset-0 z-0 rounded-md"
                  aria-label={`Apri scheda ${nome}`}
                />
                <div className="pointer-events-none relative z-[1] p-2">
                  <div className="flex min-w-0 items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900">
                      <span className="line-clamp-2">{nome}</span>
                    </div>
                    {takeChargeFromQueues &&
                    (pz.stato === 'in_arrivo' || pz.stato === 'in_attesa' || pz.stato === 'in_sospeso') ? (
                      <button
                        type="button"
                        title="Prendi in carico"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onInCarico(pz.id)
                        }}
                        className="pointer-events-auto relative z-[2] shrink-0 rounded border border-slate-300 bg-white px-1 py-0.5 text-[10px] font-bold uppercase leading-none text-slate-800 hover:bg-slate-50"
                      >
                        Prendi
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-0.5 font-mono text-xs font-medium text-slate-600">
                    {pz.id_paziente_visibile}
                  </div>
                </div>
              </li>
            )
          })}
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
  visualVariant = 'default',
  compactInfermiereMobile = false,
  inCaricoMineCount = 0,
}: {
  lista: PazienteListItem[]
  pmaId: string
  nowMs: number
  canDelete: boolean
  onDeleteClick: (id: string, label: string) => void
  emptyMessage?: string
  evidenzaIds?: Set<string>
  /** Layout allineato al mock PMA Manager (desktop). */
  visualVariant?: 'default' | 'manager'
  /** Infermiere + smartphone: elenco compatto (triage, nome, ID). */
  compactInfermiereMobile?: boolean
  /** Indice esclusivo: dopo questi pazienti viene mostrato un separatore (stesso PMA, «a me» prima). */
  inCaricoMineCount?: number
}) {
  const navigate = useNavigate()
  const manager = visualVariant === 'manager'
  const dotTri: Record<CodiceColorePaziente, string> = manager
    ? {
        rosso: 'bg-[#ef4444]',
        giallo: 'bg-[#eab308]',
        verde: 'bg-[#22c55e]',
        bianco: 'bg-slate-300 ring-1 ring-slate-400',
      }
    : DOT_BG

  if (lista.length === 0) {
    return (
      <p className={`py-6 text-center text-sm font-medium text-slate-500`}>{emptyMessage}</p>
    )
  }

  if (compactInfermiereMobile) {
    return (
      <ul className="mt-1 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {lista.flatMap((pz, idx) => {
          const nome = [pz.cognome, pz.nome].filter(Boolean).join(' ') || 'Senza nome'
          const schedaTo = `/pma/${encodeURIComponent(pmaId)}/paziente/${encodeURIComponent(pz.id)}?tab=generale`
          const row = (
            <li key={pz.id}>
              <button
                type="button"
                className="flex w-full min-w-0 items-center gap-2 px-2 py-2.5 text-left transition hover:bg-slate-50 active:bg-slate-100"
                onClick={() => navigate(schedaTo)}
              >
                <span className="flex shrink-0 flex-col items-center gap-0.5" title={CODICE_COLORE_LABEL[pz.codice_colore]}>
                  <span className={`h-3 w-3 shrink-0 rounded-full ${DOT_BG[pz.codice_colore]}`} aria-hidden />
                  <span className="max-w-[2.5rem] truncate text-[9px] font-bold uppercase leading-none text-slate-600">
                    {CODICE_COLORE_LABEL[pz.codice_colore].slice(0, 3)}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold leading-tight text-slate-900">{nome}</div>
                  <div className="truncate font-mono text-xs text-slate-600">{pz.id_paziente_visibile}</div>
                </div>
              </button>
            </li>
          )
          const sep =
            inCaricoMineCount > 0 && idx === inCaricoMineCount ? (
              <li
                key={`sep-${idx}`}
                className="list-none border-t-2 border-slate-300 bg-slate-100 px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600"
                aria-hidden
              >
                Altri pazienti
              </li>
            ) : null
          return [...(sep ? [sep] : []), row]
        })}
      </ul>
    )
  }

  return (
    <div
      className={
        manager
          ? 'mt-2 overflow-auto border border-slate-200 bg-white'
          : 'mt-1.5 max-h-[min(82vh,44rem)] overflow-auto rounded border border-slate-200 bg-white'
      }
    >
      <table className="w-full border-collapse text-left text-sm font-medium leading-snug">
        <thead
          className={
            manager
              ? 'border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500'
              : 'sticky top-0 z-[1] border-b border-slate-200 bg-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500'
          }
        >
          <tr>
            <th scope="col" className="w-10 whitespace-nowrap px-2 py-2.5">
              {manager ? 'TR' : 'Tr'}
            </th>
            <th scope="col" className="min-w-0 px-2 py-2.5">
              {manager ? 'PAZIENTE' : 'Paziente'}
            </th>
            <th scope="col" className={`w-11 whitespace-nowrap px-2 py-2.5 ${manager ? 'table-cell' : 'hidden lg:table-cell'}`}>
              {manager ? 'ETÀ' : 'Età'}
            </th>
            <th scope="col" className={`min-w-0 max-w-[11rem] px-2 py-2.5 ${manager ? 'table-cell' : 'hidden xl:table-cell'}`}>
              {manager ? 'MOTIVO' : 'Motivo'}
            </th>
            <th scope="col" className={`min-w-0 max-w-[8rem] px-2 py-2.5 ${manager ? 'table-cell' : 'hidden md:table-cell'}`}>
              {manager ? 'RIF.' : 'Rif.'}
            </th>
            <th scope="col" className="w-[4.75rem] whitespace-nowrap px-2 py-2.5">
              {manager ? 'PERM.' : 'Perm.'}
            </th>
            <th scope="col" className={`w-[5.5rem] whitespace-nowrap px-2 py-2.5 ${manager ? 'table-cell' : 'hidden sm:table-cell'}`}>
              {manager ? 'STATO' : 'Stato'}
            </th>
            <th scope="col" className="w-10 px-2 py-2.5 text-right">
              <span className="sr-only">Azioni</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-900">
          {lista.flatMap((pz, idx) => {
            const nome = [pz.cognome, pz.nome].filter(Boolean).join(' ') || 'Senza nome'
            const inSosp = pz.stato === 'in_sospeso'
            const inEvidenza = !manager && (evidenzaIds?.has(pz.id) ?? false)
            const etaDisp = pz.eta !== null && pz.eta !== undefined ? `${pz.eta}a` : '—'
            const rawMotivo = pz.breve_descrizione?.trim() ?? ''
            const motivo =
              rawMotivo === ''
                ? '—'
                : rawMotivo.length > (manager ? 80 : 56)
                  ? `${rawMotivo.slice(0, manager ? 80 : 56)}…`
                  : rawMotivo
            const refParts: string[] = []
            if (pz.infermiere_rif.trim()) refParts.push(`I:${pz.infermiere_rif.trim()}`)
            if (pz.medico_rif.trim()) refParts.push(`M:${pz.medico_rif.trim()}`)
            const ref = refParts.join(' · ') || '—'
            const schedaTo = `/pma/${encodeURIComponent(pmaId)}/paziente/${encodeURIComponent(pz.id)}?tab=generale`
            const sep =
              inCaricoMineCount > 0 && idx === inCaricoMineCount ? (
                <tr key={`sep-${idx}`} className="bg-slate-100" aria-hidden>
                  <td
                    colSpan={8}
                    className="border-t-2 border-slate-300 px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600"
                  >
                    Altri pazienti
                  </td>
                </tr>
              ) : null
            const row = (
              <tr
                key={pz.id}
                role="link"
                tabIndex={0}
                title={`Apri scheda ${nome}`}
                onClick={() => navigate(schedaTo)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(schedaTo)
                  }
                }}
                className={`cursor-pointer align-middle transition-colors ${
                  manager
                    ? 'hover:bg-[#f1f5f9]'
                    : `hover:bg-slate-50/80 ${inEvidenza ? 'border-l-[3px] border-l-slate-900 bg-slate-100/60' : ''} ${inSosp ? 'bg-amber-50/80' : ''}`
                } ${manager && inSosp ? 'bg-amber-50/60' : ''}`}
              >
                <td className="whitespace-nowrap px-2 py-2.5">
                  <span className="inline-flex items-center gap-1" title={CODICE_COLORE_LABEL[pz.codice_colore]}>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotTri[pz.codice_colore]}`} aria-hidden />
                    <span className="sr-only">{CODICE_COLORE_LABEL[pz.codice_colore]}</span>
                  </span>
                </td>
                <td className="max-w-0 min-w-0 px-2 py-2.5">
                  <span className={`block truncate font-semibold ${manager ? 'text-slate-900' : 'text-slate-900'}`}>
                    {nome}
                  </span>
                  <div className={`mt-0.5 truncate font-mono text-sm font-medium text-slate-600`}>
                    {pz.id_paziente_visibile}
                  </div>
                </td>
                <td className={`whitespace-nowrap px-2 py-2.5 tabular-nums text-slate-700 ${manager ? 'table-cell' : 'hidden lg:table-cell'}`}>
                  {etaDisp}
                </td>
                <td
                  className={`max-w-[11rem] truncate px-2 py-2.5 text-slate-600 ${manager ? 'table-cell' : 'hidden xl:table-cell'}`}
                  title={motivo}
                >
                  {motivo}
                </td>
                <td
                  className={`max-w-[8rem] truncate px-2 py-2.5 font-mono text-sm font-medium text-slate-600 ${manager ? 'table-cell' : 'hidden md:table-cell'}`}
                  title={ref}
                >
                  {ref}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 tabular-nums text-slate-700">
                  {formatPermanenza(pz.apertura_scheda, nowMs)}
                </td>
                <td className={`whitespace-nowrap px-2 py-2.5 ${manager ? 'table-cell' : 'hidden sm:table-cell'}`}>
                  <span
                    className={`inline-flex rounded border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                      inSosp
                        ? 'border-amber-300 bg-amber-50 text-amber-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {PAZIENTE_STATO_LABEL[pz.stato]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right">
                  {canDelete ? (
                    manager ? (
                      <button
                        type="button"
                        title="Elimina"
                        aria-label="Elimina"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteClick(pz.id, pz.id_paziente_visibile)
                        }}
                        className="pma-theme-skip inline-flex h-10 w-10 items-center justify-center rounded border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-red-600"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M9 3h6M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteClick(pz.id, pz.id_paziente_visibile)
                        }}
                        className="inline-flex h-10 items-center justify-center rounded border border-slate-300 bg-white px-4 text-sm font-bold uppercase text-slate-700 hover:bg-slate-100"
                      >
                        Del
                      </button>
                    )
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            )
            return [...(sep ? [sep] : []), row]
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
  const location = useLocation()
  const { user, logout } = useAuth()
  const theme = useRankTheme()
  const infermiereSm = useInfermiereSmartphone(user)
  const pmaSnap = usePmaDocSnapshot(pmaId || undefined)
  const { data: manZipMeta } = useManifestazioneDoc(pmaSnap.idManifestazione || undefined)
  const manListeCliniche = useManifestazioneListeCliniche(pmaSnap.idManifestazione || undefined)
  const { items: pazienti, loading: listaLoading, error: listaError } = usePazientiForPma(
    pmaId || undefined,
  )

  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [dimessiModalOpen, setDimessiModalOpen] = useState(false)
  const [dimessiModalSearch, setDimessiModalSearch] = useState('')
  const [dimessiModalBusyId, setDimessiModalBusyId] = useState<string | null>(null)
  const [dimessiRiprendiBusyId, setDimessiRiprendiBusyId] = useState<string | null>(null)
  const [dimessiModalErr, setDimessiModalErr] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ id: string; label: string; step: 1 | 2 } | null>(
    null,
  )
  const [deleteErr, setDeleteErr] = useState<string | null>(null)
  const [codiciMinoriOpen, setCodiciMinoriOpen] = useState(false)
  const [pmaAlertToast, setPmaAlertToast] = useState<{ id: string; msg: string } | null>(null)

  const { bumpSync } = useSyncLive()
  useEffect(() => {
    if (!listaLoading) bumpSync()
  }, [listaLoading, bumpSync])

  useEffect(() => {
    if (!pmaId.trim()) return
    const sp = new URLSearchParams(location.search)
    if (sp.get('dimessi') !== '1') return
    sp.delete('dimessi')
    const qs = sp.toString()
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : '' }, { replace: true })
    setDimessiModalOpen(true)
    setDimessiModalSearch('')
    setDimessiModalErr(null)
  }, [pmaId, location.pathname, location.search, navigate])

  const manifestazioneForCreate =
    user?.id_manifestazione?.trim() || pmaSnap.idManifestazione?.trim() || ''

  const staffRefCorrente = useMemo(() => staffSoftRefFromUser(user), [user])

  const attivi = useMemo(() => pazienti.filter((p) => p.stato !== 'dimesso'), [pazienti])
  const inArrivo = useMemo(() => {
    const raw = attivi.filter((p) => p.stato === 'in_arrivo')
    return partitionRefFirstMedicoInfermiere(raw, user?.rank, staffRefCorrente)
  }, [attivi, user?.rank, staffRefCorrente])
  const inAttesa = useMemo(() => {
    const raw = attivi.filter((p) => p.stato === 'in_attesa' || p.stato === 'in_sospeso')
    return partitionRefFirstMedicoInfermiere(raw, user?.rank, staffRefCorrente)
  }, [attivi, user?.rank, staffRefCorrente])
  const inCaricoData = useMemo(() => {
    const raw = attivi.filter((p) => p.stato === 'in_carico')
    return partitionInCaricoMineThenOthers(raw, user?.rank, staffRefCorrente)
  }, [attivi, user?.rank, staffRefCorrente])

  const inCaricoListaDisplay = inCaricoData.ordered
  const inCaricoMineCount = inCaricoData.mineCount
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
            eta: null,
            breve_descrizione: '',
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

  const isPmaDashboardReadOnly = user?.rank === 'Centrale'

  const canDeletePaziente = Boolean(user && user.rank === 'Medico') && Boolean(db)

  const canCreatePaziente =
    !isPmaDashboardReadOnly &&
    Boolean(db && manifestazioneForCreate && pmaId.trim() !== '') &&
    (user?.rank === 'Superadmin' ||
      user?.rank === 'Medico' ||
      user?.rank === 'Infermiere' ||
      user?.rank === 'Triage' ||
      user?.rank === 'Soccorritore')

  const manifestazioneForCodiciMinori = useMemo(
    () => (manifestazioneForCreate || pmaSnap.idManifestazione?.trim() || '').trim(),
    [manifestazioneForCreate, pmaSnap.idManifestazione],
  )

  const canOpenCodiciMinori =
    Boolean(db && pmaId.trim() && manifestazioneForCodiciMinori) &&
    Boolean(
      user &&
        (user.rank === 'Superadmin' ||
          user.rank === 'Centrale' ||
          user.rank === 'Medico' ||
          user.rank === 'Infermiere' ||
          user.rank === 'Triage' ||
          user.rank === 'Soccorritore'),
    )

  const showPrendiInCarico =
    user?.rank === 'Medico' ||
    user?.rank === 'Infermiere' ||
    user?.rank === 'Soccorritore' ||
    user?.rank === 'Triage'

  const triageStripEl = (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm font-medium text-white">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ef4444]" aria-hidden />
          Rosso{' '}
          <span className="tabular-nums font-semibold text-white">{countByColor(inCaricoListaDisplay, 'rosso')}</span>
        </span>
        <span className="text-white/45" aria-hidden>
          •
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#eab308]" aria-hidden />
          Giallo{' '}
          <span className="tabular-nums font-semibold text-white">{countByColor(inCaricoListaDisplay, 'giallo')}</span>
        </span>
        <span className="text-white/45" aria-hidden>
          •
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
          Verde{' '}
          <span className="tabular-nums font-semibold text-white">{countByColor(inCaricoListaDisplay, 'verde')}</span>
        </span>
        <span className="text-white/45" aria-hidden>
          •
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full border border-white/50 bg-slate-200 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.25)]"
            aria-hidden
          />
          Bianco{' '}
          <span className="tabular-nums font-semibold text-white">{countByColor(inCaricoListaDisplay, 'bianco')}</span>
        </span>
      </div>
    )

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!db || !pmaId.trim()) return
    const q = query(collection(db, 'allerte_pma'), where('id_pma', '==', pmaId.trim()), limit(40))
    let first = true
    const unsub = onSnapshot(q, (snap) => {
      if (first) {
        first = false
        return
      }
      for (const ch of snap.docChanges()) {
        if (ch.type !== 'added') continue
        const d = ch.doc.data() as Record<string, unknown>
        const msg = typeof d.messaggio === 'string' ? d.messaggio : 'Allerta PMA'
        setPmaAlertToast({ id: ch.doc.id, msg })
        window.setTimeout(() => setPmaAlertToast((cur) => (cur?.id === ch.doc.id ? null : cur)), 14_000)
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification('Allerta PMA', { body: msg, tag: ch.doc.id })
          } catch {
            /* ignore */
          }
        }
      }
    })
    return () => unsub()
  }, [pmaId])

  async function handleNuovoPazienteImmediato() {
    if (!db || !manifestazioneForCreate || !pmaId.trim() || !user || user.rank === 'Centrale') return
    setCreateErr(null)
    setCreating(true)
    try {
      const nuovo = await createPazienteWithProgressivo(db, {
        manifestazioneId: manifestazioneForCreate,
        idPma: pmaId,
        creatorRank: user.rank,
        creatorUid: user.uid,
      })
      navigate(
        `/pma/${encodeURIComponent(pmaId)}/paziente/${encodeURIComponent(nuovo.id)}?tab=generale`,
      )
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : 'Creazione non riuscita.')
    } finally {
      setCreating(false)
    }
  }

  async function handleInCarico(pazienteId: string) {
    if (!db || user?.rank === 'Centrale') return
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

  async function downloadDimessoPdf(patientId: string) {
    if (!db) return
    setDimessiModalErr(null)
    setDimessiModalBusyId(patientId)
    try {
      const snap = await getDoc(doc(db, 'pazienti', patientId))
      if (!snap.exists()) throw new Error('Paziente non trovato.')
      const full = parsePazienteFromFirestore(snap.id, snap.data() as Record<string, unknown>)
      const [{ buildPazientePdfBlob }, { saveAs }] = await Promise.all([
        import('../../lib/pdf/pazientePdfReport'),
        import('file-saver'),
      ])
      const blob = await buildPazientePdfBlob(full, {
        manifestazioneNome: manZipMeta?.nome ?? '',
        pmaNome: pmaSnap.nome ?? pmaId,
        consensoGenericoCure: manZipMeta?.consensoGenericoCure,
        consensoPrivacy: manZipMeta?.consensoPrivacy,
        rifiutoInvioPsText: manZipMeta?.rifiutoInvioPs,
        prestazioniManifestazioneLista: manListeCliniche.prestazioni,
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
      const [{ buildPazientePdfBlob }, { saveAs }] = await Promise.all([
        import('../../lib/pdf/pazientePdfReport'),
        import('file-saver'),
      ])
      const blob = await buildPazientePdfBlob(full, {
        manifestazioneNome: manZipMeta?.nome ?? '',
        pmaNome: pmaSnap.nome ?? pmaId,
        consensoGenericoCure: manZipMeta?.consensoGenericoCure,
        consensoPrivacy: manZipMeta?.consensoPrivacy,
        rifiutoInvioPsText: manZipMeta?.rifiutoInvioPs,
        prestazioniManifestazioneLista: manListeCliniche.prestazioni,
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

  async function riprendiInCaricoDimesso(patientId: string) {
    if (!db || user?.rank !== 'Medico') return
    setDimessiModalErr(null)
    setDimessiRiprendiBusyId(patientId)
    try {
      await updateSchedaPazienteGranular(db, patientId, {
        stato: 'in_carico',
        aperto: true,
        dimesso_at: deleteField(),
        ripreso_in_carico_at: serverTimestamp(),
      })
    } catch (e) {
      setDimessiModalErr(e instanceof Error ? e.message : 'Ripresa in carico non riuscita.')
    } finally {
      setDimessiRiprendiBusyId(null)
    }
  }

  const topToolbarEl = (
      <div
        className={`flex min-w-0 items-center gap-2 ${
          infermiereSm ? 'flex-nowrap overflow-x-auto [-webkit-overflow-scrolling:touch] pb-0.5' : 'flex-wrap'
        }`}
      >
        <button
          type="button"
          disabled={!canCreatePaziente || !manifestazioneForCreate || creating || !pmaId.trim()}
          title={
            isPmaDashboardReadOnly
              ? 'Vista PMA in sola lettura per il ruolo Centrale.'
              : !canCreatePaziente
                ? 'Permessi insufficienti per creare una nuova scheda.'
                : !manifestazioneForCreate
                  ? 'Manifestazione non disponibile.'
                  : undefined
          }
          onClick={() => void handleNuovoPazienteImmediato()}
          className={opToolbarBtnSm}
        >
          {creating ? '…' : 'NUOVO PAZIENTE'}
        </button>
        <button
          type="button"
          disabled={!canOpenCodiciMinori}
          title={
            !manifestazioneForCodiciMinori
              ? 'Manifestazione non disponibile per i codici minori.'
              : !canOpenCodiciMinori
                ? 'Permessi insufficienti.'
                : undefined
          }
          onClick={() => setCodiciMinoriOpen(true)}
          className={opToolbarBtnSm}
        >
          CODICI MINORI
        </button>
        {user?.rank !== 'Centrale' && typeof Notification !== 'undefined' && Notification.permission === 'default' ? (
          <button
            type="button"
            className={opToolbarBtnSm}
            title="Consenti avvisi browser per le allerte Centrale"
            onClick={() => void Notification.requestPermission()}
          >
            {infermiereSm ? (
              <span className="inline-flex items-center gap-1" title="Notifiche allerta">
                <span aria-hidden>🔔</span>
                <span className="sr-only">Notifiche allerta</span>
              </span>
            ) : (
              'Notifiche allerta'
            )}
          </button>
        ) : null}
        <button
          type="button"
          disabled={!pmaId.trim()}
          onClick={() => {
            setDimessiModalOpen(true)
            setDimessiModalSearch('')
            setDimessiModalErr(null)
          }}
          className={opToolbarBtnSm}
        >
          PAZIENTI DIMESSI
        </button>
      </div>
    )

  if (!user) {
    return null
  }

  if (!pmaId.trim()) {
    return (
      <div className="min-h-screen bg-white p-6 font-[system-ui,-apple-system,sans-serif] text-slate-900">
        <p className="text-sm">URL PMA non valido.</p>
      </div>
    )
  }

  const manIdForNav = (manifestazioneForCreate || pmaSnap.idManifestazione || '').trim()

  return (
    <>
      <PmaManagerShell
        user={user}
        pmaId={pmaId}
        manifestazioneId={manIdForNav}
        pmaDisplayTitle={pmaSnap.nome ?? pmaId}
        logout={logout}
        triageStrip={triageStripEl}
        headerActions={topToolbarEl}
        topToolbar={
          canCreatePaziente && !manifestazioneForCreate ? (
            <div className="w-full">
              <p className="text-sm text-amber-800">Manifestazione non disponibile: creazione disabilitata.</p>
            </div>
          ) : createErr ? (
            <div className="w-full">
              <p className="text-sm text-red-700" role="alert">
                {createErr}
              </p>
            </div>
          ) : null
        }
      >
        <div className="pma-dashboard space-y-4">
        {listaError ? (
          <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {listaError}
          </div>
        ) : null}

        {isPmaDashboardReadOnly ? (
          <div
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            role="status"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sola lettura</span>
            <p className="mt-1 font-medium text-slate-800">
              Vista PMA in sola consultazione per il ruolo Centrale: nessuna creazione, modifica o eliminazione da
              questa schermata.
            </p>
          </div>
        ) : null}

        {pmaAlertToast ? (
          <div
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
            role="status"
          >
            <p className="min-w-0 flex-1">
              <strong className="font-semibold">Allerta:</strong> {pmaAlertToast.msg}
            </p>
            <button
              type="button"
              className="shrink-0 inline-flex h-10 items-center justify-center rounded-md border border-amber-400 bg-white px-4 text-sm font-bold uppercase text-amber-950 hover:bg-amber-100"
              onClick={() => setPmaAlertToast(null)}
            >
              Chiudi
            </button>
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
          <div
            className={
              infermiereSm ? 'flex flex-col gap-3' : 'flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10'
            }
          >
            <div
              className={
                infermiereSm ? 'min-w-0 w-full pma-card px-1 py-0' : 'min-w-0 lg:w-[68%] lg:max-w-[70%] lg:flex-none pma-card'
              }
            >
              <div className="pma-card__hdr">Pazienti in carico</div>
              <ListaPazientiInCarico
                lista={inCaricoListaDisplay}
                pmaId={pmaId}
                nowMs={nowMs}
                canDelete={canDeletePaziente}
                onDeleteClick={(pid, label) => setDeleteModal({ id: pid, label, step: 1 })}
                evidenzaIds={undefined}
                visualVariant="manager"
                compactInfermiereMobile={infermiereSm}
                inCaricoMineCount={inCaricoMineCount}
              />
            </div>

            <div
              className={
                infermiereSm
                  ? 'grid w-full shrink-0 grid-cols-2 gap-2'
                  : 'w-full shrink-0 space-y-4 lg:min-w-[16rem] lg:max-w-[28%] lg:flex-1'
              }
            >
              <ManagerQueueBox
                titleLine1="Pazienti"
                titleLine2="IN ARRIVO"
                lista={inArrivo}
                pmaId={pmaId}
                takeChargeFromQueues={showPrendiInCarico}
                onInCarico={handleInCarico}
              />
              <ManagerQueueBox
                titleLine1="Pazienti"
                titleLine2="IN ATTESA"
                lista={inAttesa}
                pmaId={pmaId}
                takeChargeFromQueues={showPrendiInCarico}
                onInCarico={handleInCarico}
              />
            </div>
          </div>
        )}
        </div>
      </PmaManagerShell>

      {dimessiModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-10 sm:pt-14"
          role="dialog"
          aria-modal
          aria-labelledby="dimessi-modal-title"
          onClick={() => setDimessiModalOpen(false)}
        >
          <div
            className="my-auto w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pma-bar flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 id="dimessi-modal-title" className="pma-bar__id text-base font-semibold">
                  Pazienti dimessi
                </h2>
                <p className="mt-0.5 text-xs text-[#a8a8c8]">
                  {manifestazioneIdDimessiQuery
                    ? 'Elenco da manifestazione (query indicizzata), filtrato su questo PMA.'
                    : 'Elenco dal PMA corrente (nessun id manifestazione sul PMA).'}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold uppercase text-slate-700 hover:bg-slate-50"
                onClick={() => setDimessiModalOpen(false)}
              >
                Chiudi
              </button>
            </div>
            <div className="space-y-3 px-4 py-3 sm:px-5 sm:py-4">
              <label className="pma-field">
                <span className="pma-field__label">Cerca per nome, cognome o ID</span>
                <input
                  type="search"
                  value={dimessiModalSearch}
                  onChange={(e) => setDimessiModalSearch(e.target.value)}
                  placeholder="Es. Rossi, ID visibile…"
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
                    const riprendiBusy = dimessiRiprendiBusyId === pz.id
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
                          {user?.rank === 'Medico' ? (
                            <button
                              type="button"
                              disabled={riprendiBusy || busy || !db}
                              onClick={() => void riprendiInCaricoDimesso(pz.id)}
                              className="inline-flex h-10 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold uppercase text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              {riprendiBusy ? '…' : 'RIPRENDI IN CARICO'}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy || riprendiBusy || !db}
                            onClick={() => void downloadDimessoPdf(pz.id)}
                            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-bold uppercase text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {busy ? '…' : 'Scarica PDF'}
                          </button>
                          <button
                            type="button"
                            disabled={busy || riprendiBusy || !db}
                            onClick={() => void mailDimessoPdf(pz.id)}
                            className="inline-flex h-10 items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-4 text-sm font-bold uppercase text-blue-900 hover:bg-blue-100 disabled:opacity-50"
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

      {codiciMinoriOpen && manifestazioneForCodiciMinori ? (
        <CodiciMinoriModal
          open={codiciMinoriOpen}
          onClose={() => setCodiciMinoriOpen(false)}
          idManifestazione={manifestazioneForCodiciMinori}
          pmaId={pmaId}
          spinnerClass={theme.spinnerAccent}
        />
      ) : null}

      {deleteModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="del-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="del-title" className="text-lg font-bold text-slate-900">
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
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold uppercase text-slate-800 hover:bg-slate-50"
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
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-600 px-4 text-sm font-bold uppercase text-white hover:bg-amber-700"
                  onClick={() => setDeleteModal({ ...deleteModal, step: 2 })}
                >
                  Continua
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-red-700 px-4 text-sm font-bold uppercase text-white hover:bg-red-800"
                  onClick={() => void eseguiElimina()}
                >
                  Elimina definitivamente
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
