import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { createPazienteWithProgressivo } from '../../lib/createPazienteWithProgressivo'
import { usePazientiForPma } from '../../hooks/usePazientiForPma'
import type { Pma } from '../../types/pma'
import type { CodiceColorePaziente } from '../../types/paziente'
import { CODICE_COLORE_LABEL } from '../../types/paziente'

const PILLS: CodiceColorePaziente[] = ['bianco', 'verde', 'giallo', 'rosso']

const COLORE_BADGE: Record<CodiceColorePaziente, string> = {
  rosso: 'bg-red-600 text-white ring-red-700/30',
  giallo: 'bg-amber-400 text-slate-900 ring-amber-600/25',
  verde: 'bg-emerald-600 text-white ring-emerald-700/30',
  bianco: 'bg-slate-200 text-slate-800 ring-slate-400/30',
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
      else if (p.stato === 'in_attesa') in_attesa += 1
      else if (p.stato === 'in_carico' || p.stato === 'errore') {
        inCaricoColore[p.codice_colore] += 1
      }
    }
    const inCaricoTot =
      inCaricoColore.rosso +
      inCaricoColore.giallo +
      inCaricoColore.verde +
      inCaricoColore.bianco
    return { in_arrivo, in_attesa, inCaricoColore, inCaricoTot }
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

  return (
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-white via-sky-50/50 to-white p-5 shadow-md sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-800/80">PMA in evidenza</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{sel?.nome ?? focusPmaId}</h3>
          <p className="mt-0.5 text-sm text-slate-600">{sel?.luogo ?? '—'}</p>
          <p className="mt-2 font-mono text-xs text-slate-500">{focusPmaId}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
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
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Apri dashboard PMA
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Carico operativo</p>
          <p className="mt-1 text-xs text-slate-600">Pazienti in carico (e errore) per codice colore</p>
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
              <p className="text-xs text-slate-500">in carico / errore</p>
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

        <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Logistica</p>
          <p className="mt-1 text-xs text-slate-600">Ingressi e attese sul PMA selezionato</p>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">…</p>
          ) : (
            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-3 rounded-lg bg-sky-50 px-3 py-2 ring-1 ring-sky-200/60">
                <dt className="text-sm font-medium text-sky-950">In arrivo</dt>
                <dd className="text-2xl font-bold tabular-nums text-sky-950">{stats.in_arrivo}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-amber-200/70">
                <dt className="text-sm font-medium text-amber-950">In attesa</dt>
                <dd className="text-2xl font-bold tabular-nums text-amber-950">{stats.in_attesa}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-900/80">Creazione rapida</p>
            <p className="mt-1 text-xs text-emerald-950/90">
              Nuovo paziente in <strong>in arrivo</strong> (Centrale), poi compilazione in Generale.
            </p>
          </div>
          {user?.rank === 'Centrale' ? (
            <button
              type="button"
              disabled={creating || !db}
              onClick={() => void handleNuovoPazienteCentrale()}
              className={`mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 ${theme.primaryCta} ${theme.primaryCtaHover}`}
            >
              {creating ? 'Creazione…' : 'Nuovo paziente'}
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
    </div>
  )
}
