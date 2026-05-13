import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
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
import {
  canWriteInvioPsFields,
  schedaStatoInArrivoAllows,
  schedaTabDimissioneAllows,
} from '../../lib/rankMatrix'
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
import { usePmaListForManifestazione } from '../../hooks/usePmaListForManifestazione'
import { createPmaAlert } from '../../lib/createPmaAlert'
import { SchedaPazienteShell } from '../pma/SchedaPazienteShell'

type Props = {
  pazienteId: string
}

/** Ordine UI v4: Bianco → Verde → Giallo → Rosso */
const CODICI_UI: CodiceColorePaziente[] = ['bianco', 'verde', 'giallo', 'rosso']
const TIPI: TipoPaziente[] = ['trasportato', 'autopresentato']

const STATI_UI: PazienteStato[] = ['in_arrivo', 'in_attesa', 'in_carico', 'in_sospeso']

function pillCodiceColore(c: CodiceColorePaziente, on: boolean): string {
  if (c === 'bianco') return `pma-pill ${on ? 'pma-pill--bianco-on' : 'pma-pill--bianco-off'}`
  if (c === 'verde') return `pma-pill ${on ? 'pma-pill--verde-on' : 'pma-pill--verde-off'}`
  if (c === 'giallo') return `pma-pill ${on ? 'pma-pill--giallo-on' : 'pma-pill--giallo-off'}`
  return `pma-pill ${on ? 'pma-pill--rosso-on' : 'pma-pill--rosso-off'}`
}

function pillStato(on: boolean): string {
  return `pma-pill ${on ? 'pma-pill--stato-on' : 'pma-pill--stato-off'}`
}

function emailTelLegacy(email: string, telefono: string): string {
  const e = email.trim()
  const t = telefono.trim()
  if (e && t) return `${e} · ${t}`
  return e || t
}

function statiSelezionabili(canSelectInArrivo: boolean, statoCorrente: PazienteStato): PazienteStato[] {
  const mid: PazienteStato[] = ['in_attesa', 'in_carico', 'in_sospeso']
  return canSelectInArrivo || statoCorrente === 'in_arrivo' ? ['in_arrivo', ...mid] : [...mid]
}

