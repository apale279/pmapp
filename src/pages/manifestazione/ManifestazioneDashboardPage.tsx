import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Timestamp } from 'firebase/firestore'
import { collection, deleteField, limit, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { useSyncLive } from '../../context/SyncLiveContext'
import { useRankTheme } from '../../hooks/useRankTheme'
import { useManifestazioneDoc } from '../../hooks/useManifestazioneDoc'
import { usePmaListForManifestazione } from '../../hooks/usePmaListForManifestazione'
import { useDimessiManifestazione } from '../../hooks/useDimessiManifestazione'
import { NewPmaModal } from '../../components/manifestazione/NewPmaModal'
import { PmaCard } from '../../components/manifestazione/PmaCard'
import { PmaOperationalCounts } from '../../components/manifestazione/PmaOperationalCounts'
import { PmaCentraleFocusPanel } from '../../components/manifestazione/PmaCentraleFocusPanel'
import { PmaCapacityFromPmaId } from '../../components/manifestazione/PmaCapacityGauge'
import { OperativePageGrid } from '../../components/layout/OperativePageGrid'
import type { CodiceColorePaziente } from '../../types/paziente'
import { CODICE_COLORE_LABEL } from '../../types/paziente'
import { opPrimaryBtn } from '../../components/layout/operativeTokens'
import { manifestazioneDashboardAllows } from '../../lib/rankMatrix'
import { db } from '../../lib/firebase'
import { updateSchedaPazienteGranular } from '../../lib/updateSchedaPaziente'
import { useApplyOperativeChrome } from '../../hooks/useApplyOperativeChrome'

function formatDimessoBreve(ts: Timestamp | null): string {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  try {
    return ts.toDate().toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

const BADGE_COLORE: Record<CodiceColorePaziente, string> = {
  rosso: 'bg-red-600 text-white',
  giallo: 'bg-amber-400 text-slate-900',
  verde: 'bg-emerald-600 text-white',
  bianco: 'bg-slate-200 text-slate-800',
}

function formatManifestazioneData(
  ts: import('firebase/firestore').Timestamp | null,
): string {
  if (!ts) return '—'
  try {
    return ts.toDate().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function ManifestazioneDashboardPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const manifestazioneId = idParam ? decodeURIComponent(idParam) : ''

  const { user } = useAuth()
  const theme = useRankTheme()
  const rank = user?.rank
  const canMutateManifestDashboard =
    rank != null &&
    (manifestazioneDashboardAllows(rank, 'UPDATE') ||
      manifestazioneDashboardAllows(rank, 'CREATE') ||
      manifestazioneDashboardAllows(rank, 'DELETE'))
  const showCoordinationBoard =
    Boolean(manifestazioneId.trim() !== '' && rank != null) &&
    (canMutateManifestDashboard ||
      rank === 'Medico' ||
      rank === 'Infermiere' ||
      rank === 'Soccorritore' ||
      rank === 'Triage')

  const { data: man, loading: manLoading, error: manError, exists: manExists } =
    useManifestazioneDoc(manifestazioneId || undefined)
  const { items: pmaList, loading: pmaLoading, error: pmaError } =
    usePmaListForManifestazione(manifestazioneId || undefined)

  const { items: dimessiManifestazione, loading: dimessiLoading, error: dimessiError } =
    useDimessiManifestazione(
      showCoordinationBoard && manifestazioneId.trim() !== '' ? manifestazioneId : undefined,
    )

  const [pmaModalOpen, setPmaModalOpen] = useState(false)
  const [pmaModalKey, setPmaModalKey] = useState(0)
  const [dimessiSearch, setDimessiSearch] = useState('')
  const [riprendiBusyId, setRiprendiBusyId] = useState<string | null>(null)
  const [riprendiErr, setRiprendiErr] = useState<string | null>(null)
  const [centraleAlertToast, setCentraleAlertToast] = useState<{ id: string; msg: string } | null>(null)

  useApplyOperativeChrome(
    Boolean(man && manExists),
    () => ({
      titleOverride: (
        <h1 className="truncate text-xs font-bold uppercase tracking-wider text-[#e8e8f8] sm:text-sm">
          {man!.nome.trim().toUpperCase()}
        </h1>
      ),
      headerActions: (
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Link
            to={`/manifestazione/${encodeURIComponent(manifestazioneId)}/impostazioni`}
            className="inline-flex items-center justify-center rounded border border-white/25 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#e8e8f8] no-underline hover:bg-white/15 sm:text-xs"
          >
            Impostazioni
          </Link>
          {rank != null && manifestazioneDashboardAllows(rank, 'CREATE') ? (
            <button
              type="button"
              onClick={() => {
                setPmaModalKey((k) => k + 1)
                setPmaModalOpen(true)
              }}
              className={`${opPrimaryBtn} shrink-0 whitespace-nowrap`}
            >
              Crea nuovo PMA
            </button>
          ) : null}
        </div>
      ),
    }),
    [man?.nome, manifestazioneId, rank],
  )

  const { bumpSync } = useSyncLive()
  useEffect(() => {
    if (!manLoading && manExists) bumpSync()
  }, [manLoading, manExists, bumpSync])

  useEffect(() => {
    if (!db || !manifestazioneId.trim() || rank !== 'Centrale') return
    const q = query(
      collection(db, 'allerte_pma'),
      where('id_manifestazione', '==', manifestazioneId.trim()),
      limit(40),
    )
    let first = true
    const unsub = onSnapshot(q, (snap) => {
      if (first) {
        first = false
        return
      }
      for (const ch of snap.docChanges()) {
        if (ch.type !== 'added') continue
        const d = ch.doc.data() as Record<string, unknown>
        const msg = typeof d.messaggio === 'string' ? d.messaggio : 'Allerta'
        setCentraleAlertToast({ id: ch.doc.id, msg })
        window.setTimeout(() => setCentraleAlertToast((cur) => (cur?.id === ch.doc.id ? null : cur)), 14_000)
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification('Allerta codice rosso', { body: msg, tag: ch.doc.id })
          } catch {
            /* ignore */
          }
        }
      }
    })
    return () => unsub()
  }, [manifestazioneId, rank])

  const pmaNomeById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pmaList) m.set(p.id, p.nome)
    return m
  }, [pmaList])

  const dimessiFiltrati = useMemo(() => {
    const q = dimessiSearch.trim().toLowerCase()
    const base = dimessiManifestazione
    if (!q) return base.slice(0, 100)
    return base
      .filter((row) => {
        const hay = [
          row.nome,
          row.cognome,
          row.id_paziente_visibile,
          row.id,
          row.id_pma,
          pmaNomeById.get(row.id_pma) ?? '',
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 150)
  }, [dimessiManifestazione, dimessiSearch, pmaNomeById])

  async function riprendiInCaricoDimesso(patientId: string) {
    if (!db || user?.rank !== 'Medico') return
    setRiprendiErr(null)
    setRiprendiBusyId(patientId)
    try {
      await updateSchedaPazienteGranular(db, patientId, {
        stato: 'in_carico',
        aperto: true,
        dimesso_at: deleteField(),
        ripreso_in_carico_at: serverTimestamp(),
      })
    } catch (e) {
      setRiprendiErr(e instanceof Error ? e.message : 'Ripresa in carico non riuscita.')
    } finally {
      setRiprendiBusyId(null)
    }
  }

  return (
    <OperativePageGrid
      main={
    <div className="pma-dashboard mx-auto max-w-6xl space-y-8">
      {manLoading ? (
        <div className="flex items-center gap-3 py-8 text-slate-600">
          <div
            className={`h-8 w-8 animate-spin rounded-full border-2 ${theme.spinnerAccent}`}
            aria-hidden
          />
          <span className="text-sm">Caricamento manifestazione…</span>
        </div>
      ) : null}

      {manError ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {manError}
        </div>
      ) : null}

      {!manLoading && !manError && !manExists ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Manifestazione non trovata. Verifica il link dalla homepage.
        </div>
      ) : null}

      {man && manExists ? (
        <>
          {centraleAlertToast ? (
            <div
              className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950 shadow-sm"
              role="status"
            >
              <p className="min-w-0 flex-1">
                <strong className="font-semibold">Allerta Centrale:</strong> {centraleAlertToast.msg}
              </p>
              <button
                type="button"
                className="shrink-0 inline-flex h-10 items-center justify-center rounded-md border border-red-400 bg-white px-4 text-sm font-bold uppercase text-red-950 hover:bg-red-100"
                onClick={() => setCentraleAlertToast(null)}
              >
                Chiudi
              </button>
            </div>
          ) : null}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">ID</dt>
                  <dd className="font-medium text-slate-900">{manifestazioneId}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Data</dt>
                  <dd className="font-medium text-slate-900">{formatManifestazioneData(man.data)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Stato</dt>
                  <dd>
                    <span
                      className={
                        man.stato === 'APERTA'
                          ? 'rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20'
                          : 'rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-600/10'
                      }
                    >
                      {man.stato}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {showCoordinationBoard && !pmaLoading && !pmaError && pmaList.length > 0 ? (
            <section
              aria-labelledby="coord-heading"
              className="pma-card"
            >
              <div className="pma-card__hdr" id="coord-heading">
                Dashboard centrale — coordinamento PMA
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Vista rapida sul PMA prescelto (di solito un solo posto attivo), più tabella completa e ricerca
                dimessi su tutta la manifestazione.
              </p>

              <div className="mt-6">
                {canMutateManifestDashboard ? (
                  <PmaCentraleFocusPanel
                    manifestazioneId={manifestazioneId}
                    pmaList={pmaList}
                    theme={{
                      primaryCta: theme.primaryCta,
                      primaryCtaHover: theme.primaryCtaHover,
                      spinnerAccent: theme.spinnerAccent,
                    }}
                  />
                ) : null}
              </div>

              <h3 className="pma-card__hdr mt-8">
                Tutti i PMA — tabella di coordinamento
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Conteggi sintetici per stato e codice colore (solo pazienti non dimessi) e accesso alle dashboard
                operative.
              </p>
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-100">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        PMA
                      </th>
                      <th scope="col" className="hidden px-4 py-3 sm:table-cell">
                        Luogo
                      </th>
                      <th scope="col" className="hidden w-[7.5rem] px-2 py-3 text-right md:table-cell">
                        Letti
                      </th>
                      <th scope="col" className="min-w-[200px] px-4 py-3">
                        Carico operativo
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Azione
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pmaList.map((pma) => (
                      <tr key={pma.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{pma.nome}</div>
                          <div className="mt-0.5 font-mono text-xs text-slate-500 sm:hidden">{pma.id}</div>
                        </td>
                        <td className="hidden px-4 py-3 text-slate-700 sm:table-cell">{pma.luogo}</td>
                        <td className="hidden px-2 py-3 text-right align-middle md:table-cell">
                          <div className="inline-block text-left">
                            <PmaCapacityFromPmaId pmaId={pma.id} postiLetto={pma.impostazioni_pma.posti_letto} />
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <PmaOperationalCounts pmaId={pma.id} layout="coordination" />
                        </td>
                        <td className="px-4 py-3 text-right align-middle">
                          <Link
                            to={`/pma/${encodeURIComponent(pma.id)}`}
                            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-bold uppercase text-slate-800 shadow-sm hover:bg-slate-50"
                          >
                            Apri PMA
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <details className="group mt-8 border-t border-slate-100 pt-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                  <span className="pma-card__hdr mb-0">Ricerca dimessi (intera manifestazione)</span>
                  <span
                    className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                    aria-hidden
                  >
                    ▼
                  </span>
                </summary>
                <div className="mt-4 space-y-4">
                {dimessiError ? (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    role="alert"
                  >
                    {dimessiError}
                    <p className="mt-2 text-xs text-red-700">
                      Se l’errore indica un indice mancante, crea in Firebase l’indice composito su{' '}
                      <code className="rounded bg-red-100 px-1">pazienti</code>: campi{' '}
                      <code className="rounded bg-red-100 px-1">id_manifestazione</code> (Ascending) e{' '}
                      <code className="rounded bg-red-100 px-1">stato</code> (Ascending).
                    </p>
                  </div>
                ) : null}
                {riprendiErr ? (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    role="alert"
                  >
                    {riprendiErr}
                  </div>
                ) : null}
                <label className="pma-field max-w-md">
                  <span className="pma-field__label">Filtra dimessi</span>
                  <input
                    type="search"
                    value={dimessiSearch}
                    onChange={(e) => setDimessiSearch(e.target.value)}
                    placeholder="ID, nome, cognome, PMA…"
                    disabled={dimessiLoading}
                  />
                </label>
                {dimessiLoading ? (
                  <p className="text-sm text-slate-500">Caricamento elenco dimessi…</p>
                ) : dimessiFiltrati.length === 0 ? (
                  <p className="text-sm text-slate-500">Nessun dimesso in elenco o nessun risultato.</p>
                ) : (
                  <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50/50">
                    <table className="min-w-full text-left text-sm font-medium">
                      <thead className="sticky top-0 bg-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2">ID</th>
                          <th className="px-3 py-2">Paziente</th>
                          <th className="px-3 py-2">PMA</th>
                          <th className="px-3 py-2">Colore</th>
                          <th className="px-3 py-2">Dimesso</th>
                          <th className="px-3 py-2 text-right">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {dimessiFiltrati.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/80">
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-slate-700">
                              {row.id_paziente_visibile}
                            </td>
                            <td className="px-3 py-2 text-slate-800">
                              {row.cognome} {row.nome}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {(pmaNomeById.get(row.id_pma) ?? row.id_pma) || '—'}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${BADGE_COLORE[row.codice_colore]}`}
                              >
                                {CODICE_COLORE_LABEL[row.codice_colore]}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                              {formatDimessoBreve(row.dimesso_at)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                                {rank === 'Medico' ? (
                                  <button
                                    type="button"
                                    disabled={!db || riprendiBusyId === row.id}
                                    onClick={() => void riprendiInCaricoDimesso(row.id)}
                                    className="inline-flex items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                                  >
                                    {riprendiBusyId === row.id ? '…' : 'RIPRENDI IN CARICO'}
                                  </button>
                                ) : null}
                                {row.id_pma ? (
                                  <Link
                                    to={`/pma/${encodeURIComponent(row.id_pma)}/paziente/${encodeURIComponent(row.id)}?tab=generale`}
                                    className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                                  >
                                    Apri
                                  </Link>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                </div>
              </details>

            </section>
          ) : null}

          <section aria-labelledby="pma-list-heading" className="pma-card">
            <div className="pma-card__hdr" id="pma-list-heading">
              Posti medici avanzati (PMA)
            </div>

            {pmaLoading ? (
              <div className="mt-6 flex items-center gap-3 text-slate-600">
                <div
                  className={`h-7 w-7 animate-spin rounded-full border-2 ${theme.spinnerAccent}`}
                  aria-hidden
                />
                <span className="text-sm">Caricamento elenco PMA…</span>
              </div>
            ) : null}

            {pmaError ? (
              <div
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                {pmaError}
                <p className="mt-2 text-xs text-red-700">
                  Se vedi un errore su indice mancante, crea l’indice composito richiesto da Firebase
                  (campo <code className="rounded bg-red-100 px-1">id_manifestazione</code> sulla
                  collection <code className="rounded bg-red-100 px-1">pma</code>).
                </p>
              </div>
            ) : null}

            {!pmaLoading && !pmaError && pmaList.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Nessun PMA per questa manifestazione.{' '}
                {rank != null && manifestazioneDashboardAllows(rank, 'CREATE')
                  ? 'Usa “Crea nuovo PMA” per aggiungerne uno.'
                  : null}
              </p>
            ) : null}

            {!pmaLoading && !pmaError && pmaList.length > 0 ? (
              <ul className="pma-metrics-grid mt-4">
                {pmaList.map((pma) => (
                  <li key={pma.id}>
                    <PmaCard pma={pma} />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <NewPmaModal
            key={pmaModalKey}
            open={pmaModalOpen}
            manifestazioneId={manifestazioneId}
            onClose={() => setPmaModalOpen(false)}
          />
        </>
      ) : null}
    </div>
      }
      aside={
        man && manExists ? (
          <div className="lg:sticky lg:top-4">
            <div className="rounded-lg border border-[#e2e8f0] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Riepilogo</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{man.nome}</p>
              <dl className="mt-4 space-y-2 text-xs text-slate-600">
                <div>
                  <dt className="text-slate-500">ID</dt>
                  <dd className="font-mono text-slate-900">{manifestazioneId}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Stato</dt>
                  <dd className="text-slate-900">{man.stato}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : null
      }
    />
  )
}
