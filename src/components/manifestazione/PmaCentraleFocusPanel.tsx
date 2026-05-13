import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Timestamp } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { createPazienteWithProgressivo } from '../../lib/createPazienteWithProgressivo'
import { usePazientiForPma, type PazienteListItem } from '../../hooks/usePazientiForPma'
import type { Pma } from '../../types/pma'
import type { CodiceColorePaziente } from '../../types/paziente'
import { CODICE_COLORE_LABEL, pazienteOccupaPostoLetto } from '../../types/paziente'
import { PmaCapacityGauge } from './PmaCapacityGauge'

const PILLS: CodiceColorePaziente[] = ['bianco', 'verde', 'giallo', 'rosso']

const TRIAGE_ORDER: CodiceColorePaziente[] = ['rosso', 'giallo', 'verde', 'bianco']

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

function sortInCaricoByTriage(list: PazienteListItem[]) {
  return [...list].sort((a, b) => {
    const ia = TRIAGE_ORDER.indexOf(a.codice_colore)
    const ib = TRIAGE_ORDER.indexOf(b.codice_colore)
    if (ia !== ib) return ia - ib
    return a.id_paziente_visibile.localeCompare(b.id_paziente_visibile, 'it')
  })
}

const COLORE_BADGE: Record<CodiceColorePaziente, string> = {
  rosso: 'bg-red-600 text-white ring-red-700/30',
  giallo: 'bg-amber-400 text-slate-900 ring-amber-600/25',
  verde: 'bg-emerald-600 text-white ring-emerald-700/30',
  bianco: 'bg-slate-200 text-slate-800 ring-slate-400/30',
}

const COLORE_DOT: Record<CodiceColorePaziente, string> = {
  rosso: 'bg-red-600',
  giallo: 'bg-amber-400',
  verde: 'bg-emerald-600',
  bianco: 'bg-slate-300',
}

type Theme = {
  primaryCta: string
  primaryCtaHover: string
  spinnerAccent: string
}

type Props = {
  manifestazioneId: string
  pmaList: Pma[]
  theme: Theme
}

/**
 * Vista “PMA attivo” per la dashboard Centrale: carico in carico per colore, logistica, creazione rapida.
 */
