import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { calculateEtaAnni, patchEtaFromDataNascita } from '../../lib/calculateEtaAnni'
import {
  datetimeLocalToTimestamp,
  toDatetimeLocal,
  toYmd,
  ymdToTimestamp,
} from '../../lib/schedaDatetimeLocal'
import { updateSchedaPazienteGranular } from '../../lib/updateSchedaPaziente'
import { staffSoftRefFromUser } from '../../lib/staffSoftRef'
import { usePazienteDoc } from '../../hooks/usePazienteDoc'
import type { CodiceColorePaziente, PazienteStato, TipoPaziente } from '../../types/paziente'
import {
  CODICE_COLORE_LABEL,
  PAZIENTE_STATO_LABEL,
  TIPO_PAZIENTE_LABEL,
} from '../../types/paziente'
import { CartellaClinicaSection } from './CartellaClinicaSection'
import { DettaglioPaziente } from './DettaglioPaziente'
import { DimissioneSection } from './DimissioneSection'
import { InvioOspedaleSection } from './InvioOspedaleSection'
import { EtaPmaCountdown } from './EtaPmaCountdown'
import { schedaPazienteTabsFor, type SchedaPazienteTabId } from './schedaPazienteTabs'
import { useManifestazioneListeCliniche } from '../../hooks/useManifestazioneListeCliniche'
import { useManifestazioneDoc } from '../../hooks/useManifestazioneDoc'
import { usePmaDocSnapshot } from '../../hooks/usePmaDocNome'

type Props = {
  pazienteId: string
}

/** Ordine UI v4: Bianco → Verde → Giallo → Rosso */
const CODICI_UI: CodiceColorePaziente[] = ['bianco', 'verde', 'giallo', 'rosso']
const TIPI: TipoPaziente[] = ['trasportato', 'autopresentato']

const STATI_UI: PazienteStato[] = ['in_arrivo', 'in_attesa', 'in_carico', 'errore', 'dimesso']

function codiceColoreBtnClass(c: CodiceColorePaziente, selected: boolean): string {
  const base =
    'min-h-[3.25rem] rounded-xl border-2 px-2 py-3 text-center text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-40'
  const palettes: Record<CodiceColorePaziente, { off: string; on: string }> = {
    bianco: {
      off: 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100',
      on: 'border-slate-700 bg-slate-200 text-slate-950 ring-4 ring-slate-500/35 ring-offset-2',
    },
    verde: {
      off: 'border-emerald-700/50 bg-emerald-50 text-emerald-950 hover:bg-emerald-100',
      on: 'border-emerald-800 bg-emerald-600 text-white ring-4 ring-emerald-700/40 ring-offset-2',
    },
    giallo: {
      off: 'border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100',
      on: 'border-amber-600 bg-amber-400 text-slate-900 ring-4 ring-amber-600/45 ring-offset-2',
    },
    rosso: {
      off: 'border-red-700/50 bg-red-50 text-red-950 hover:bg-red-100',
      on: 'border-red-900 bg-red-600 text-white ring-4 ring-red-800/45 ring-offset-2',
    },
  }
  return `${base} ${selected ? palettes[c].on : palettes[c].off}`
}

function statoBtnClass(s: PazienteStato, selected: boolean): string {
  const base =
    'rounded-lg border-2 px-2.5 py-2 text-center text-xs font-bold uppercase tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed sm:text-sm'
  const styles: Record<PazienteStato, { off: string; on: string }> = {
    in_arrivo: {
      off: 'border-sky-200 bg-white text-sky-900 hover:bg-sky-50',
      on: 'border-sky-700 bg-sky-600 text-white ring-2 ring-sky-900/30 ring-offset-2',
    },
    in_attesa: {
      off: 'border-amber-200 bg-white text-amber-950 hover:bg-amber-50',
      on: 'border-amber-600 bg-amber-500 text-slate-900 ring-2 ring-amber-800/30 ring-offset-2',
    },
    in_carico: {
      off: 'border-emerald-200 bg-white text-emerald-950 hover:bg-emerald-50',
      on: 'border-emerald-700 bg-emerald-600 text-white ring-2 ring-emerald-900/30 ring-offset-2',
    },
    errore: {
      off: 'border-red-200 bg-white text-red-900 hover:bg-red-50',
      on: 'border-red-800 bg-red-600 text-white ring-2 ring-red-950/30 ring-offset-2',
    },
    dimesso: {
      off: 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
      on: 'border-slate-800 bg-slate-700 text-white ring-2 ring-slate-950/30 ring-offset-2',
    },
  }
  return `${base} ${selected ? styles[s].on : styles[s].off}`
}

