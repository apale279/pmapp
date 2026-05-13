import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { arrayUnion, Timestamp } from 'firebase/firestore'
import { datetimeLocalToTimestamp, toDatetimeLocal } from '../../lib/schedaDatetimeLocal'
import { registerPmaFarmacoUsato } from '../../lib/registerPmaFarmacoUsato'
import { db } from '../../lib/firebase'
import { cloudinaryUnsignedUpload } from '../../lib/cloudinaryUnsignedUpload'
import { useManifestazioneListeCliniche } from '../../hooks/useManifestazioneListeCliniche'
import type { Paziente } from '../../types/paziente'
import { EO_CLINICAL_TABS, type EoTabKey } from '../../lib/multilineList'
import {
  EO_PAZIENTE_FIRESTORE_FIELDS,
  firestoreFieldForEoTab,
  resolveEoColumnsForDisplay,
} from '../../lib/eoPazienteFields'
import type {
  FarmacoSomministrato,
  FarmacoVia,
  ParametroVitaleRilevazione,
  RivalutazioneVoce,
} from '../../types/cartellaClinica'
import { FARMACO_VIA_LABEL, FARMACO_VIE, isFarmacoVia } from '../../types/cartellaClinica'
import type { UserProfile } from '../../types/userProfile'
import { QuickExamField } from './QuickExamField'
import { LesioniBodyMap } from './LesioniBodyMap'

export type CartellaClinicaSectionProps = {
  pazienteId: string
  p: Paziente
  canEdit: boolean
  write: (patch: Record<string, unknown>) => Promise<void>
  user: UserProfile | null
  /** Dentro tab: niente card esterna ridondante */
  embedded?: boolean
}

function sortPvDesc(rows: ParametroVitaleRilevazione[]) {
  return [...rows].sort((a, b) => b.registrato_at.toMillis() - a.registrato_at.toMillis())
}

function sortFarmaciDesc(rows: FarmacoSomministrato[]) {
  return [...rows].sort((a, b) => b.registrato_at.toMillis() - a.registrato_at.toMillis())
}

function sortRivDesc(rows: RivalutazioneVoce[]) {
  return [...rows].sort((a, b) => b.creato_at.toMillis() - a.creato_at.toMillis())
}

const PV_INPUT =
  'mt-0.5 w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-sm font-medium disabled:bg-slate-100'

type PvTone = 'critical' | 'warn' | null

function worstSpo2(row: ParametroVitaleRilevazione): number | null {
  const a = row.spo2_aa
  const b = row.spo2_o2
  if (a == null && b == null) return null
  if (a == null) return b
  if (b == null) return a
  return Math.min(a, b)
}

/** Soglie semplificate per evidenziare valori critici in monitoraggio. */
function pvTones(row: ParametroVitaleRilevazione): Record<string, PvTone> {
  const spo = worstSpo2(row)
  const tones: Record<string, PvTone> = {}
  if (row.gcs <= 8) tones.gcs = 'critical'
  else if (row.gcs <= 12) tones.gcs = 'warn'
  if (row.fr < 8 || row.fr > 32) tones.fr = 'critical'
  else if (row.fr < 10 || row.fr > 28) tones.fr = 'warn'
  if (spo != null) {
    if (spo < 90) tones.spo2 = 'critical'
    else if (spo < 94) tones.spo2 = 'warn'
  }
  if (row.fc < 45 || row.fc > 140) tones.fc = 'critical'
  else if (row.fc < 55 || row.fc > 120) tones.fc = 'warn'
  if (row.pa_sistolica < 85 || row.pa_sistolica > 180) tones.pa_sys = 'critical'
  else if (row.pa_sistolica < 90 || row.pa_sistolica > 160) tones.pa_sys = 'warn'
  if (row.pa_diastolica < 45 || row.pa_diastolica > 110) tones.pa_dia = 'critical'
  else if (row.pa_diastolica < 55 || row.pa_diastolica > 100) tones.pa_dia = 'warn'
  if (row.temperatura != null) {
    if (row.temperatura >= 39.5 || row.temperatura < 35) tones.temp = 'critical'
    else if (row.temperatura >= 38.5 || row.temperatura < 36) tones.temp = 'warn'
  }
  if (row.nrs != null) {
    if (row.nrs >= 8) tones.nrs = 'critical'
    else if (row.nrs >= 6) tones.nrs = 'warn'
  }
  return tones
}

