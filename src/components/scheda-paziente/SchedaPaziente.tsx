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
import { SchedaPazienteShell } from '../pma/SchedaPazienteShell'

type Props = {
  pazienteId: string
}

/** Ordine UI v4: Bianco → Verde → Giallo → Rosso */
const CODICI_UI: CodiceColorePaziente[] = ['bianco', 'verde', 'giallo', 'rosso']
const TIPI: TipoPaziente[] = ['trasportato', 'autopresentato']

const STATI_UI: PazienteStato[] = ['in_arrivo', 'in_attesa', 'in_carico', 'errore', 'dimesso']

function statoManagerClass(_s: PazienteStato, selected: boolean): string {
  const base =
    'min-h-10 min-w-[7.5rem] flex-1 rounded-md border px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide transition disabled:opacity-40'
  if (selected) return `${base} border-[#111827] bg-[#111827] text-white`
  return `${base} border-slate-200 bg-white text-[#111827] hover:border-slate-300 hover:bg-slate-50`
}

function codiceColoreManagerClass(c: CodiceColorePaziente, selected: boolean): string {
  const base =
    'min-h-[4.5rem] flex-1 rounded-lg border-2 px-3 py-4 text-center text-sm font-bold transition disabled:opacity-40'
  const off: Record<CodiceColorePaziente, string> = {
    bianco: 'border-slate-200 bg-slate-50 text-[#111827]',
    verde: 'border-emerald-200 bg-emerald-50 text-[#111827]',
    giallo: 'border-amber-200 bg-amber-50 text-[#111827]',
    rosso: 'border-red-200 bg-red-50 text-[#111827]',
  }
  if (selected) return `${base} border-[#111827] bg-white text-[#111827] shadow-[inset_0_0_0_1px_#111827]`
  return `${base} ${off[c]}`
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
  const { user, logout } = useAuth()
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

  if (!user) {
    return null
  }

  const pmaShellId = pmaRouteId ? decodeURIComponent(pmaRouteId) : user.id_pma?.trim() ?? ''
  const manShellId = p?.id_manifestazione?.trim() ?? user.id_manifestazione?.trim() ?? ''
  const visShell = p?.id_paziente_visibile ?? pazienteId

  if (loading) {
    return (
      <SchedaPazienteShell
        user={user}
        logout={logout}
        pmaId={pmaShellId || '—'}
        manifestazioneId={manShellId}
        pazienteIdVisibile={pazienteId}
      >
        <div className="flex items-center gap-3 px-8 py-20 text-[13px] text-slate-600">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[#111827]"
            aria-hidden
          />
          Caricamento scheda paziente…
        </div>
      </SchedaPazienteShell>
    )
  }

  if (error) {
    return (
      <SchedaPazienteShell
        user={user}
        logout={logout}
        pmaId={pmaShellId || '—'}
        manifestazioneId={manShellId}
        pazienteIdVisibile={pazienteId}
      >
        <div className="border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-800" role="alert">
          {error}
        </div>
      </SchedaPazienteShell>
    )
  }

  if (!exists || !p) {
    return (
      <SchedaPazienteShell
        user={user}
        logout={logout}
        pmaId={pmaShellId || '—'}
        manifestazioneId={manShellId}
        pazienteIdVisibile={pazienteId}
      >
        <div className="border border-slate-200 bg-white px-6 py-4 text-sm text-slate-700">
          Paziente non trovato.
        </div>
      </SchedaPazienteShell>
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

  const pmaIdForShell = p.id_pma?.trim() || pmaShellId || '—'
  const manIdForShell = p.id_manifestazione?.trim() || manShellId || ''

  return (
    <SchedaPazienteShell
      user={user}
      logout={logout}
      pmaId={pmaIdForShell}
      manifestazioneId={manIdForShell}
      pazienteIdVisibile={visShell}
    >
      <div className="w-full min-w-0 px-6 pb-12 pt-6 sm:px-10">
        <DettaglioPaziente
        p={p}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        saveError={
          saveError ? (
            <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800" role="alert">
              {saveError}
            </div>
          ) : null
        }
        panels={{
          generale: (
            <div className="space-y-8">
              {!p.aperto ? (
                <p className="text-[13px] text-slate-600">Scheda in sola lettura (chiusa).</p>
              ) : null}

              <section className="rounded-lg border border-slate-200 bg-white px-6 py-8 sm:px-10">
                <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#111827]">
                  Sezione 1 — Dati generali
                </h2>

                <dl className="mt-10 grid gap-10 border-b border-slate-200 pb-10 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Infermiere di riferimento
                    </dt>
                    <dd className="mt-2 text-sm font-semibold text-[#111827]">
                      {p.infermiere_rif.trim() || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Medico di riferimento
                    </dt>
                    <dd className="mt-2 text-sm font-semibold text-[#111827]">
                      {p.medico_rif.trim() || '—'}
                    </dd>
                  </div>
                </dl>
                <div className="mt-10 grid gap-8 sm:grid-cols-2">
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Apertura scheda
                    </span>
                    <input
                      type="datetime-local"
                      disabled={!canEdit}
                      value={toDatetimeLocal(p.apertura_scheda)}
                      onChange={(e) => {
                        const ts = datetimeLocalToTimestamp(e.target.value)
                        if (ts) void write({ apertura_scheda: ts })
                      }}
                      className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Tipo paziente
                    </span>
                    <select
                      disabled={!canEdit}
                      value={p.tipo_paziente}
                      onChange={(e) => void onTipoChange(e.target.value as TipoPaziente)}
                      className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                    >
                      {TIPI.map((t) => (
                        <option key={t} value={t}>
                          {TIPO_PAZIENTE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="block text-sm sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Codice colore
                    </span>
                    <div className="mt-6 flex flex-wrap gap-4" role="group" aria-label="Codice colore">
                      {CODICI_UI.map((c) => {
                        const selected = p.codice_colore === c
                        return (
                          <button
                            key={c}
                            type="button"
                            disabled={!canEdit}
                            aria-pressed={selected}
                            onClick={() => void write({ codice_colore: c })}
                            className={codiceColoreManagerClass(c, selected)}
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
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Tipo evento
                        </span>
                        <select
                          disabled={!canEdit}
                          value={p.tipo_evento}
                          onChange={(e) => {
                            const v = e.target.value
                            void write({ tipo_evento: v, dettaglio_evento: '' })
                          }}
                          className="mt-2 w-full max-w-xl rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
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
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Dettaglio evento
                        </span>
                        <select
                          disabled={!canEdit}
                          value={p.dettaglio_evento}
                          onChange={(e) => void write({ dettaglio_evento: e.target.value })}
                          className="mt-2 w-full max-w-xl rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
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
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Tipo evento
                        </span>
                        <input
                          key={`te-${p.id}-${p.tipo_evento}`}
                          type="text"
                          disabled={!canEdit}
                          defaultValue={p.tipo_evento}
                          onBlur={(e) => void write({ tipo_evento: e.target.value })}
                          className="mt-2 w-full max-w-xl rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                        />
                      </label>
                      <label className="block text-sm sm:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Dettaglio evento
                        </span>
                        <input
                          key={`de-${p.id}-${p.dettaglio_evento}`}
                          type="text"
                          disabled={!canEdit}
                          defaultValue={p.dettaglio_evento}
                          onBlur={(e) => void write({ dettaglio_evento: e.target.value })}
                          className="mt-2 w-full max-w-xl rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                        />
                      </label>
                    </>
                  )}

                  <label className="block text-sm sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Breve descrizione
                    </span>
                    <textarea
                      key={`breve-${p.id}-${p.breve_descrizione}`}
                      disabled={!canEdit}
                      rows={4}
                      defaultValue={p.breve_descrizione}
                      onBlur={(e) => void write({ breve_descrizione: e.target.value })}
                      className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                    />
                  </label>

                  {showCentraleFields ? (
                    <>
                      <label className="block text-sm sm:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Trasportato da
                        </span>
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
                          className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                        />
                      </label>
                      <label className="block text-sm sm:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Note centrale
                        </span>
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
                          className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                        />
                      </label>
                    </>
                  ) : null}

                  {showEtaPma ? (
                    <div className="sm:col-span-2">
                      <label className="block text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          ETA PMA (minuti da ora)
                        </span>
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
                          className="mt-2 w-full max-w-xs rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                        />
                      </label>
                      <p className="mt-2 text-xs text-slate-600">
                        Conferma i minuti uscendo dal campo: viene salvata la scadenza rispetto all&apos;ora
                        corrente.
                      </p>
                      <EtaPmaCountdown deadline={p.eta_pma_deadline} />
                    </div>
                  ) : null}

                  <div className="block text-sm sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Stato</span>
                    {!isMedico && p.stato !== 'dimesso' ? (
                      <p className="mt-2 text-xs text-slate-600">
                        Solo un utente con ruolo Medico può impostare lo stato &quot;Dimesso&quot;.
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3" role="group" aria-label="Stato paziente">
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
                            className={statoManagerClass(s, selected)}
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
            <section className="rounded-lg border border-slate-200 bg-white px-6 py-8 sm:px-10">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#111827]">
                Sezione 2 — Dati anagrafici
              </h2>
              <div className="mt-10 grid gap-8 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Pettorale</span>
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
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                  />
                </label>
                <div className="text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Età</span>
                  <div className="mt-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-[#111827]">
                    {etaCalcolata !== null
                      ? `${etaCalcolata} anni`
                      : p.eta !== null && p.eta !== undefined
                        ? `${p.eta} anni`
                        : '—'}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">Calcolata dalla data di nascita.</p>
                </div>
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Nome</span>
                  <input
                    key={`nome-${p.id}-${p.nome}`}
                    type="text"
                    disabled={!canEdit}
                    defaultValue={p.nome}
                    onBlur={(e) => void write({ nome: e.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Cognome</span>
                  <input
                    key={`cog-${p.id}-${p.cognome}`}
                    type="text"
                    disabled={!canEdit}
                    defaultValue={p.cognome}
                    onBlur={(e) => void write({ cognome: e.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Data di nascita
                  </span>
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
                    className="mt-2 w-full max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Email</span>
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
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Telefono</span>
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
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-[#111827] focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
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
    </SchedaPazienteShell>
  )
}
