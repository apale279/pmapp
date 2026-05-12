import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Timestamp } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { useRankTheme } from '../../hooks/useRankTheme'
import { useManifestazioneDoc } from '../../hooks/useManifestazioneDoc'
import { usePmaListForManifestazione } from '../../hooks/usePmaListForManifestazione'
import { useDimessiManifestazione } from '../../hooks/useDimessiManifestazione'
import type { DimessoManifestazioneRow } from '../../hooks/useDimessiManifestazione'
import { NewPmaModal } from '../../components/manifestazione/NewPmaModal'
import { PmaCard } from '../../components/manifestazione/PmaCard'
import { PmaOperationalCounts } from '../../components/manifestazione/PmaOperationalCounts'
import { PmaCentraleFocusPanel } from '../../components/manifestazione/PmaCentraleFocusPanel'
import { PmaCapacityFromPmaId } from '../../components/manifestazione/PmaCapacityGauge'
import type { CodiceColorePaziente } from '../../types/paziente'
import { CODICE_COLORE_LABEL } from '../../types/paziente'

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
  const isSuperadmin = user?.rank === 'Superadmin'
  const isCentrale = user?.rank === 'Centrale'
  const showCoordinationBoard = isCentrale || isSuperadmin

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

  const dimessiUltimi10PerPma = useMemo(() => {
    const m = new Map<string, DimessoManifestazioneRow[]>()
    for (const r of dimessiManifestazione) {
      const k = r.id_pma.trim() !== '' ? r.id_pma : '_senza_pma'
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
    const out = new Map<string, DimessoManifestazioneRow[]>()
    for (const [k, arr] of m) {
      const sorted = [...arr].sort(
        (a, b) => (b.dimesso_at?.toMillis?.() ?? 0) - (a.dimesso_at?.toMillis?.() ?? 0),
      )
      out.set(k, sorted.slice(0, 10))
    }
    return out
  }, [dimessiManifestazione])

  const dimessiTickerRows = useMemo(() => {
    return [...dimessiManifestazione]
      .sort((a, b) => (b.dimesso_at?.toMillis?.() ?? 0) - (a.dimesso_at?.toMillis?.() ?? 0))
      .slice(0, 28)
  }, [dimessiManifestazione])

  return (
    <div className="mx-auto max-w-6xl space-y-8">
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
          <header
            className={`rounded-xl border border-slate-200 border-l-4 ${theme.cardAccentLeft} bg-white p-6 shadow-sm`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Manifestazione
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  {man.nome}
                </h1>
                <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
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
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Link
                  to={`/manifestazione/${encodeURIComponent(manifestazioneId)}/impostazioni`}
                  className="text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                >
                  Impostazioni manifestazione
                </Link>
                {isSuperadmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPmaModalKey((k) => k + 1)
                      setPmaModalOpen(true)
                    }}
                    className={`rounded-md px-4 py-2.5 text-sm font-medium shadow-sm ${theme.primaryCta} ${theme.primaryCtaHover}`}
                  >
                    Crea nuovo PMA
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          {showCoordinationBoard && !pmaLoading && !pmaError && pmaList.length > 0 ? (
            <section
              aria-labelledby="coord-heading"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <h2
                id="coord-heading"
                className="text-xs font-bold uppercase tracking-widest text-slate-500"
              >
                Dashboard centrale — coordinamento PMA
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Vista rapida sul PMA prescelto (di solito un solo posto attivo), più tabella completa e ricerca
                dimessi su tutta la manifestazione.
              </p>

              <div className="mt-6">
                <PmaCentraleFocusPanel
                  manifestazioneId={manifestazioneId}
                  pmaList={pmaList}
                  theme={{
                    primaryCta: theme.primaryCta,
                    primaryCtaHover: theme.primaryCtaHover,
                    spinnerAccent: theme.spinnerAccent,
                  }}
                />
              </div>

              <h3 className="mt-10 text-xs font-bold uppercase tracking-widest text-slate-500">
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
                            className="inline-flex rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-800 shadow-sm hover:bg-slate-50"
                          >
                            Apri PMA
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {dimessiTickerRows.length > 0 ? (
                <div
                  className="mt-3 border-t border-slate-200 pt-3"
                  role="region"
                  aria-label="Ultimi pazienti dimessi, scorrimento automatico"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Ultimi eventi — dimessi
                  </p>
                  <div className="mt-1.5 overflow-hidden rounded border border-slate-200 bg-slate-100 py-1.5">
                    <div className="flex w-max animate-pmapp-ticker">
                      {[0, 1].map((dup) => (
                        <ul
                          key={dup}
                          className="flex shrink-0 items-center gap-x-10 px-4"
                          aria-hidden={dup === 1}
                        >
                          {dimessiTickerRows.map((row) => (
                            <li key={`${dup}-${row.id}`} className="whitespace-nowrap text-[11px] text-slate-600">
                              <span className="font-mono text-slate-800">{row.id_paziente_visibile}</span>
                              <span className="text-slate-400"> · </span>
                              <span className="text-slate-800">
                                {row.cognome} {row.nome}
                              </span>
                              <span className="text-slate-400"> · </span>
                              dimesso {formatDimessoBreve(row.dimesso_at)}
                              <span className="text-slate-400"> · </span>
                              <span className="text-slate-500">
                                {(pmaNomeById.get(row.id_pma) ?? row.id_pma) || '—'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-8 space-y-4 border-t border-slate-100 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Ricerca dimessi (intera manifestazione)
                </h3>
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
                <label className="block max-w-md text-sm">
                  <span className="font-medium text-slate-700">Filtra dimessi</span>
                  <input
                    type="search"
                    value={dimessiSearch}
                    onChange={(e) => setDimessiSearch(e.target.value)}
                    placeholder="ID, nome, cognome, PMA…"
                    disabled={dimessiLoading}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </label>
                {dimessiLoading ? (
                  <p className="text-sm text-slate-500">Caricamento elenco dimessi…</p>
                ) : dimessiFiltrati.length === 0 ? (
                  <p className="text-sm text-slate-500">Nessun dimesso in elenco o nessun risultato.</p>
                ) : (
                  <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50/50">
                    <table className="min-w-full text-left text-xs sm:text-sm">
                      <thead className="sticky top-0 bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-600 sm:text-xs">
                        <tr>
                          <th className="px-3 py-2">ID</th>
                          <th className="px-3 py-2">Paziente</th>
                          <th className="px-3 py-2">PMA</th>
                          <th className="px-3 py-2">Colore</th>
                          <th className="px-3 py-2">Dimesso</th>
                          <th className="px-3 py-2 text-right">Scheda</th>
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
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${BADGE_COLORE[row.codice_colore]}`}
                              >
                                {CODICE_COLORE_LABEL[row.codice_colore]}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                              {formatDimessoBreve(row.dimesso_at)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {row.id_pma ? (
                                <Link
                                  to={`/pma/${encodeURIComponent(row.id_pma)}/paziente/${encodeURIComponent(row.id)}`}
                                  className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                                >
                                  Apri
                                </Link>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-4 border-t border-slate-100 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Ultimi 10 dimessi per PMA
                </h3>
                <div className="space-y-6">
                  {pmaList.map((pma) => {
                    const ultimi = dimessiUltimi10PerPma.get(pma.id) ?? []
                    return (
                      <div
                        key={`dim-${pma.id}`}
                        className="rounded-lg border border-slate-200 bg-slate-50/40 p-4"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{pma.nome}</p>
                          <Link
                            to={`/pma/${encodeURIComponent(pma.id)}`}
                            className="text-xs font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                          >
                            Dashboard PMA
                          </Link>
                        </div>
                        {ultimi.length === 0 ? (
                          <p className="mt-2 text-xs text-slate-500">Nessun dimesso registrato.</p>
                        ) : (
                          <ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white text-sm">
                            {ultimi.map((row) => (
                              <li
                                key={row.id}
                                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <span className="font-mono text-xs text-slate-600">
                                    {row.id_paziente_visibile}
                                  </span>
                                  <span className="ml-2 text-slate-900">
                                    {row.cognome} {row.nome}
                                  </span>
                                  <span
                                    className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${BADGE_COLORE[row.codice_colore]}`}
                                  >
                                    {CODICE_COLORE_LABEL[row.codice_colore]}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                                  <span>{formatDimessoBreve(row.dimesso_at)}</span>
                                  <Link
                                    to={`/pma/${encodeURIComponent(pma.id)}/paziente/${encodeURIComponent(row.id)}`}
                                    className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                                  >
                                    Scheda
                                  </Link>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          ) : null}

          <section aria-labelledby="pma-list-heading">
            <div className="flex items-end justify-between gap-4">
              <h2
                id="pma-list-heading"
                className="text-sm font-semibold uppercase tracking-wide text-slate-500"
              >
                Posti medici avanzati (PMA)
              </h2>
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
                {isSuperadmin ? 'Usa “Crea nuovo PMA” per aggiungerne uno.' : null}
              </p>
            ) : null}

            {!pmaLoading && !pmaError && pmaList.length > 0 ? (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  )
}