function emailTelLegacy(email: string, telefono: string): string {
  const e = email.trim()
  const t = telefono.trim()
  if (e && t) return `${e} · ${t}`
  return e || t
}

function statiSelezionabili(isMedico: boolean, statoCorrente: PazienteStato): PazienteStato[] {
  const base: PazienteStato[] = ['in_arrivo', 'in_attesa', 'in_carico', 'errore']
  if (statoCorrente === 'dimesso') return ['dimesso']
  if (isMedico) return [...base, 'dimesso']
  return base
}

export function SchedaPaziente({ pazienteId }: Props) {
  const { user } = useAuth()
  const { id: pmaRouteId } = useParams<{ id: string }>()
  const { data: p, loading, error, exists } = usePazienteDoc(pazienteId)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrlApplied = useRef<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SchedaPazienteTabId>('generale')
  const [dataNascitaDraft, setDataNascitaDraft] = useState('')
  const [contact, setContact] = useState({ email: '', telefono: '' })

  const isCentrale = user?.rank === 'Centrale'
  const isMedico = user?.rank === 'Medico'
  const canEdit = Boolean(p?.aperto && user)
  const showCentraleFields = isCentrale
  const showEtaPma = isCentrale && p?.tipo_paziente === 'trasportato'

  const write = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!db || !p?.aperto) return
      setSaveError(null)
      try {
        await updateSchedaPazienteGranular(db, pazienteId, patch)
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
      }
    },
    [pazienteId, p?.aperto],
  )

  const etaCalcolata = useMemo(() => calculateEtaAnni(p?.data_nascita ?? undefined), [p?.data_nascita])

  const manifestCore = useManifestazioneListeCliniche(p?.id_manifestazione)

  const manReport = useManifestazioneDoc(p?.id_manifestazione || undefined)
  const pmaIdForReport =
    (p?.id_pma && p.id_pma.trim() !== '' ? p.id_pma : pmaRouteId ? decodeURIComponent(pmaRouteId) : '') ||
    undefined
  const pmaReport = usePmaDocSnapshot(pmaIdForReport)

  const tabs = useMemo(() => {
    if (!p) return schedaPazienteTabsFor({ dimissione_esito: null })
    return schedaPazienteTabsFor(p)
  }, [p])

  const writeInvioPs = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!db || !p || p.dimissione_esito !== 'invio_ps') return
      setSaveError(null)
      try {
        await updateSchedaPazienteGranular(db, pazienteId, patch)
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
      }
    },
    [pazienteId, p],
  )

  useEffect(() => {
    if (!p) return
    if (activeTab === 'invio_ps' && p.dimissione_esito !== 'invio_ps') {
      setActiveTab('dimissione')
    }
  }, [p, activeTab])

  useEffect(() => {
    tabFromUrlApplied.current = null
  }, [pazienteId])

  useEffect(() => {
    if (!p) return
    if (tabFromUrlApplied.current === p.id) return
    const raw = searchParams.get('tab')?.trim().toLowerCase()
    if (!raw) return
    const allowed: SchedaPazienteTabId[] = ['generale', 'anagrafica', 'cartella', 'dimissione', 'invio_ps']
    if (!allowed.includes(raw as SchedaPazienteTabId)) return
    const nextTab = raw as SchedaPazienteTabId
    if (nextTab === 'invio_ps' && p.dimissione_esito !== 'invio_ps') {
      tabFromUrlApplied.current = p.id
      const next = new URLSearchParams(searchParams)
      next.delete('tab')
      setSearchParams(next, { replace: true })
      return
    }
    setActiveTab(nextTab)
    tabFromUrlApplied.current = p.id
    const next = new URLSearchParams(searchParams)
    next.delete('tab')
    setSearchParams(next, { replace: true })
  }, [p, pazienteId, searchParams, setSearchParams])

  useEffect(() => {
    if (!p) return
    setDataNascitaDraft(toYmd(p.data_nascita))
    setContact({ email: p.email, telefono: p.telefono })
  }, [p?.id, p?.data_nascita?.toMillis?.(), p?.email, p?.telefono])

  const isInfermiere = user?.rank === 'Infermiere'
  const isMedicoRank = user?.rank === 'Medico'

  useEffect(() => {
    if (!db || !p?.aperto || !user) return
    const ref = staffSoftRefFromUser(user)
    if (!ref) return
    const patch: Record<string, unknown> = {}
    if (isInfermiere && !p.infermiere_rif.trim()) patch.infermiere_rif = ref
    if (isMedicoRank && !p.medico_rif.trim()) patch.medico_rif = ref
    if (Object.keys(patch).length === 0) return

    let cancelled = false
    void (async () => {
      try {
        await updateSchedaPazienteGranular(db, pazienteId, patch)
      } catch (e) {
        if (!cancelled) {
          setSaveError(e instanceof Error ? e.message : 'Aggiornamento riferimento non riuscito.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    pazienteId,
    p?.id,
    p?.aperto,
    p?.infermiere_rif,
    p?.medico_rif,
    user,
    isInfermiere,
    isMedicoRank,
  ])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-slate-600">
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900"
          aria-hidden
        />
        Caricamento scheda paziente…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
        {error}
      </div>
    )
  }

  if (!exists || !p) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Paziente non trovato.
      </div>
    )
  }

  async function onStatoChange(next: PazienteStato) {
    if (next === 'dimesso' && !isMedico) return
    await write({ stato: next })
  }

  async function onTipoChange(next: TipoPaziente) {
    if (next === 'autopresentato') {
      await write({
        tipo_paziente: next,
        eta_pma_minuti: null,
        eta_pma_deadline: null,
      })
      return
    }
    await write({ tipo_paziente: next })
  }

  return (
    <div className="w-full min-w-0 pb-8">
      <DettaglioPaziente
        p={p}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        saveError={
          saveError ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {saveError}
            </div>
          ) : null
        }
        panels={{
          generale: (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span
                  className={
                    p.aperto
                      ? 'rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-900 ring-1 ring-emerald-600/20'
                      : 'rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700 ring-1 ring-slate-600/15'
                  }
                >
                  {p.aperto ? 'Scheda aperta' : 'Scheda chiusa'}
                </span>
                <span aria-hidden>·</span>
                <span>
                  ID interno: <code className="rounded bg-slate-100 px-1 font-mono">{p.id}</code>
                </span>
                {p.id_manifestazione ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      Manifestazione:{' '}
                      <code className="rounded bg-slate-100 px-1 font-mono">{p.id_manifestazione}</code>
                    </span>
                  </>
                ) : null}
              </div>
              {!p.aperto ? (
                <p className="text-sm text-amber-800">Scheda in sola lettura (chiusa).</p>
              ) : null}

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Sezione 1 — Dati generali
                </h2>
                <p className="mt-2 text-xs text-slate-500">
                  Riferimenti infermiere/medico: valorizzati automaticamente al primo accesso (scheda aperta) dal
                  profilo; non modificano i permessi di modifica.
                </p>
                <dl className="mt-3 grid gap-3 rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Infermiere di riferimento</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                      {p.infermiere_rif.trim() || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Medico di riferimento</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                      {p.medico_rif.trim() || '—'}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">Apertura scheda</span>
                    <input
                      type="datetime-local"
                      disabled={!canEdit}
                      value={toDatetimeLocal(p.apertura_scheda)}
                      onChange={(e) => {
                        const ts = datetimeLocalToTimestamp(e.target.value)
                        if (ts) void write({ apertura_scheda: ts })
                      }}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Tipo paziente</span>
                    <select
                      disabled={!canEdit}
                      value={p.tipo_paziente}
                      onChange={(e) => void onTipoChange(e.target.value as TipoPaziente)}
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                    >
                      {TIPI.map((t) => (
                        <option key={t} value={t}>
                          {TIPO_PAZIENTE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">Codice colore</span>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Codice colore">
                      {CODICI_UI.map((c) => {
                        const selected = p.codice_colore === c
                        return (
                          <button
                            key={c}
                            type="button"
                            disabled={!canEdit}
                            aria-pressed={selected}
                            onClick={() => void write({ codice_colore: c })}
                            className={codiceColoreBtnClass(c, selected)}
                          >
                            {CODICE_COLORE_LABEL[c]}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {manifestCore.tipoEventoList.length > 0 ? (
                    <>
                      <label className="block text-sm sm:col-span-2">
                        <span className="font-medium text-slate-700">Tipo evento</span>
                        <select
                          disabled={!canEdit}
                          value={p.tipo_evento}
                          onChange={(e) => {
                            const v = e.target.value
                            void write({ tipo_evento: v, dettaglio_evento: '' })
                          }}
                          className="mt-1 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                        >
                          <option value="">— Seleziona —</option>
                          {manifestCore.tipoEventoList.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm sm:col-span-2">
                        <span className="font-medium text-slate-700">Dettaglio evento</span>
                        <select
                          disabled={!canEdit}
                          value={p.dettaglio_evento}
                          onChange={(e) => void write({ dettaglio_evento: e.target.value })}
                          className="mt-1 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                        >
                          <option value="">— Seleziona —</option>
                          {(manifestCore.dettaglioEventoPerTipo[p.tipo_evento] ?? []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="block text-sm sm:col-span-2">
                        <span className="font-medium text-slate-700">Tipo evento</span>
                        <input
                          key={`te-${p.id}-${p.tipo_evento}`}
                          type="text"
                          disabled={!canEdit}
                          defaultValue={p.tipo_evento}
                          onBlur={(e) => void write({ tipo_evento: e.target.value })}
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                        />
                      </label>
                      <label className="block text-sm sm:col-span-2">
                        <span className="font-medium text-slate-700">Dettaglio evento</span>
                        <input
                          key={`de-${p.id}-${p.dettaglio_evento}`}
                          type="text"
                          disabled={!canEdit}
                          defaultValue={p.dettaglio_evento}
                          onBlur={(e) => void write({ dettaglio_evento: e.target.value })}
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                        />
                      </label>
                    </>
                  )}

                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">Breve descrizione</span>
                    <textarea
                      key={`breve-${p.id}-${p.breve_descrizione}`}
                      disabled={!canEdit}
                      rows={3}
                      defaultValue={p.breve_descrizione}
                      onBlur={(e) => void write({ breve_descrizione: e.target.value })}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </label>

                  {showCentraleFields ? (
                    <>
                      <label className="block text-sm sm:col-span-2">
                        <span className="font-medium text-slate-700">Trasportato da</span>
                        <input
                          key={`tda-${p.id}-${p.trasportato_da ?? ''}`}
                          type="text"
                          disabled={!canEdit}
                          defaultValue={p.trasportato_da ?? ''}
                          onBlur={(e) =>
                            void write({
                              trasportato_da:
                                e.target.value.trim() === '' ? null : e.target.value.trim(),
                            })
                          }
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                        />
                      </label>
                      <label className="block text-sm sm:col-span-2">
                        <span className="font-medium text-slate-700">Note centrale</span>
                        <input
                          key={`nc-${p.id}-${p.note_centrale ?? ''}`}
                          type="text"
                          disabled={!canEdit}
                          defaultValue={p.note_centrale ?? ''}
                          onBlur={(e) =>
                            void write({
                              note_centrale:
                                e.target.value.trim() === '' ? null : e.target.value.trim(),
                            })
                          }
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                        />
                      </label>
                    </>
                  ) : null}

                  {showEtaPma ? (
                    <div className="sm:col-span-2">
                      <label className="block text-sm">
                        <span className="font-medium text-slate-700">ETA PMA (minuti da ora)</span>
                        <input
                          key={`eta-${p.id}-${p.eta_pma_minuti ?? 'x'}-${p.eta_pma_deadline?.toMillis?.() ?? 0}`}
                          type="number"
                          min={0}
                          step={1}
                          disabled={!canEdit}
                          defaultValue={p.eta_pma_minuti ?? ''}
                          onBlur={(e) => {
                            const raw = e.target.value.trim()
                            if (raw === '') {
                              void write({ eta_pma_minuti: null, eta_pma_deadline: null })
                              return
                            }
                            const n = Number(raw)
                            if (!Number.isFinite(n) || n < 0) return
                            const deadline = Timestamp.fromMillis(Date.now() + n * 60_000)
                            void write({ eta_pma_minuti: Math.floor(n), eta_pma_deadline: deadline })
                          }}
                          className="mt-1 w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                        />
                      </label>
                      <p className="mt-1 text-xs text-slate-500">
                        Conferma i minuti uscendo dal campo: viene salvata la scadenza rispetto all’ora
                        corrente.
                      </p>
                      <EtaPmaCountdown deadline={p.eta_pma_deadline} />
                    </div>
                  ) : null}

                  <div className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">Stato</span>
                    {!isMedico && p.stato !== 'dimesso' ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Solo un utente con ruolo Medico può impostare lo stato &quot;Dimesso&quot;.
                      </p>
                    ) : null}
                    <div
                      className="mt-2 flex flex-wrap gap-2"
                      role="group"
                      aria-label="Stato paziente"
                    >
                      {STATI_UI.map((s) => {
                        const allowed = statiSelezionabili(isMedico, p.stato)
                        const canPick = allowed.includes(s)
                        const selected = p.stato === s
                        const disabled =
                          !canEdit ||
                          (!isMedico && p.stato === 'dimesso') ||
                          (!canPick && !selected)
                        return (
                          <button
                            key={s}
                            type="button"
                            disabled={disabled}
                            aria-pressed={selected}
                            onClick={() => void onStatoChange(s)}
                            className={statoBtnClass(s, selected)}
                          >
                            {PAZIENTE_STATO_LABEL[s]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ),
          anagrafica: (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Sezione 2 — Dati anagrafici
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Pettorale</span>
                  <input
                    key={`pet-${p.id}-${p.pettorale ?? 'x'}`}
                    type="number"
                    min={0}
                    disabled={!canEdit}
                    defaultValue={p.pettorale ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (v === '') {
                        void write({ pettorale: null })
                        return
                      }
                      const n = Number(v)
                      if (Number.isFinite(n)) void write({ pettorale: Math.floor(n) })
                    }}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </label>
                <div className="text-sm">
                  <span className="font-medium text-slate-700">Età</span>
                  <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900">
                    {etaCalcolata !== null
                      ? `${etaCalcolata} anni`
                      : p.eta !== null && p.eta !== undefined
                        ? `${p.eta} anni`
                        : '—'}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Calcolata dalla data di nascita.</p>
                </div>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Nome</span>
                  <input
                    key={`nome-${p.id}-${p.nome}`}
                    type="text"
                    disabled={!canEdit}
                    defaultValue={p.nome}
                    onBlur={(e) => void write({ nome: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Cognome</span>
                  <input
                    key={`cog-${p.id}-${p.cognome}`}
                    type="text"
                    disabled={!canEdit}
                    defaultValue={p.cognome}
                    onBlur={(e) => void write({ cognome: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Data di nascita</span>
                  <input
                    type="date"
                    disabled={!canEdit}
                    value={dataNascitaDraft}
                    onChange={(e) => setDataNascitaDraft(e.target.value)}
                    onBlur={() => {
                      const v = dataNascitaDraft.trim()
                      if (!v) {
                        void write({ data_nascita: null, eta: null })
                        return
                      }
                      const ts = ymdToTimestamp(v)
                      if (!ts) {
                        setDataNascitaDraft(toYmd(p.data_nascita))
                        return
                      }
                      void write({ data_nascita: ts, ...patchEtaFromDataNascita(ts) })
                    }}
                    className="mt-1 w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    disabled={!canEdit}
                    value={contact.email}
                    onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                    onBlur={() =>
                      void write({
                        email: contact.email.trim(),
                        telefono: contact.telefono.trim(),
                        email_tel: emailTelLegacy(contact.email, contact.telefono),
                      })
                    }
                    autoComplete="email"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Telefono</span>
                  <input
                    type="tel"
                    disabled={!canEdit}
                    value={contact.telefono}
                    onChange={(e) => setContact((c) => ({ ...c, telefono: e.target.value }))}
                    onBlur={() =>
                      void write({
                        email: contact.email.trim(),
                        telefono: contact.telefono.trim(),
                        email_tel: emailTelLegacy(contact.email, contact.telefono),
                      })
                    }
                    autoComplete="tel"
                    placeholder="+39 …"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </label>
              </div>
            </section>
          ),
          cartella: (
            <CartellaClinicaSection
              embedded
              pazienteId={pazienteId}
              p={p}
              canEdit={Boolean(canEdit)}
              write={write}
              user={user}
            />
          ),
          dimissione: (
            <DimissioneSection
              p={p}
              user={user}
              isMedico={isMedico}
              canEditScheda={Boolean(canEdit)}
              write={write}
              reportManifestazioneNome={manReport.data?.nome ?? ''}
              reportPmaNome={pmaReport.nome ?? ''}
            />
          ),
          invio_ps: (
            <InvioOspedaleSection
              p={p}
              writeInvio={writeInvioPs}
            />
          ),
        }}
      />
    </div>
  )
}
