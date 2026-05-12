import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteDoc, doc, getDoc, type Timestamp } from 'firebase/firestore'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
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
import { useDimessiManifestazione } from '../../hooks/useDimessiManifestazione'
import { parsePazienteFromFirestore } from '../../hooks/usePazienteDoc'
import {
  buildMailtoReportPaziente,
  buildPazientePdfBlob,
  defaultPdfFilename,
  sanitizeFilePart,
} from '../../lib/pdf/pazientePdfReport'
import { CodiciMinoriModal } from '../../components/pma/CodiciMinoriModal'
import { PmaManagerShell } from '../../components/pma/PmaManagerShell'
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

/** Pulsanti toolbar sotto header PMA Manager. */
const BTN_TOOLBAR_SM =
  'inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-[#e2e8f0] bg-white px-3 text-[11px] font-bold uppercase tracking-wide text-slate-900 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40'

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

/** Colonna destra mock: box bianco, titolo su due righe (es. Pazienti / IN ARRIVO). */
function ManagerQueueBox({
  titleLine1,
  titleLine2,
  lista,
  pmaId,
  isTriage,
  onInCarico,
}: {
  titleLine1: string
  titleLine2: string
  lista: PazienteListItem[]
  pmaId: string
  isTriage: boolean
  onInCarico: (id: string) => void
}) {
  const preview = lista.slice(0, 2)
  return (
    <section className="rounded border border-slate-200 bg-white p-3">
      <h3 className="border-b border-slate-200 pb-2 text-center text-[11px] font-bold leading-tight text-[#111827]">
        <span className="block font-medium">{titleLine1}</span>
        <span className="mt-0.5 block text-[10px] font-extrabold uppercase tracking-widest">{titleLine2}</span>
      </h3>
      {preview.length === 0 ? (
        <p className="mt-2 text-center text-[12px] text-slate-400">—</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {preview.map((pz) => {
            const nome = [pz.cognome, pz.nome].filter(Boolean).join(' ') || '—'
            return (
              <li key={pz.id} className="text-[12px] leading-snug">
                <Link
                  to={`/pma/${encodeURIComponent(pmaId)}/paziente/${encodeURIComponent(pz.id)}?tab=generale`}
                  className="font-medium text-[#111827] hover:underline"
                >
                  {nome}
                </Link>
                <div className="mt-0.5 font-mono text-[10px] text-slate-600">{pz.id_paziente_visibile}</div>
                {isTriage && pz.stato === 'in_arrivo' ? (
                  <button
                    type="button"
                    onClick={() => onInCarico(pz.id)}
                    className="mt-1 rounded border border-slate-300 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-800 hover:bg-slate-50"
                  >
                    Arrivato
                  </button>
                ) : null}
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
}) {
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
      <p className={`py-6 text-center text-slate-500 ${manager ? 'text-[13px]' : 'text-xs'}`}>{emptyMessage}</p>
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
      <table className="w-full border-collapse text-left text-[13px] leading-snug">
        <thead
          className={
            manager
              ? 'border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-[#111827]'
              : 'sticky top-0 z-[1] border-b border-slate-200 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600'
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
        <tbody className="divide-y divide-slate-100 text-[#111827]">
          {lista.map((pz) => {
            const nome = [pz.cognome, pz.nome].filter(Boolean).join(' ') || 'Senza nome'
            const err = pz.stato === 'errore'
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
            return (
              <tr
                key={pz.id}
                className={`align-middle transition-colors ${
                  manager
                    ? 'hover:bg-[#f1f5f9]'
                    : `hover:bg-slate-50/80 ${inEvidenza ? 'border-l-[3px] border-l-slate-900 bg-slate-100/60' : ''} ${err ? 'bg-red-50/70' : ''}`
                } ${manager && err ? 'bg-red-50/50' : ''}`}
              >
                <td className="whitespace-nowrap px-2 py-2.5">
                  <span className="inline-flex items-center gap-1" title={CODICE_COLORE_LABEL[pz.codice_colore]}>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotTri[pz.codice_colore]}`} aria-hidden />
                    <span className="sr-only">{CODICE_COLORE_LABEL[pz.codice_colore]}</span>
                  </span>
                </td>
                <td className="max-w-0 min-w-0 px-2 py-2.5">
                  <Link
                    to={`/pma/${encodeURIComponent(pmaId)}/paziente/${encodeURIComponent(pz.id)}?tab=generale`}
                    className={`block truncate font-semibold hover:underline ${manager ? 'text-[#111827]' : 'text-slate-900 hover:text-slate-950'}`}
                  >
                    {nome}
                  </Link>
                  <div className={`mt-0.5 truncate font-mono ${manager ? 'text-[11px] text-slate-600' : 'text-[11px] text-slate-600'}`}>
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
                  className={`max-w-[8rem] truncate px-2 py-2.5 font-mono text-[11px] text-slate-600 ${manager ? 'table-cell' : 'hidden md:table-cell'}`}
                  title={ref}
                >
                  {ref}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 tabular-nums text-slate-700">
                  {formatPermanenza(pz.apertura_scheda, nowMs)}
                </td>
                <td className={`whitespace-nowrap px-2 py-2.5 ${manager ? 'table-cell' : 'hidden sm:table-cell'}`}>
                  <span
                    className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      err
                        ? 'border-red-200 bg-red-50 text-red-800'
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
                        onClick={() => onDeleteClick(pz.id, pz.id_paziente_visibile)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-red-600"
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
                        onClick={() => onDeleteClick(pz.id, pz.id_paziente_visibile)}
                        className="rounded border border-slate-300 bg-white px-1 py-0.5 text-[10px] font-semibold uppercase text-slate-700 hover:bg-slate-100"
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
  const { user, logout } = useAuth()
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
  const [codiciMinoriOpen, setCodiciMinoriOpen] = useState(false)

  const { bumpSync } = useSyncLive()
  useEffect(() => {
    if (!listaLoading) bumpSync()
  }, [listaLoading, bumpSync])

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

  const isTriage = user?.rank === 'Triage'

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

  if (!user) {
    return null
  }

  if (!pmaId.trim()) {
    return (
      <div className="min-h-screen bg-white p-6 font-[system-ui,-apple-system,sans-serif] text-[#111827]">
        <p className="text-sm">URL PMA non valido.</p>
      </div>
    )
  }

  const manIdForNav = (manifestazioneForCreate || pmaSnap.idManifestazione || '').trim()

  const triageStripEl = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium text-[#111827]">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ef4444]" aria-hidden />
        Rosso {countByColor(inCarico, 'rosso')}
      </span>
      <span className="text-slate-300" aria-hidden>
        •
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#eab308]" aria-hidden />
        Giallo {countByColor(inCarico, 'giallo')}
      </span>
      <span className="text-slate-300" aria-hidden>
        •
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
        Verde {countByColor(inCarico, 'verde')}
      </span>
    </div>
  )

  const topToolbarEl = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
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
        className={BTN_TOOLBAR_SM}
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
        className={BTN_TOOLBAR_SM}
      >
        CODICI MINORI
      </button>
      <button
        type="button"
        disabled={!pmaId.trim()}
        onClick={() => {
          setDimessiModalOpen(true)
          setDimessiModalSearch('')
          setDimessiModalErr(null)
        }}
        className={BTN_TOOLBAR_SM}
      >
        PAZIENTI DIMESSI
      </button>
      <Link
        to={`/pma/${encodeURIComponent(pmaId)}/impostazioni`}
        aria-disabled={!pmaId.trim()}
        onClick={(e) => {
          if (!pmaId.trim()) e.preventDefault()
        }}
        className={`${BTN_TOOLBAR_SM} ${!pmaId.trim() ? 'pointer-events-none opacity-40' : ''}`}
      >
        IMPOSTAZIONI PMA
      </Link>
      {user.rank === 'Centrale' && dimessi.length > 0 ? (
        <button
          type="button"
          disabled={zipBusy || !db}
          onClick={() => void handleZipDimessi()}
          className={`${BTN_TOOLBAR_SM} shrink-0`}
        >
          {zipBusy ? (
            <>
              <span
                className={`mr-1 h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-slate-400 border-t-transparent`}
                aria-hidden
              />
              ZIP
            </>
          ) : (
            `ZIP (${dimessi.length})`
          )}
        </button>
      ) : null}
    </div>
  )

  const footerEl = (
    <>
      <button
        type="button"
        disabled={!canCreatePaziente || !manifestazioneForCreate || creating || !pmaId.trim()}
        onClick={() => void handleNuovoPazienteImmediato()}
        className="rounded-md bg-[#2563eb] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
      >
        {creating ? '…' : '+ NUOVO PAZIENTE'}
      </button>
      <button
        type="button"
        disabled={!pmaId.trim()}
        onClick={() => {
          setDimessiModalOpen(true)
          setDimessiModalSearch('')
          setDimessiModalErr(null)
        }}
        className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-900 transition-colors hover:bg-slate-100"
      >
        PAZIENTI DIMESSI
      </button>
      <Link
        to={`/pma/${encodeURIComponent(pmaId)}/impostazioni`}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-900 transition-colors hover:bg-slate-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        IMPOSTAZIONI PMA
      </Link>
    </>
  )

  return (
    <>
      <PmaManagerShell
        user={user}
        pmaId={pmaId}
        manifestazioneId={manIdForNav}
        pmaDisplayTitle={pmaSnap.nome ?? pmaId}
        logout={logout}
        triageStrip={triageStripEl}
        topToolbar={
          <div className="flex w-full flex-col gap-1.5">
            {topToolbarEl}
            {canCreatePaziente && !manifestazioneForCreate ? (
              <p className="text-[10px] text-amber-800">Manifestazione non disponibile: creazione disabilitata.</p>
            ) : null}
            {createErr ? (
              <p className="text-[11px] text-red-700" role="alert">
                {createErr}
              </p>
            ) : null}
            {zipErr ? (
              <p className="text-[11px] text-red-700" role="alert">
                {zipErr}
              </p>
            ) : null}
          </div>
        }
        footer={footerEl}
      >
        {listaError ? (
          <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
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
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
            <div className="min-w-0 lg:w-[68%] lg:max-w-[70%] lg:flex-none">
              <h2 className="text-2xl font-bold tracking-tight text-[#111827]">Pazienti in Carico</h2>
              <ListaPazientiInCarico
                lista={inCaricoListaDisplay}
                pmaId={pmaId}
                nowMs={nowMs}
                canDelete={canDeletePaziente}
                onDeleteClick={(pid, label) => setDeleteModal({ id: pid, label, step: 1 })}
                evidenzaIds={undefined}
                visualVariant="manager"
              />
            </div>

            <div className="w-full shrink-0 space-y-4 lg:min-w-[16rem] lg:max-w-[28%] lg:flex-1">
              <ManagerQueueBox
                titleLine1="Pazienti"
                titleLine2="IN ARRIVO"
                lista={inArrivo}
                pmaId={pmaId}
                isTriage={isTriage}
                onInCarico={handleInCarico}
              />
              <ManagerQueueBox
                titleLine1="Pazienti"
                titleLine2="IN ATTESA"
                lista={inAttesa}
                pmaId={pmaId}
                isTriage={isTriage}
                onInCarico={handleInCarico}
              />
            </div>
          </div>
        )}
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
    </>
  )
}