export function PmaCentraleFocusPanel({ manifestazioneId, pmaList, theme }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [focusPmaId, setFocusPmaId] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)

  useEffect(() => {
    if (pmaList.length === 0) return
    if (!focusPmaId || !pmaList.some((x) => x.id === focusPmaId)) {
      setFocusPmaId(pmaList[0].id)
    }
  }, [pmaList, focusPmaId])

  const { items, loading, error } = usePazientiForPma(focusPmaId || undefined)

  const stats = useMemo(() => {
    let in_arrivo = 0
    let in_attesa = 0
    const inCaricoColore: Record<CodiceColorePaziente, number> = {
      rosso: 0,
      giallo: 0,
      verde: 0,
      bianco: 0,
    }
    for (const p of items) {
      if (p.stato === 'dimesso') continue
      if (p.stato === 'in_arrivo') in_arrivo += 1
      else if (p.stato === 'in_attesa' || p.stato === 'in_sospeso') in_attesa += 1
      else if (p.stato === 'in_carico') {
        inCaricoColore[p.codice_colore] += 1
      }
    }
    const inCaricoTot =
      inCaricoColore.rosso +
      inCaricoColore.giallo +
      inCaricoColore.verde +
      inCaricoColore.bianco
    const occupatiLetti = items.filter((p) => pazienteOccupaPostoLetto(p.stato)).length
    return { in_arrivo, in_attesa, inCaricoColore, inCaricoTot, occupatiLetti }
  }, [items])

  const inCaricoLista = useMemo(() => {
    const rows = items.filter((p) => p.stato === 'in_carico')
    return sortInCaricoByTriage(rows)
  }, [items])

  const dimessiUltimi5 = useMemo(() => {
    return [...items]
      .filter((p) => p.stato === 'dimesso' && p.dimesso_at)
      .sort((a, b) => (b.dimesso_at!.toMillis() - a.dimesso_at!.toMillis()))
      .slice(0, 5)
  }, [items])

  async function handleNuovoPazienteCentrale() {
    if (!db || !user || user.rank !== 'Centrale' || !manifestazioneId.trim() || !focusPmaId.trim()) return
    setCreateErr(null)
    setCreating(true)
    try {
      const nuovoId = await createPazienteWithProgressivo(db, {
        manifestazioneId: manifestazioneId.trim(),
        idPma: focusPmaId.trim(),
        creatorRank: 'Centrale',
        creatorUid: user.uid,
      })
      navigate(
        `/pma/${encodeURIComponent(focusPmaId)}/paziente/${encodeURIComponent(nuovoId)}?tab=generale`,
      )
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : 'Creazione non riuscita.')
    } finally {
      setCreating(false)
    }
  }

  if (pmaList.length === 0) return null

  const sel = pmaList.find((p) => p.id === focusPmaId)

  const postiLetto = sel?.impostazioni_pma.posti_letto ?? 0

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">PMA in evidenza</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{sel?.nome ?? focusPmaId}</h3>
          <p className="mt-0.5 text-sm font-medium text-slate-600">{sel?.luogo ?? '—'}</p>
          <p className="mt-2 font-mono text-sm font-medium text-slate-500">{focusPmaId}</p>
          {postiLetto > 0 ? (
            <div className="mt-3 max-w-xs">
              <PmaCapacityGauge occupati={stats.occupatiLetti} posti={postiLetto} />
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="block text-xs font-medium text-slate-700">
            <span className="sr-only">Seleziona PMA</span>
            <select
              value={focusPmaId}
              onChange={(e) => setFocusPmaId(e.target.value)}
              className="mt-0.5 w-full min-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm sm:w-auto"
            >
              {pmaList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
          <Link
            to={`/pma/${encodeURIComponent(focusPmaId)}`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold uppercase text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Apri dashboard PMA
          </Link>
          <Link
            to={`/pma/${encodeURIComponent(focusPmaId)}?dimessi=1`}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold uppercase text-slate-800 shadow-sm hover:bg-slate-50 no-underline"
          >
            PAZIENTI DIMESSI
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Carico operativo</p>
          <p className="mt-1 text-xs text-slate-600">Pazienti in carico, per codice colore triage</p>
          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <span
                className={`h-5 w-5 animate-spin rounded-full border-2 ${theme.spinnerAccent}`}
                aria-hidden
              />
              Caricamento…
            </div>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{stats.inCaricoTot}</p>
              <p className="text-xs text-slate-500">in carico</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                {PILLS.map((c) => {
                  const n = stats.inCaricoColore[c]
                  return (
                    <span
                      key={c}
                      title={CODICE_COLORE_LABEL[c]}
                      className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums ring-1 ring-black/10 ${COLORE_BADGE[c]}`}
                    >
                      {n}
                    </span>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Logistica</p>
          <p className="mt-1 text-xs text-slate-600">Ingressi e attese sul PMA selezionato</p>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">…</p>
          ) : (
            <dl className="mt-3 space-y-2">
              <div className="flex items-baseline justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                <dt className="text-sm font-medium text-slate-700">In arrivo</dt>
                <dd className="text-xl font-bold tabular-nums text-slate-900">{stats.in_arrivo}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                <dt className="text-sm font-medium text-slate-700">In attesa</dt>
                <dd className="text-xl font-bold tabular-nums text-slate-900">{stats.in_attesa}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-md border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Creazione rapida</p>
            <p className="mt-1 text-xs text-slate-600">
              Nuovo paziente in <strong className="text-slate-800">in arrivo</strong> (Centrale), poi compilazione in
              Generale.
            </p>
          </div>
          {user?.rank === 'Centrale' ? (
            <button
              type="button"
              disabled={creating || !db}
              onClick={() => void handleNuovoPazienteCentrale()}
              className={`mt-3 inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-800 bg-white px-4 text-sm font-bold uppercase text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:opacity-50`}
            >
              {creating ? 'CREAZIONE…' : 'NUOVO PAZIENTE'}
            </button>
          ) : (
            <p className="mt-4 text-xs text-slate-600">
              Solo utenti con ruolo Centrale possono creare da qui.
            </p>
          )}
          {createErr ? (
            <p className="mt-2 text-xs text-red-700" role="alert">
              {createErr}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pz in carico</p>
          <p className="mt-1 text-xs text-slate-600">Pazienti con stato in carico sul PMA selezionato.</p>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Caricamento…</p>
          ) : inCaricoLista.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nessuno in carico.</p>
          ) : (
            <ul className="mt-3 max-h-60 space-y-1.5 overflow-y-auto pr-0.5">
              {inCaricoLista.map((pz) => {
                const nome = [pz.cognome, pz.nome].filter(Boolean).join(' ') || '—'
                const schedaTo = `/pma/${encodeURIComponent(focusPmaId)}/paziente/${encodeURIComponent(pz.id)}?tab=generale`
                return (
                  <li key={pz.id}>
                    <Link
                      to={schedaTo}
                      className="block rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm transition hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-900">{nome}</span>
                      <span className="mt-0.5 flex items-center gap-2 font-mono text-xs text-slate-600">
                        {pz.id_paziente_visibile}
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10 ${COLORE_DOT[pz.codice_colore]}`}
                          title={CODICE_COLORE_LABEL[pz.codice_colore]}
                          aria-label={CODICE_COLORE_LABEL[pz.codice_colore]}
                        />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ultimi 5 pz dimessi</p>
          <p className="mt-1 text-xs text-slate-600">Dimissioni recenti registrate su questo PMA.</p>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Caricamento…</p>
          ) : dimessiUltimi5.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nessun dimesso in elenco.</p>
          ) : (
            <ul className="mt-3 max-h-60 space-y-1.5 overflow-y-auto pr-0.5">
              {dimessiUltimi5.map((pz) => {
                const nome = [pz.cognome, pz.nome].filter(Boolean).join(' ') || '—'
                const schedaTo = `/pma/${encodeURIComponent(focusPmaId)}/paziente/${encodeURIComponent(pz.id)}?tab=generale`
                return (
                  <li key={pz.id}>
                    <Link
                      to={schedaTo}
                      className="block rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm transition hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-900">{nome}</span>
                      <span className="mt-0.5 block font-mono text-xs text-slate-600">{pz.id_paziente_visibile}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Dimesso {formatDimessoBreve(pz.dimesso_at)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