function MonitorCell({
  label,
  tone,
  children,
}: {
  label: string
  tone: PvTone
  children: ReactNode
}) {
  const shell =
    tone === 'critical'
      ? 'border-red-400 bg-red-50 shadow-[inset_0_0_0_1px_rgba(252,165,165,0.45)]'
      : tone === 'warn'
        ? 'border-amber-300 bg-amber-50'
        : 'border-slate-200 bg-white'
  return (
    <div className={`rounded-md border px-1.5 py-1 ${shell}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 min-w-0">{children}</div>
    </div>
  )
}

function ParametriVitaliBlock({
  row,
  canEdit,
  onPatch,
}: {
  row: ParametroVitaleRilevazione
  canEdit: boolean
  onPatch: (id: string, partial: Partial<ParametroVitaleRilevazione>) => void
}) {
  const t = pvTones(row)

  return (
    <div className="rounded-md border border-slate-300 bg-slate-200/40 p-2 shadow-sm">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <MonitorCell label="Data/ora" tone={null}>
          <input
            type="datetime-local"
            disabled={!canEdit}
            defaultValue={toDatetimeLocal(row.registrato_at)}
            onBlur={(e) => {
              const ts = datetimeLocalToTimestamp(e.target.value)
              if (ts) onPatch(row.id, { registrato_at: ts })
            }}
            className={PV_INPUT}
          />
        </MonitorCell>
        <MonitorCell label="Operatore" tone={null}>
          <input
            type="text"
            disabled={!canEdit}
            defaultValue={row.operatore_nome}
            onBlur={(e) => onPatch(row.id, { operatore_nome: e.target.value.trim() || '—' })}
            className={PV_INPUT}
          />
        </MonitorCell>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <MonitorCell label="GCS" tone={t.gcs ?? null}>
          <input
            type="number"
            min={1}
            max={15}
            disabled={!canEdit}
            defaultValue={row.gcs}
            onBlur={(e) => {
              const n = Number(e.target.value)
              if (!Number.isFinite(n)) return
              onPatch(row.id, { gcs: Math.min(15, Math.max(1, Math.floor(n))) })
            }}
            className={PV_INPUT}
          />
        </MonitorCell>
        <MonitorCell label="FR" tone={t.fr ?? null}>
          <input
            type="number"
            min={0}
            disabled={!canEdit}
            defaultValue={row.fr}
            onBlur={(e) => {
              const n = Number(e.target.value)
              if (!Number.isFinite(n)) return
              onPatch(row.id, { fr: Math.max(0, Math.floor(n)) })
            }}
            className={PV_INPUT}
          />
        </MonitorCell>
        <MonitorCell label="SpO₂ aa" tone={t.spo2 ?? null}>
          <input
            type="number"
            min={0}
            max={100}
            disabled={!canEdit}
            defaultValue={row.spo2_aa ?? ''}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v === '') {
                onPatch(row.id, { spo2_aa: null })
                return
              }
              const n = Number(v)
              if (!Number.isFinite(n)) return
              onPatch(row.id, { spo2_aa: Math.min(100, Math.max(0, Math.floor(n))) })
            }}
            className={PV_INPUT}
          />
        </MonitorCell>
        <MonitorCell label="SpO₂ O₂" tone={t.spo2 ?? null}>
          <input
            type="number"
            min={0}
            max={100}
            disabled={!canEdit}
            defaultValue={row.spo2_o2 ?? ''}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v === '') {
                onPatch(row.id, { spo2_o2: null })
                return
              }
              const n = Number(v)
              if (!Number.isFinite(n)) return
              onPatch(row.id, { spo2_o2: Math.min(100, Math.max(0, Math.floor(n))) })
            }}
            className={PV_INPUT}
          />
        </MonitorCell>
        <MonitorCell label="FC" tone={t.fc ?? null}>
          <input
            type="number"
            min={0}
            disabled={!canEdit}
            defaultValue={row.fc}
            onBlur={(e) => {
              const n = Number(e.target.value)
              if (!Number.isFinite(n)) return
              onPatch(row.id, { fc: Math.max(0, Math.floor(n)) })
            }}
            className={PV_INPUT}
          />
        </MonitorCell>
        <MonitorCell label="PA sys" tone={t.pa_sys ?? null}>
          <input
            type="number"
            min={0}
            disabled={!canEdit}
            defaultValue={row.pa_sistolica}
            onBlur={(e) => {
              const n = Number(e.target.value)
              if (!Number.isFinite(n)) return
              onPatch(row.id, { pa_sistolica: Math.max(0, Math.floor(n)) })
            }}
            className={PV_INPUT}
          />
        </MonitorCell>
        <MonitorCell label="PA dia" tone={t.pa_dia ?? null}>
          <input
            type="number"
            min={0}
            disabled={!canEdit}
            defaultValue={row.pa_diastolica}
            onBlur={(e) => {
              const n = Number(e.target.value)
              if (!Number.isFinite(n)) return
              onPatch(row.id, { pa_diastolica: Math.max(0, Math.floor(n)) })
            }}
            className={PV_INPUT}
          />
        </MonitorCell>
        <MonitorCell label="T °C" tone={t.temp ?? null}>
          <input
            type="number"
            step="0.1"
            disabled={!canEdit}
            defaultValue={row.temperatura ?? ''}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v === '') {
                onPatch(row.id, { temperatura: null })
                return
              }
              const n = Number(v.replace(',', '.'))
              if (!Number.isFinite(n)) return
              onPatch(row.id, { temperatura: n })
            }}
            className={PV_INPUT}
          />
        </MonitorCell>
        <MonitorCell label="NRS" tone={t.nrs ?? null}>
          <input
            type="number"
            min={0}
            max={10}
            disabled={!canEdit}
            defaultValue={row.nrs ?? ''}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v === '') {
                onPatch(row.id, { nrs: null })
                return
              }
              const n = Number(v)
              if (!Number.isFinite(n)) return
              onPatch(row.id, { nrs: Math.min(10, Math.max(0, Math.floor(n))) })
            }}
            className={PV_INPUT}
          />
        </MonitorCell>
      </div>
    </div>
  )
}

function FarmacoRow({
  row,
  canEditFarmaci,
  onPatch,
}: {
  row: FarmacoSomministrato
  canEditFarmaci: boolean
  onPatch: (id: string, next: FarmacoSomministrato) => void
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <div className="max-w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <div className="flex w-max min-w-full items-end gap-2">
          <div className="min-w-[7rem] shrink-0 text-sm font-medium text-slate-900">
            {row.nome}
          </div>
          <label className="shrink-0 min-w-[4.5rem] text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">Dose</span>
            <input
              type="text"
              disabled={!canEditFarmaci}
              defaultValue={row.dose}
              onBlur={(e) => onPatch(row.id, { ...row, dose: e.target.value })}
              className={PV_INPUT}
            />
          </label>
          <label className="shrink-0 min-w-[3.5rem] text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">Via</span>
            <select
              disabled={!canEditFarmaci}
              value={row.via}
              onChange={(e) => {
                const v = e.target.value
                if (isFarmacoVia(v)) onPatch(row.id, { ...row, via: v })
              }}
              className={PV_INPUT}
            >
              {FARMACO_VIE.map((via) => (
                <option key={via} value={via}>
                  {FARMACO_VIA_LABEL[via]}
                </option>
              ))}
            </select>
          </label>
          <label className="shrink-0 min-w-[10.5rem] text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">Orario</span>
            <input
              type="datetime-local"
              disabled={!canEditFarmaci}
              defaultValue={toDatetimeLocal(row.registrato_at)}
              onBlur={(e) => {
                const ts = datetimeLocalToTimestamp(e.target.value)
                if (ts) onPatch(row.id, { ...row, registrato_at: ts })
              }}
              className={PV_INPUT}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

export function CartellaClinicaSection({
  pazienteId,
  p,
  canEdit,
  write,
  user,
  embedded = false,
}: CartellaClinicaSectionProps) {
  const {
    prestazioni: prestazioniLista,
    farmaci: farmaciLista,
    eoQuickGroups,
    eoQuickDefaultLabel,
    loading: manifestListeLoading,
  } = useManifestazioneListeCliniche(p.id_manifestazione)

  const gruppiEoUi = useMemo(
    () => eoQuickGroups.map((g) => ({ title: g.title, labels: g.labels as readonly string[] })),
    [eoQuickGroups],
  )

  const hideClinicalBlocks = user?.rank === 'Triage'

  const eoResolved = useMemo(() => resolveEoColumnsForDisplay(p, eoQuickGroups), [p, eoQuickGroups])

  const eoSelectedByTab = useMemo((): Record<EoTabKey, string[]> => {
    const o = {} as Record<EoTabKey, string[]>
    for (let i = 0; i < EO_CLINICAL_TABS.length; i++) {
      const tab = EO_CLINICAL_TABS[i]
      const field = EO_PAZIENTE_FIRESTORE_FIELDS[i]
      o[tab] = [...(eoResolved[field] ?? [])]
    }
    return o
  }, [eoResolved])

  const eoQuickKeySuffix = useMemo(
    () =>
      `${EO_CLINICAL_TABS.map((t) => eoSelectedByTab[t].join('\u0001')).join('\u0002')}\u0003${eoQuickGroups.map((g) => g.title + g.labels.join(',')).join('|')}\u0003${eoQuickDefaultLabel ?? ''}`,
    [eoSelectedByTab, eoQuickGroups, eoQuickDefaultLabel],
  )

  /** Opzioni EO da snapshot manifestazione: ogni colonna vuota riceve il primo valore dell'elenco. */
  useEffect(() => {
    if (!canEdit || hideClinicalBlocks) return
    if (manifestListeLoading) return

    const patch: Record<string, unknown> = {}
    for (const tab of EO_CLINICAL_TABS) {
      const field = firestoreFieldForEoTab(tab)
      const col = eoSelectedByTab[tab] ?? []
      const group = eoQuickGroups.find((g) => g.title === tab)
      const labels = (group?.labels ?? []).map((x) => x.trim()).filter(Boolean)
      if (labels.length === 0 || col.length > 0) continue
      patch[field] = [labels[0]]
    }
    if (Object.keys(patch).length === 0) return
    void write(patch)
  }, [
    canEdit,
    hideClinicalBlocks,
    manifestListeLoading,
    eoQuickGroups,
    eoSelectedByTab,
    write,
    p.id,
  ])

  const patchEoColumn = useCallback(
    (tab: EoTabKey, next: string[]) => {
      void write({ [firestoreFieldForEoTab(tab)]: next } as Record<string, unknown>)
    },
    [write],
  )

  const canEditFarmaci =
    canEdit && user && (user.rank === 'Medico' || user.rank === 'Infermiere')

  const canEditRivalutazioniEsistenti = Boolean(canEdit && user?.rank === 'Medico')

  const pvSorted = useMemo(() => sortPvDesc(p.parametri_vitali), [p.parametri_vitali])
  const farmaciSorted = useMemo(() => sortFarmaciDesc(p.farmaci), [p.farmaci])
  const rivSorted = useMemo(() => sortRivDesc(p.rivalutazioni), [p.rivalutazioni])

  const patchPv = useCallback(
    (id: string, partial: Partial<ParametroVitaleRilevazione>) => {
      const row = p.parametri_vitali.find((r) => r.id === id)
      if (!row) return
      const next: ParametroVitaleRilevazione = { ...row, ...partial }
      void write({
        parametri_vitali: p.parametri_vitali.map((r) => (r.id === id ? next : r)),
      })
    },
    [p.parametri_vitali, write],
  )

  const patchFarmaco = useCallback(
    (id: string, next: FarmacoSomministrato) => {
      void write({
        farmaci: p.farmaci.map((f) => (f.id === id ? next : f)),
      })
    },
    [p.farmaci, write],
  )

  const togglePrestazione = useCallback(
    (label: string) => {
      const set = new Set(p.prestazioni_sel)
      if (set.has(label)) set.delete(label)
      else set.add(label)
      void write({ prestazioni_sel: Array.from(set) })
    },
    [p.prestazioni_sel, write],
  )

  const [rivDraft, setRivDraft] = useState('')
  const [ecgUploadBusy, setEcgUploadBusy] = useState(false)
  const [ecgUploadErr, setEcgUploadErr] = useState<string | null>(null)
  const ecgFileInputRef = useRef<HTMLInputElement>(null)
  const [farmNomeInput, setFarmNomeInput] = useState('')
  const [farmDose, setFarmDose] = useState('')
  const [farmVia, setFarmVia] = useState<FarmacoVia>('EV')
  const [farmTs, setFarmTs] = useState(() => toDatetimeLocal(Timestamp.now()))
  const farmDatalistId = `farmaci-elenco-${pazienteId}`

  async function aggiungiPv() {
    if (!canEdit) return
    const nuovo: ParametroVitaleRilevazione = {
      id: crypto.randomUUID(),
      registrato_at: Timestamp.now(),
      operatore_nome: (user?.nome ?? '').trim() || '—',
      gcs: 15,
      fr: 12,
      spo2_aa: 100,
      spo2_o2: null,
      fc: 80,
      pa_sistolica: 130,
      pa_diastolica: 80,
      temperatura: null,
      nrs: null,
    }
    await write({ parametri_vitali: arrayUnion(nuovo) })
  }

  async function aggiungiFarmaco() {
    if (!canEditFarmaci) return
    const nome = farmNomeInput.trim()
    if (!nome) return
    const ts = datetimeLocalToTimestamp(farmTs) ?? Timestamp.now()
    const nuovo: FarmacoSomministrato = {
      id: crypto.randomUUID(),
      nome,
      dose: farmDose.trim(),
      via: farmVia,
      registrato_at: ts,
    }
    await write({ farmaci: arrayUnion(nuovo) })
    try {
      if (db && p.id_pma) await registerPmaFarmacoUsato(db, p.id_pma, nome)
    } catch {
      /* best-effort consumo PMA */
    }
    setFarmDose('')
    setFarmNomeInput('')
    setFarmTs(toDatetimeLocal(Timestamp.now()))
  }

  async function aggiungiRivalutazione() {
    if (!canEdit || !user) return
    const t = rivDraft.trim()
    if (!t) return
    await write({
      rivalutazioni: arrayUnion({
        id: crypto.randomUUID(),
        testo: t,
        creato_at: Timestamp.now(),
        firma_uid: user.uid,
        firma_nome: user.nome,
      }),
    })
    setRivDraft('')
  }

  const patchRivalutazioneTesto = useCallback(
    (id: string, testo: string) => {
      const next = p.rivalutazioni.map((r) => (r.id === id ? { ...r, testo } : r))
      void write({ rivalutazioni: next })
    },
    [p.rivalutazioni, write],
  )

  async function onEcgFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !canEdit) return
    if (!file.type.startsWith('image/')) {
      setEcgUploadErr('Seleziona un file immagine (foto ECG).')
      return
    }
    setEcgUploadErr(null)
    setEcgUploadBusy(true)
    try {
      const { secure_url } = await cloudinaryUnsignedUpload(file)
      await write({ ecg_cloudinary_url: secure_url })
    } catch (err) {
      setEcgUploadErr(err instanceof Error ? err.message : 'Upload ECG non riuscito.')
    } finally {
      setEcgUploadBusy(false)
    }
  }

  const selPrest = new Set(p.prestazioni_sel)

  return (
    <section
      className={
        embedded
          ? 'min-w-0 space-y-0'
          : 'min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white'
      }
    >
      <div className="pma-section-hdr">
        {embedded ? 'Cartella clinica' : 'Sezione 3 — Cartella clinica'}
      </div>

      <div className={embedded ? 'space-y-0' : ''}>
        <div>
          <div className="pma-section-hdr">4.1 Valutazione e anamnesi</div>
          <div className="space-y-0">
            <label className="pma-field">
              <span className="pma-field__label">APR (anamnesi patologica remota)</span>
              <textarea
                key={`apr-${pazienteId}-${p.apr}`}
                disabled={!canEdit}
                rows={3}
                defaultValue={p.apr}
                onBlur={(e) => void write({ apr: e.target.value })}
              />
            </label>
            <label className="pma-field">
              <span className="pma-field__label">Allergie</span>
              <textarea
                key={`all-${pazienteId}-${p.allergie}`}
                disabled={!canEdit}
                rows={2}
                defaultValue={p.allergie}
                onBlur={(e) => void write({ allergie: e.target.value })}
              />
            </label>
            <label className="pma-field">
              <span className="pma-field__label">APP (anamnesi patologica prossima)</span>
              <textarea
                key={`app-${pazienteId}-${p.app}`}
                disabled={!canEdit}
                rows={3}
                defaultValue={p.app}
                onBlur={(e) => void write({ app: e.target.value })}
              />
            </label>
            {!hideClinicalBlocks ? (
              <>
                <div className="pma-card overflow-hidden">
                  <div className="pma-card__hdr">Esame obiettivo (EO)</div>
                  <p className="px-3 pb-2 text-xs text-slate-500">
                    Sei colonne per categoria (GENERALE, NEUROLOGICO, CUTE, TORACE, ADDOME, CAPO/COLLO). Su schermi
                    piccoli scorri in orizzontale.
                  </p>
                  <div className="border-t border-slate-100 bg-slate-50/80 p-2">
                    <QuickExamField
                      key={`qe-${pazienteId}-${p.eo_note}\0${eoQuickKeySuffix}`}
                      note={p.eo_note}
                      disabled={!canEdit}
                      gruppiRapidi={gruppiEoUi}
                      selectedByTab={eoSelectedByTab}
                      onColumnSelectionChange={patchEoColumn}
                      onNoteBlur={(text) => void write({ eo_note: text })}
                    />
                  </div>
                </div>
                <div className="pma-card mt-3 overflow-hidden">
                  <div className="pma-card__hdr">Lesioni</div>
                  <p className="px-3 pb-2 text-xs pma-field__value--muted">
                    Vista frontale e posteriore: clic sul corpo per marker numerati; descrizione al blur.
                  </p>
                  <div className="border-t border-slate-100 bg-slate-50/80 p-2">
                    <LesioniBodyMap
                      lesioni={p.lesioni}
                      disabled={!canEdit}
                      onLesioniChange={(next) => void write({ lesioni: next })}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs pma-field__value--muted">
                Sezioni cliniche avanzate (EO, lesioni, parametri vitali, terapie) non sono disponibili per
                il profilo Triage.
              </p>
            )}
          </div>
        </div>

        {!hideClinicalBlocks ? (
          <>
            <div>
              <div className="pma-section-hdr">4.2 Parametri vitali</div>
          <p className="mt-0.5 text-xs pma-field__value--muted">
            Blocchi tipo monitor: valori critici evidenziati in colore. Salvataggio in uscita dai campi (onBlur).
          </p>
          {canEdit ? (
            <button
              type="button"
              onClick={() => void aggiungiPv()}
              className="mt-2 inline-flex h-10 items-center justify-center rounded-md border border-slate-800 bg-slate-900 px-4 text-sm font-bold uppercase text-white hover:bg-slate-800"
            >
              Aggiungi parametri
            </button>
          ) : null}
          <div className="mt-2 space-y-2">
            {pvSorted.map((row) => (
              <ParametriVitaliBlock
                key={row.id}
                row={row}
                canEdit={canEdit}
                onPatch={patchPv}
              />
            ))}
            {pvSorted.length === 0 ? (
              <p className="text-sm text-slate-500">Nessun rilievo registrato.</p>
            ) : null}
          </div>
        </div>

        <div>
          <div className="pma-section-hdr">4.3 Terapie e prestazioni</div>
          <div className="mt-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="pma-field__label">Prestazioni</span>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <input
                  ref={ecgFileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  aria-hidden
                  tabIndex={-1}
                  onChange={(e) => void onEcgFileChange(e)}
                />
                <button
                  type="button"
                  disabled={!canEdit || ecgUploadBusy}
                  title="Carica foto ECG su Cloudinary e collega alla scheda"
                  onClick={() => ecgFileInputRef.current?.click()}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-bold uppercase tracking-wide text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg width="18" height="14" viewBox="0 0 24 18" fill="none" aria-hidden className="shrink-0 text-red-600">
                    <path
                      d="M1 9h2l2-6 3 12 3-8 2 5h2l2-3h3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {ecgUploadBusy ? '…' : 'ALLEGA ECG'}
                </button>
                {p.ecg_cloudinary_url ? (
                  <a
                    href={p.ecg_cloudinary_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                  >
                    Apri ECG
                  </a>
                ) : null}
              </div>
            </div>
            <p className="mt-1 text-xs pma-field__value--muted">
              Menu a tendina: seleziona una o più voci dall&apos;elenco manifestazione.
            </p>
            {ecgUploadErr ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {ecgUploadErr}
              </p>
            ) : null}
            <details className="mt-2 max-w-xl rounded-lg border border-slate-300 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50">
                <span>
                  {selPrest.size === 0
                    ? 'Nessuna selezione — clicca per aprire e scegliere'
                    : selPrest.size === 1
                      ? '1 prestazione selezionata'
                      : `${selPrest.size} prestazioni selezionate`}
                </span>
                <span className="shrink-0 text-slate-400" aria-hidden>
                  ▼
                </span>
              </summary>
              <div className="max-h-60 overflow-y-auto border-t border-slate-200 p-2">
                {prestazioniLista.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-slate-500">
                    Nessuna prestazione configurata sulla manifestazione.
                  </p>
                ) : (
                  prestazioniLista.map((label) => (
                    <label
                      key={label}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                        checked={selPrest.has(label)}
                        disabled={!canEdit}
                        onChange={() => togglePrestazione(label)}
                      />
                      <span className="min-w-0 leading-snug text-slate-800">{label}</span>
                    </label>
                  ))
                )}
              </div>
            </details>
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">Farmaci somministrati</span>
              {!canEditFarmaci ? (
                <span className="text-xs text-slate-500">Sola lettura (solo Medico / Infermiere possono modificare).</span>
              ) : null}
            </div>
            <div className="mt-3 space-y-3">
              {farmaciSorted.map((row) => (
                <FarmacoRow
                  key={row.id}
                  row={row}
                  canEditFarmaci={Boolean(canEditFarmaci)}
                  onPatch={patchFarmaco}
                />
              ))}
            </div>

            {canEditFarmaci ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-3">
                <p className="text-xs font-medium text-slate-600">Aggiungi farmaco</p>
                <p className="mt-1 text-xs text-slate-500">
                  Suggerimenti dall&apos;elenco manifestazione; testo libero se assente. Campi su una riga
                  (scroll orizzontale su schermi stretti).
                </p>
                <datalist id={farmDatalistId}>
                  {farmaciLista.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
                <div className="mt-2 max-w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
                  <div className="flex w-max min-w-full flex-wrap items-end gap-2 sm:flex-nowrap">
                    <label className="block min-w-[10rem] max-w-[min(100%,20rem)] shrink-0 text-xs sm:min-w-[12rem] sm:max-w-[14rem]">
                      <span className="font-semibold uppercase tracking-wider text-slate-500">Nome</span>
                      <input
                        type="text"
                        list={farmDatalistId}
                        value={farmNomeInput}
                        onChange={(e) => setFarmNomeInput(e.target.value)}
                        autoComplete="off"
                        className={PV_INPUT}
                        placeholder="Farmaco…"
                      />
                    </label>
                    <label className="block min-w-[4.5rem] shrink-0 text-xs">
                      <span className="font-semibold uppercase tracking-wider text-slate-500">Dose</span>
                      <input
                        type="text"
                        value={farmDose}
                        onChange={(e) => setFarmDose(e.target.value)}
                        className={PV_INPUT}
                      />
                    </label>
                    <label className="block min-w-[3.75rem] shrink-0 text-xs">
                      <span className="font-semibold uppercase tracking-wider text-slate-500">Via</span>
                      <select
                        value={farmVia}
                        onChange={(e) => {
                          const v = e.target.value
                          if (isFarmacoVia(v)) setFarmVia(v)
                        }}
                        className={PV_INPUT}
                      >
                        {FARMACO_VIE.map((via) => (
                          <option key={via} value={via}>
                            {FARMACO_VIA_LABEL[via]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block min-w-[10.5rem] shrink-0 text-xs">
                      <span className="font-semibold uppercase tracking-wider text-slate-500">Orario</span>
                      <input
                        type="datetime-local"
                        value={farmTs}
                        onChange={(e) => setFarmTs(e.target.value)}
                        className={PV_INPUT}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void aggiungiFarmaco()}
                      className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 sm:mb-px"
                    >
                      Aggiungi
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
          </>
        ) : null}

        <div>
          <div className="pma-section-hdr">4.4 Rivalutazione</div>
          <div className="mt-4 space-y-3">
            {rivSorted.map((r) => (
              <div key={r.id} className="pma-card text-sm">
                <div className="text-xs pma-field__value--muted">
                  {r.creato_at.toDate().toLocaleString('it-IT')} · {r.firma_nome}
                </div>
                {canEditRivalutazioniEsistenti ? (
                  <label className="mt-2 block">
                    <span className="sr-only">Testo rivalutazione</span>
                    <textarea
                      key={`riv-edit-${r.id}-${r.testo.slice(0, 40)}`}
                      defaultValue={r.testo}
                      rows={4}
                      onBlur={(e) => {
                        const v = e.target.value
                        if (v !== r.testo) patchRivalutazioneTesto(r.id, v)
                      }}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap pma-field__value">{r.testo}</p>
                )}
              </div>
            ))}
            {rivSorted.length === 0 ? (
              <p className="text-sm pma-field__value--muted">Nessuna rivalutazione.</p>
            ) : null}
          </div>
          {canEdit ? (
            <div className="pma-card mt-4">
              <label className="block">
                <span className="pma-field__label">Nuova nota</span>
                <textarea
                  value={rivDraft}
                  onChange={(e) => setRivDraft(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="Testo rivalutazione…"
                />
              </label>
              <button
                type="button"
                disabled={!rivDraft.trim()}
                onClick={() => void aggiungiRivalutazione()}
                className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
              >
                Aggiungi rivalutazione
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