export function SchedaPaziente({ pazienteId }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { id: pmaRouteId } = useParams<{ id: string }>()
  const { data: p, loading, error, exists } = usePazienteDoc(pazienteId)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrlApplied = useRef<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SchedaPazienteTabId>('generale')
  const [dataNascitaDraft, setDataNascitaDraft] = useState('')
  const [contact, setContact] = useState({ email: '', telefono: '' })
  const [allertaBusy, setAllertaBusy] = useState(false)
  const [allertaErr, setAllertaErr] = useState<string | null>(null)

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
  const { items: pmaDestList, loading: pmaDestLoading } = usePmaListForManifestazione(
    p?.id_manifestazione?.trim() || undefined,
  )

  const inviaAllertaPma = useCallback(async () => {
    if (!db || !user || user.rank !== 'Centrale' || !p) return
    const idPma = (p.id_pma ?? '').trim()
    if (!idPma) {
      setAllertaErr('Seleziona il PMA destinazione.')
      return
    }
    setAllertaBusy(true)
    setAllertaErr(null)
    try {
      const nomeLine = [p.cognome, p.nome].filter(Boolean).join(' ').trim()
      await createPmaAlert(db, {
        idPma,
        idManifestazione: p.id_manifestazione,
        pazienteId: p.id,
        idPazienteVisibile: p.id_paziente_visibile,
        messaggio: `Allerta Centrale — ${p.id_paziente_visibile}${nomeLine ? ` (${nomeLine})` : ''}`,
        creatoDaUid: user.uid,
      })
    } catch (e) {
      setAllertaErr(e instanceof Error ? e.message : 'Invio allerta non riuscito.')
    } finally {
      setAllertaBusy(false)
    }
  }, [user, p])

  /** Allinea ai primi valori delle liste manifestazione (stesso ordine salvato in IMP). */
  useEffect(() => {
    if (!db || !p?.aperto || !canEdit) return
    if (manifestCore.loading) return
    const tipi = manifestCore.tipoEventoList
    if (tipi.length === 0) return

    const tipoDb = p.tipo_evento?.trim() ?? ''
    const detDb = p.dettaglio_evento?.trim() ?? ''

    if (!tipoDb) {
      const t0 = tipi[0]
      const det0 = (manifestCore.dettaglioEventoPerTipo[t0] ?? [])[0] ?? ''
      void write({ tipo_evento: t0, dettaglio_evento: det0 })
      return
    }

    if (!tipi.includes(tipoDb)) return

    const opts = manifestCore.dettaglioEventoPerTipo[tipoDb] ?? []
    if (opts.length === 0) return

    if (detDb) {
      if (!opts.includes(detDb)) {
        void write({ dettaglio_evento: opts[0] })
      }
      return
    }

    void write({ dettaglio_evento: opts[0] })
  }, [
    db,
    p?.aperto,
    p?.id,
    p?.tipo_evento,
    p?.dettaglio_evento,
    canEdit,
    manifestCore.loading,
    manifestCore.tipoEventoList,
    manifestCore.dettaglioEventoPerTipo,
    write,
  ])

  useEffect(() => {
    if (!db || !p?.aperto || !canEdit || !isCentrale || pmaDestLoading) return
    if (pmaDestList.length !== 1) return
    if ((p.id_pma ?? '').trim() !== '') return
    void write({ id_pma: pmaDestList[0].id })
  }, [db, p?.aperto, p?.id, p?.id_pma, canEdit, isCentrale, pmaDestLoading, pmaDestList, write])

  const manReport = useManifestazioneDoc(p?.id_manifestazione || undefined)
  const pmaIdForReport =
    (p?.id_pma && p.id_pma.trim() !== '' ? p.id_pma : pmaRouteId ? decodeURIComponent(pmaRouteId) : '') ||
    undefined
  const pmaReport = usePmaDocSnapshot(pmaIdForReport)

  const rankForTabs = user?.rank ?? 'Soccorritore'

  const tabs = useMemo(() => {
    if (!p) return schedaPazienteTabsFor({ dimissione_esito: null }, rankForTabs)
    return schedaPazienteTabsFor(p, rankForTabs)
  }, [p, rankForTabs])

  const writeInvioPs = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!db || !p || p.dimissione_esito !== 'invio_ps' || !user) return
      if (!canWriteInvioPsFields(user.rank, p.aperto)) return
      setSaveError(null)
      try {
        await updateSchedaPazienteGranular(db, pazienteId, patch)
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
      }
    },
    [pazienteId, p, user],
  )

  useEffect(() => {
    if (!p) return
    if (activeTab === 'invio_ps' && p.dimissione_esito !== 'invio_ps') {
      setActiveTab('dimissione')
    }
  }, [p, activeTab])

  useEffect(() => {
    if (tabs.some((t) => t.id === activeTab)) return
    setActiveTab(tabs[0]?.id ?? 'generale')
  }, [tabs, activeTab])

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
        <div className="flex items-center gap-3 px-8 py-20 text-sm text-slate-600">
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
    if (!user) return
    if (next === 'dimesso') return
    if (next === 'in_arrivo' && !schedaStatoInArrivoAllows(user.rank)) return
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

  const canEditDimissioneTab = schedaTabDimissioneAllows(user.rank, 'UPDATE')
  const canSetStatoInArrivo = schedaStatoInArrivoAllows(user.rank)
  const invioPsReadOnly = !canWriteInvioPsFields(user.rank, p.aperto)

  return (
    <SchedaPazienteShell
      user={user}
      logout={logout}
      pmaId={pmaIdForShell}
      manifestazioneId={manIdForShell}
      pazienteIdVisibile={visShell}
    >
      <div className="w-full min-w-0 px-3 pb-6 pt-3 sm:px-5">
        <DettaglioPaziente
        p={p}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        saveError={
          saveError ? (
            <div className="mb-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {saveError}
            </div>
          ) : null
        }
        panels={{
          generale: (
            <div className="space-y-4">
              {!p.aperto ? (
                <p className="text-sm text-slate-600">Scheda in sola lettura (chiusa).</p>
              ) : null}

              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="pma-section-hdr">Sezione 1 — Dati generali</div>

                <div className="pma-row pma-row--2 border-b border-slate-200">
                  <div className="pma-field pma-field--br">
                    <span className="pma-field__label">Infermiere di riferimento</span>
                    <span
                      className={`pma-field__value${!p.infermiere_rif.trim() ? ' pma-field__value--muted' : ''}`}
                    >
                      {p.infermiere_rif.trim() || '—'}
                    </span>
                  </div>
                  <div className="pma-field">
                    <span className="pma-field__label">Medico di riferimento</span>
                    <span className={`pma-field__value${!p.medico_rif.trim() ? ' pma-field__value--muted' : ''}`}>
                      {p.medico_rif.trim() || '—'}
                    </span>
                  </div>
                </div>
                {p.ripreso_in_carico_at && typeof p.ripreso_in_carico_at.toDate === 'function' ? (
                  <div className="pma-row border-b border-slate-200">
                    <div className="pma-field">
                      <span className="pma-field__label">Ripreso in carico</span>
                      <span className="pma-field__value">
                        {p.ripreso_in_carico_at.toDate().toLocaleString('it-IT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ) : null}
                <div className="pma-row">
                  <label className="pma-field">
                    <span className="pma-field__label">Apertura scheda</span>
                    <input
                      type="datetime-local"
                      disabled={!canEdit}
                      value={toDatetimeLocal(p.apertura_scheda)}
                      onChange={(e) => {
                        const ts = datetimeLocalToTimestamp(e.target.value)
                        if (ts) void write({ apertura_scheda: ts })
                      }}
                    />
                  </label>
                </div>
                <div className="pma-row">
                  <label className="pma-field">
                    <span className="pma-field__label">Tipo paziente</span>
                    <select
                      disabled={!canEdit}
                      value={p.tipo_paziente}
                      onChange={(e) => void onTipoChange(e.target.value as TipoPaziente)}
                    >
                      {TIPI.map((t) => (
                        <option key={t} value={t}>
                          {TIPO_PAZIENTE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="pma-row">
                    <div className="pma-field">
                      <span className="pma-field__label">Codice colore</span>
                      <div className="pma-pills pma-pills--grid" role="group" aria-label="Codice colore">
                      {CODICI_UI.map((c) => {
                        const selected = p.codice_colore === c
                        return (
                          <button
                            key={c}
                            type="button"
                            disabled={!canEdit}
                            aria-pressed={selected}
                            onClick={() => void write({ codice_colore: c })}
                            className={`${pillCodiceColore(c, selected)} ${!canEdit ? 'opacity-40' : ''}`}
                          >
                            {CODICE_COLORE_LABEL[c]}
                          </button>
                        )
                      })}
                    </div>
                    </div>
                  </div>

                  {manifestCore.tipoEventoList.length > 0 ? (
                    <div className="pma-row pma-row--1-1-2">
                      <label className="pma-field pma-field--br">
                        <span className="pma-field__label">Tipo evento</span>
                        <select
                          disabled={!canEdit}
                          value={p.tipo_evento}
                          onChange={(e) => {
                            const v = e.target.value
                            const opts = manifestCore.dettaglioEventoPerTipo[v] ?? []
                            void write({ tipo_evento: v, dettaglio_evento: opts[0] ?? '' })
                          }}
                        >
                          <option value="">— Seleziona —</option>
                          {manifestCore.tipoEventoList.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="pma-field">
                        <span className="pma-field__label">Dettaglio evento</span>
                        <select
                          disabled={!canEdit}
                          value={p.dettaglio_evento}
                          onChange={(e) => void write({ dettaglio_evento: e.target.value })}
                        >
                          <option value="">— Seleziona —</option>
                          {(manifestCore.dettaglioEventoPerTipo[p.tipo_evento] ?? []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <div className="pma-row pma-row--1-1-2">
                      <label className="pma-field pma-field--br">
                        <span className="pma-field__label">Tipo evento</span>
                        <input
                          key={`te-${p.id}-${p.tipo_evento}`}
                          type="text"
                          disabled={!canEdit}
                          defaultValue={p.tipo_evento}
                          onBlur={(e) => void write({ tipo_evento: e.target.value })}
                        />
                      </label>
                      <label className="pma-field">
                        <span className="pma-field__label">Dettaglio evento</span>
                        <input
                          key={`de-${p.id}-${p.dettaglio_evento}`}
                          type="text"
                          disabled={!canEdit}
                          defaultValue={p.dettaglio_evento}
                          onBlur={(e) => void write({ dettaglio_evento: e.target.value })}
                        />
                      </label>
                    </div>
                  )}

                  <div className="pma-row">
                    <label className="pma-field">
                      <span className="pma-field__label">Breve descrizione</span>
                      <textarea
                        key={`breve-${p.id}-${p.breve_descrizione}`}
                        disabled={!canEdit}
                        rows={4}
                        defaultValue={p.breve_descrizione}
                        onBlur={(e) => void write({ breve_descrizione: e.target.value })}
                      />
                    </label>
                  </div>

                  {showCentraleFields ? (
                    <>
                      <div className="pma-row">
                        <label className="pma-field">
                          <span className="pma-field__label">Trasportato da</span>
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
                          />
                        </label>
                      </div>
                      <div className="pma-row">
                        <label className="pma-field">
                          <span className="pma-field__label">Note centrale</span>
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
                          />
                        </label>
                      </div>
                      <div className="pma-row">
                        <label className="pma-field">
                          <span className="pma-field__label">PMA destinazione</span>
                          <select
                            disabled={!canEdit || pmaDestLoading || pmaDestList.length === 0}
                            value={(p.id_pma ?? '').trim()}
                            onChange={(e) => {
                              const v = e.target.value.trim()
                              void (async () => {
                                await write({ id_pma: v })
                                const routePma = pmaRouteId ? decodeURIComponent(pmaRouteId).trim() : ''
                                if (routePma && v && v !== routePma) {
                                  navigate(
                                    `/pma/${encodeURIComponent(v)}/paziente/${encodeURIComponent(pazienteId)}?tab=generale`,
                                    { replace: true },
                                  )
                                }
                              })()
                            }}
                          >
                          {pmaDestList.length > 1 && !(p.id_pma ?? '').trim() ? (
                            <option value="">— Seleziona PMA —</option>
                          ) : null}
                          {pmaDestList.length === 0 ? (
                            <option value="">— Nessun PMA —</option>
                          ) : (
                            pmaDestList.map((pm) => (
                              <option key={pm.id} value={pm.id}>
                                {pm.nome}
                              </option>
                            ))
                          )}
                        </select>
                        <p className="mt-1 text-xs pma-field__value--muted">
                          Il paziente risulta in questo PMA. Con un solo PMA sulla manifestazione viene impostato
                          automaticamente se mancante.
                        </p>
                        </label>
                      </div>
                    </>
                  ) : null}

                  {showEtaPma ? (
                    <div className="pma-row">
                      <label className="pma-field">
                        <span className="pma-field__label">ETA PMA (minuti da ora)</span>
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
                        />
                        <p className="mt-2 text-xs pma-field__value--muted">
                          Conferma i minuti uscendo dal campo: viene salvata la scadenza rispetto all&apos;ora
                          corrente.
                        </p>
                        <EtaPmaCountdown deadline={p.eta_pma_deadline} />
                      </label>
                    </div>
                  ) : null}

                  <div className="pma-row">
                    <div className="pma-field">
                    <span className="pma-field__label">Stato</span>
                    {p.stato === 'dimesso' ? (
                      <div className="mt-3">
                        <span className="pma-pill pma-pill--stato-off pointer-events-none text-sm font-bold uppercase tracking-wide">
                          {PAZIENTE_STATO_LABEL.dimesso}
                        </span>
                        <p className="mt-2 text-xs pma-field__value--muted">
                          Impostato solo tramite &quot;Dimetti paziente&quot; nella tab Dimissioni (Medico).
                        </p>
                      </div>
                    ) : (
                      <>
                        {!canSetStatoInArrivo && p.stato !== 'in_arrivo' ? (
                          <p className="mt-2 text-xs pma-field__value--muted">
                            Solo Centrale può impostare lo stato &quot;In arrivo&quot; dalla scheda.
                          </p>
                        ) : null}
                        <div className="pma-pills mt-3" role="group" aria-label="Stato paziente">
                          {STATI_UI.map((s) => {
                            const allowed = statiSelezionabili(canSetStatoInArrivo, p.stato)
                            const canPick = allowed.includes(s)
                            const selected = p.stato === s
                            const disabled = !canEdit || (!canPick && !selected)
                            return (
                              <button
                                key={s}
                                type="button"
                                disabled={disabled}
                                aria-pressed={selected}
                                onClick={() => void onStatoChange(s)}
                                className={`${pillStato(selected)} ${!canEdit || disabled ? 'opacity-40' : ''}`}
                              >
                                {PAZIENTE_STATO_LABEL[s]}
                              </button>
                            )
                          })}
                        </div>
                        {isCentrale && p.aperto ? (
                          <div className="mt-4 border-t border-slate-100 pt-4">
                            <button
                              type="button"
                              disabled={!db || allertaBusy || !(p.id_pma ?? '').trim()}
                              onClick={() => void inviaAllertaPma()}
                              className="inline-flex h-10 w-full max-w-md items-center justify-center rounded-lg border border-amber-400 bg-amber-100 px-4 text-sm font-bold uppercase text-amber-950 shadow-sm hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {allertaBusy ? 'Invio…' : 'Allerta PMA'}
                            </button>
                            {allertaErr ? (
                              <p className="mt-2 text-xs text-red-600" role="alert">
                                {allertaErr}
                              </p>
                            ) : (
                              <p className="mt-2 max-w-xl text-xs pma-field__value--muted">
                                Segnale in tempo reale verso il PMA destinazione (Firestore). Sul PMA compare un
                                avviso; se abiliti le notifiche del browser nella dashboard PMA, ricevi anche un
                                pop-up.
                              </p>
                            )}
                          </div>
                        ) : null}
                      </>
                    )}
                    </div>
                  </div>
              </section>
            </div>
          ),
          anagrafica: (
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="pma-section-hdr">Sezione 2 — Dati anagrafici</div>
              <div className="pma-row pma-row--2">
                <label className="pma-field pma-field--br">
                  <span className="pma-field__label">Pettorale</span>
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
                  />
                </label>
                <div className="pma-field">
                  <span className="pma-field__label">Età</span>
                  <span
                    className={
                      etaCalcolata !== null || (p.eta !== null && p.eta !== undefined)
                        ? 'pma-field__value'
                        : 'pma-field__value pma-field__value--muted'
                    }
                  >
                    {etaCalcolata !== null
                      ? `${etaCalcolata} anni`
                      : p.eta !== null && p.eta !== undefined
                        ? `${p.eta} anni`
                        : '—'}
                  </span>
                  <p className="mt-2 text-xs text-slate-600">Calcolata dalla data di nascita.</p>
                </div>
                <label className="pma-field pma-field--br">
                  <span className="pma-field__label">Nome</span>
                  <input
                    key={`nome-${p.id}-${p.nome}`}
                    type="text"
                    disabled={!canEdit}
                    defaultValue={p.nome}
                    onBlur={(e) => void write({ nome: e.target.value })}
                  />
                </label>
                <label className="pma-field">
                  <span className="pma-field__label">Cognome</span>
                  <input
                    key={`cog-${p.id}-${p.cognome}`}
                    type="text"
                    disabled={!canEdit}
                    defaultValue={p.cognome}
                    onBlur={(e) => void write({ cognome: e.target.value })}
                  />
                </label>
              </div>
              <div className="pma-row">
                <label className="pma-field">
                  <span className="pma-field__label">Data di nascita</span>
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
                  />
                </label>
              </div>
              <div className="pma-row">
                <label className="pma-field">
                  <span className="pma-field__label">Email</span>
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
                  />
                </label>
              </div>
              <div className="pma-row">
                <label className="pma-field">
                  <span className="pma-field__label">Telefono</span>
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
              canEditDimissioneTab={canEditDimissioneTab}
              canEditScheda={Boolean(canEdit)}
              write={write}
              reportManifestazioneNome={manReport.data?.nome ?? ''}
              reportPmaNome={pmaReport.nome ?? ''}
              consensoGenericoCure={manReport.data?.consensoGenericoCure}
              consensoPrivacy={manReport.data?.consensoPrivacy}
              rifiutoInvioPs={manReport.data?.rifiutoInvioPs}
              presetDimissione={manReport.data?.presetDimissione}
            />
          ),
          invio_ps: (
            <InvioOspedaleSection
              p={p}
              readOnly={invioPsReadOnly}
              writeInvio={writeInvioPs}
            />
          ),
        }}
        />
      </div>
    </SchedaPazienteShell>
  )
}
