import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { deleteField, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSyncLive } from '../../context/SyncLiveContext'
import { db } from '../../lib/firebase'
import { ChipTagField } from '../../components/manifestazione/ChipTagField'
import { OperativePageGrid } from '../../components/layout/OperativePageGrid'
import { opToolbarBtnSm } from '../../components/layout/operativeTokens'
import {
  EO_CLINICAL_TABS,
  firstEoRapidoDefaultFromDrafts,
  parseLinesToValues,
  type EoTabKey,
} from '../../lib/multilineList'
import { sortRecordKeysAndValuesIt, sortStringsIt } from '../../lib/sortLocaleIt'
import { manifestazioneImpostazioniAllows } from '../../lib/rankMatrix'
import { normalizeEoQuickLabels } from '../../lib/eoQuickSelection'
import { usePmaListForManifestazione } from '../../hooks/usePmaListForManifestazione'
import {
  parsePresetDimissioneFromFirestore,
  parsePresetFarmaciFromFirestore,
  type PresetDimissioneVoce,
  type PresetFarmaciPack,
} from '../../types/manifestazioneImpostazioni'
import { FARMACO_VIA_LABEL, FARMACO_VIE, isFarmacoVia, type FarmacoVia } from '../../types/cartellaClinica'
import { parsePartecipantiExcelFile } from '../../lib/parsePartecipantiExcel'

/** Testo textarea → righe pulite, deduplicate, ordinate, rimesse su righe. */
function sortLinesText(text: string): string {
  return sortStringsIt(parseLinesToValues(text)).join('\n')
}

/** Per Firestore: trim righe, senza vuoti, senza duplicati, ordine alfabetico. */
function packPresetFarmaciForFirestore(draft: PresetFarmaciPack[]) {
  return draft
    .map((pack) => ({
      nome: pack.nome.trim(),
      farmaci: pack.farmaci
        .map((f) => ({
          nome: f.nome.trim(),
          dose: typeof f.dose === 'string' ? f.dose.trim() : '',
          via: f.via,
        }))
        .filter((f) => f.nome || f.dose),
    }))
    .filter((p) => p.nome || p.farmaci.length > 0)
}

function listFromMultilineText(text: string): string[] {
  return sortStringsIt(parseLinesToValues(text))
}


function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  return v.filter((x): x is string => typeof x === 'string').map((s) => s.trim())
}

function impRecord(d: Record<string, unknown>): Record<string, unknown> {
  const imp = d.impostazioni
  return imp && typeof imp === 'object' && imp !== null ? (imp as Record<string, unknown>) : {}
}

function parseDettaglioEvento(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const out: Record<string, string[]> = {}
  for (const [k, val] of Object.entries(o)) {
    const arr = asStringArray(val)
    if (arr?.length) out[k.trim()] = arr
  }
  return out
}

function emptyEoDraft(): Record<EoTabKey, string> {
  return Object.fromEntries(EO_CLINICAL_TABS.map((k) => [k, ''])) as Record<EoTabKey, string>
}

function emptyEoTabRecordArrays(): Record<EoTabKey, string[]> {
  const out = {} as Record<EoTabKey, string[]>
  for (const k of EO_CLINICAL_TABS) out[k] = []
  return out
}

function normalizeDettaglioEoFromFirestore(raw: unknown): Record<EoTabKey, string[]> {
  if (!raw || typeof raw !== 'object') return emptyEoTabRecordArrays()
  const o = raw as Record<string, unknown>
  const out = emptyEoTabRecordArrays()
  for (const k of EO_CLINICAL_TABS) {
    const arr = asStringArray(o[k])
    if (arr) out[k] = arr
  }
  const legacy = asStringArray(o.CAPO_COLLO)
  if (legacy?.length) {
    out['CAPO/COLLO'] = [...new Set([...out['CAPO/COLLO'], ...legacy])]
  }
  return out
}

function pickPrestazioniFarmaci(
  d: Record<string, unknown>,
  imp: Record<string, unknown>,
  field: 'prestazioni' | 'farmaci',
): string[] {
  const impKeys =
    field === 'prestazioni'
      ? (['prestazioni_imp', 'PRESTAZIONI_IMP'] as const)
      : (['farmaci_imp', 'FARMACI_IMP'] as const)
  const topKey = field === 'prestazioni' ? 'prestazioni_lista' : 'farmaci_lista'
  for (const k of impKeys) {
    const a = asStringArray(imp[k])
    if (a !== null) return sortStringsIt(a)
  }
  const top = asStringArray(d[topKey])
  return sortStringsIt(top ?? [])
}

const IMP_DETAILS =
  'group overflow-hidden rounded-lg border border-[#e2e8f0] bg-white [&_summary::-webkit-details-marker]:hidden'
const IMP_SUMMARY =
  'flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50 px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-slate-800 hover:bg-slate-100'
const IMP_PANEL = 'border-t border-slate-100 px-6 py-6 sm:px-8'
const IMP_H3 = 'text-xs font-bold uppercase tracking-[0.12em] text-slate-500'
/** Accordion esclusivo: una sola sezione principale aperta (HTML `details name`). */
const IMP_ACC_NAME = 'manifestazione-impostazioni-acc'
const impSaveBtn =
  'pma-theme-skip inline-flex min-h-[var(--pma-touch-min)] items-center justify-center rounded-full border border-transparent px-5 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-md transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-45'

/**
 * IMP_GENERALI — Prestazioni/farmaci su textarea; tipo evento a chip; dettaglio + EO su textarea.
 * Salvataggio: liste + `tipo_evento`, `dettaglio_evento`, `dettaglio_eo_rapido`, `dettaglio_eo_rapido_default` a root.
 */
export function ManifestazioneImpostazioniPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const manifestazioneId = idParam ? decodeURIComponent(idParam) : ''
  const { user } = useAuth()
  const { bumpSync } = useSyncLive()
  const isReadOnlyManifestazione = user ? !manifestazioneImpostazioniAllows(user.rank, 'UPDATE') : true

  const {
    items: pmaConsumatiList,
    loading: pmaConsumatiLoading,
    error: pmaConsumatiError,
  } = usePmaListForManifestazione(manifestazioneId.trim() || undefined)

  const [prestazioniDraft, setPrestazioniDraft] = useState('')
  const [farmaciDraft, setFarmaciDraft] = useState('')
  const [tipoEvento, setTipoEvento] = useState<string[]>([])
  const [dettaglioDraft, setDettaglioDraft] = useState<Record<string, string>>({})
  const [eoDraft, setEoDraft] = useState<Record<EoTabKey, string>>(emptyEoDraft)
  const [eoActiveTab, setEoActiveTab] = useState<EoTabKey>('GENERALE')
  const [consensoGenericoDraft, setConsensoGenericoDraft] = useState('')
  const [consensoPrivacyDraft, setConsensoPrivacyDraft] = useState('')
  const [rifiutoInvioPsDraft, setRifiutoInvioPsDraft] = useState('')
  const [presetDimissioneDraft, setPresetDimissioneDraft] = useState<PresetDimissioneVoce[]>([])
  const [presetFarmaciDraft, setPresetFarmaciDraft] = useState<PresetFarmaciPack[]>([])

  const [partecipantiElencoCount, setPartecipantiElencoCount] = useState(0)
  const [partExcelBusy, setPartExcelBusy] = useState(false)

  const [loading, setLoading] = useState(true)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    if (!db || !manifestazioneId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const ref = doc(db, 'manifestazioni', manifestazioneId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setLoading(false)
          bumpSync()
          return
        }
        const d = snap.data() as Record<string, unknown>
        const imp = impRecord(d)

        const prestArr = pickPrestazioniFarmaci(d, imp, 'prestazioni')
        const farmArr = pickPrestazioniFarmaci(d, imp, 'farmaci')
        setPrestazioniDraft(prestArr.join('\n'))
        setFarmaciDraft(farmArr.join('\n'))

        const tipoArr = sortStringsIt(
          asStringArray(d.tipo_evento) ??
            asStringArray(imp.tipo_evento) ??
            asStringArray(imp.tipo_evento_list) ??
            [],
        )
        setTipoEvento(tipoArr)

        const pickDettaglio = (): Record<string, string[]> => {
          for (const raw of [d.dettaglio_evento, imp.dettaglio_evento, imp.dettaglio_evento_per_tipo]) {
            const m = parseDettaglioEvento(raw)
            if (Object.keys(m).length > 0) return sortRecordKeysAndValuesIt(m)
          }
          return {}
        }
        const dm = pickDettaglio()
        const drafts: Record<string, string> = {}
        for (const t of tipoArr) {
          drafts[t] = (dm[t] ?? []).join('\n')
        }
        setDettaglioDraft(drafts)

        const eoObj = normalizeDettaglioEoFromFirestore(
          d.dettaglio_eo_rapido ?? imp.dettaglio_eo_rapido ?? imp.eo_quick_imp,
        )
        const nextEoDraft = emptyEoDraft()
        for (const k of EO_CLINICAL_TABS) {
          nextEoDraft[k] = normalizeEoQuickLabels(eoObj[k] ?? []).join('\n')
        }
        setEoDraft(nextEoDraft)

        setConsensoGenericoDraft(
          typeof imp.consenso_generico_cure === 'string' ? imp.consenso_generico_cure : '',
        )
        setConsensoPrivacyDraft(typeof imp.consenso_privacy === 'string' ? imp.consenso_privacy : '')
        setRifiutoInvioPsDraft(typeof imp.rifiuto_invio_ps === 'string' ? imp.rifiuto_invio_ps : '')
        setPresetDimissioneDraft(parsePresetDimissioneFromFirestore(imp.preset_dimissione))
        setPresetFarmaciDraft(parsePresetFarmaciFromFirestore(imp.preset_farmaci))

        const rawPe = imp.partecipanti_elenco
        setPartecipantiElencoCount(Array.isArray(rawPe) ? rawPe.length : 0)

        setLoading(false)
        bumpSync()
      },
      (e) => {
        setError(e.message)
        setLoading(false)
        bumpSync()
      },
    )
    return () => unsub()
  }, [manifestazioneId, bumpSync])

  const setTipoEventoSync = useCallback((next: string[]) => {
    const sorted = sortStringsIt(next)
    setTipoEvento(sorted)
    setDettaglioDraft((prev) => {
      const o: Record<string, string> = {}
      for (const t of sorted) {
        o[t] = prev[t] ?? ''
      }
      return o
    })
  }, [])

  const runSectionSave = useCallback(
    async (sectionKey: string, exec: () => Promise<void>) => {
      if (isReadOnlyManifestazione) return
      setSavingSection(sectionKey)
      setError(null)
      setSaved(null)
      try {
        await exec()
        setSaved('Salvataggio completato.')
        bumpSync()
        window.setTimeout(() => setSaved(null), 5000)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
      } finally {
        setSavingSection(null)
      }
    },
    [isReadOnlyManifestazione, bumpSync],
  )

  const salvaPrestazioni = useCallback(async () => {
    if (!db || !manifestazioneId) return
    const ref = doc(db, 'manifestazioni', manifestazioneId)
    const prestazioniLista = listFromMultilineText(prestazioniDraft)
    await runSectionSave('prestazioni', () =>
      updateDoc(ref, {
        prestazioni_lista: prestazioniLista,
        'impostazioni.prestazioni_imp': prestazioniLista,
      }),
    )
  }, [manifestazioneId, prestazioniDraft, runSectionSave])

  const salvaFarmaci = useCallback(async () => {
    if (!db || !manifestazioneId) return
    const ref = doc(db, 'manifestazioni', manifestazioneId)
    const farmaciLista = listFromMultilineText(farmaciDraft)
    await runSectionSave('farmaci', () =>
      updateDoc(ref, {
        farmaci_lista: farmaciLista,
        'impostazioni.farmaci_imp': farmaciLista,
      }),
    )
  }, [manifestazioneId, farmaciDraft, runSectionSave])

  const salvaTipoEvento = useCallback(async () => {
    if (!db || !manifestazioneId) return
    const ref = doc(db, 'manifestazioni', manifestazioneId)
    await runSectionSave('tipo_evento', () =>
      updateDoc(ref, { tipo_evento: sortStringsIt(tipoEvento) }),
    )
  }, [manifestazioneId, tipoEvento, runSectionSave])

  const salvaDettaglioTipo = useCallback(
    async (tipo: string) => {
      if (!db || !manifestazioneId) return
      const ref = doc(db, 'manifestazioni', manifestazioneId)
      const key = `dettaglio_evento.${tipo}`
      await runSectionSave(`dettaglio_${tipo}`, () =>
        updateDoc(ref, { [key]: listFromMultilineText(dettaglioDraft[tipo] ?? '') }),
      )
    },
    [manifestazioneId, dettaglioDraft, runSectionSave],
  )

  const salvaEoTab = useCallback(
    async (tab: EoTabKey) => {
      if (!db || !manifestazioneId) return
      const ref = doc(db, 'manifestazioni', manifestazioneId)
      const lines = normalizeEoQuickLabels(parseLinesToValues(eoDraft[tab] ?? ''))
      const defaultPrim = firstEoRapidoDefaultFromDrafts(eoDraft)
      await runSectionSave(`eo_${tab}`, () =>
        updateDoc(ref, {
          [`dettaglio_eo_rapido.${tab}`]: lines,
          ...(defaultPrim
            ? { dettaglio_eo_rapido_default: defaultPrim }
            : { dettaglio_eo_rapido_default: deleteField() }),
        }),
      )
    },
    [manifestazioneId, eoDraft, runSectionSave],
  )

  const salvaPresetDimissione = useCallback(async () => {
    if (!db || !manifestazioneId) return
    const ref = doc(db, 'manifestazioni', manifestazioneId)
    const presetPayload = presetDimissioneDraft
      .map((row) => ({ titolo: row.titolo.trim(), testo: row.testo }))
      .filter((row) => row.titolo || row.testo.trim())
    await runSectionSave('preset_dimissione', () =>
      updateDoc(ref, { 'impostazioni.preset_dimissione': presetPayload }),
    )
  }, [manifestazioneId, presetDimissioneDraft, runSectionSave])

  const salvaPresetFarmaci = useCallback(async () => {
    if (!db || !manifestazioneId) return
    const ref = doc(db, 'manifestazioni', manifestazioneId)
    const payload = packPresetFarmaciForFirestore(presetFarmaciDraft)
    await runSectionSave('preset_farmaci', () =>
      updateDoc(ref, { 'impostazioni.preset_farmaci': payload }),
    )
  }, [manifestazioneId, presetFarmaciDraft, runSectionSave])

  const salvaConsensi = useCallback(async () => {
    if (!db || !manifestazioneId) return
    const ref = doc(db, 'manifestazioni', manifestazioneId)
    await runSectionSave('consensi', () =>
      updateDoc(ref, {
        'impostazioni.consenso_generico_cure': consensoGenericoDraft,
        'impostazioni.consenso_privacy': consensoPrivacyDraft,
        'impostazioni.rifiuto_invio_ps': rifiutoInvioPsDraft,
      }),
    )
  }, [manifestazioneId, consensoGenericoDraft, consensoPrivacyDraft, rifiutoInvioPsDraft, runSectionSave])

  const onPartecipantiExcel = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file || !db || !manifestazioneId || isReadOnlyManifestazione) return
      setPartExcelBusy(true)
      setError(null)
      try {
        const rows = await parsePartecipantiExcelFile(file)
        if (rows.length === 0) {
          setError('Nessuna riga valida: la colonna A deve contenere il numero di pettorale.')
          return
        }
        await updateDoc(doc(db, 'manifestazioni', manifestazioneId), {
          'impostazioni.partecipanti_elenco': rows,
        })
        setSaved(`Elenco partecipanti caricato: ${rows.length} righe.`)
        bumpSync()
        window.setTimeout(() => setSaved(null), 5000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lettura Excel non riuscita.')
      } finally {
        setPartExcelBusy(false)
      }
    },
    [manifestazioneId, isReadOnlyManifestazione, bumpSync],
  )

  const rimuoviElencoPartecipanti = useCallback(async () => {
    if (!db || !manifestazioneId || isReadOnlyManifestazione) return
    if (!window.confirm('Rimuovere l’elenco partecipanti da questa manifestazione?')) return
    setError(null)
    try {
      await updateDoc(doc(db, 'manifestazioni', manifestazioneId), {
        'impostazioni.partecipanti_elenco': deleteField(),
      })
      setSaved('Elenco partecipanti rimosso.')
      bumpSync()
      window.setTimeout(() => setSaved(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione non riuscita.')
    }
  }, [db, manifestazioneId, isReadOnlyManifestazione, bumpSync])

  return (
    <div className="pma-dashboard mx-auto w-full max-w-[1920px] pb-12">
      <OperativePageGrid
        main={
          <>
            {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800"
            aria-hidden
          />
          Caricamento…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {saved}
        </div>
      ) : null}

      {!loading ? (
        <div className="space-y-4">
          <details name={IMP_ACC_NAME} className={IMP_DETAILS}>
            <summary className={IMP_SUMMARY}>
              <span>Evento</span>
              <span
                className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              >
                ▼
              </span>
            </summary>
            <div className={`${IMP_PANEL} space-y-10`}>
              <div>
                <h3 className={IMP_H3}>Tipo evento</h3>
                <p className="mt-2 text-xs text-slate-500">
                  Evento lesivo selezionabile in scheda (es. trauma, caduta). Campo Firestore:{' '}
                  <code className="rounded bg-slate-100 px-1">tipo_evento</code>.
                </p>
                <div className="mt-3">
                  <ChipTagField
                    tags={tipoEvento}
                    onChange={setTipoEventoSync}
                    disabled={isReadOnlyManifestazione}
                    placeholder="es. trauma, contusione… poi Invio"
                  />
                </div>
                {!isReadOnlyManifestazione ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={Boolean(savingSection) || !manifestazioneId}
                      onClick={() => void salvaTipoEvento()}
                      className={`${impSaveBtn} bg-sky-600 hover:bg-sky-500 focus-visible:ring-sky-300`}
                    >
                      {savingSection === 'tipo_evento' ? 'Salvataggio…' : 'Salva tipo evento'}
                    </button>
                  </div>
                ) : null}
              </div>
              <div>
                <h3 className={IMP_H3}>Dettaglio evento per tipo</h3>
                <p className="mt-2 text-xs text-slate-500">
                  Una sezione per ogni tipo. Un valore per riga (andata a capo). Campo:{' '}
                  <code className="rounded bg-slate-100 px-1">dettaglio_evento</code>. Al salvataggio le righe di ogni
                  tipo sono ordinate alfabeticamente (come richiesto per questo campo).
                </p>
                {tipoEvento.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Aggiungi almeno un tipo evento per configurare i dettagli.
                  </p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {tipoEvento.map((tipo) => (
                      <details
                        key={tipo}
                        className="group overflow-hidden rounded-lg border border-[#e2e8f0] bg-white [&_summary::-webkit-details-marker]:hidden"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-100">
                          <span>{tipo}</span>
                          <span
                            className="text-slate-400 transition-transform duration-200 group-open:rotate-90"
                            aria-hidden
                          >
                            ▶
                          </span>
                        </summary>
                        <div className="border-t border-slate-100 p-4">
                          <label className="block text-xs font-medium text-slate-600">
                            Valori (uno per riga)
                            <textarea
                              value={dettaglioDraft[tipo] ?? ''}
                              onChange={(e) =>
                                setDettaglioDraft((prev) => ({ ...prev, [tipo]: e.target.value }))
                              }
                              disabled={isReadOnlyManifestazione}
                              rows={6}
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm disabled:bg-slate-50"
                              spellCheck={false}
                            />
                          </label>
                          {!isReadOnlyManifestazione ? (
                            <div className="mt-3">
                              <button
                                type="button"
                                disabled={Boolean(savingSection) || !manifestazioneId}
                                onClick={() => void salvaDettaglioTipo(tipo)}
                                className={`${impSaveBtn} bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-indigo-300`}
                              >
                                {savingSection === `dettaglio_${tipo}`
                                  ? 'Salvataggio…'
                                  : `Salva dettaglio (${tipo})`}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </details>

          <details name={IMP_ACC_NAME} className={IMP_DETAILS}>
            <summary className={IMP_SUMMARY}>
              <span>Cartella clinica</span>
              <span
                className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              >
                ▼
              </span>
            </summary>
            <div className={`${IMP_PANEL} space-y-10`}>
              <div>
                <h3 className={IMP_H3}>Elenco prestazioni</h3>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={isReadOnlyManifestazione}
                    onClick={() => setPrestazioniDraft((t) => sortLinesText(t))}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium uppercase text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    Ordina Alfabeticamente
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Campi Firestore: <code className="rounded bg-slate-100 px-1">prestazioni_lista</code>,{' '}
                  <code className="rounded bg-slate-100 px-1">impostazioni.prestazioni_imp</code>. Un valore per
                  riga.
                </p>
                <textarea
                  value={prestazioniDraft}
                  onChange={(e) => setPrestazioniDraft(e.target.value)}
                  disabled={isReadOnlyManifestazione}
                  rows={10}
                  spellCheck={false}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  aria-label="Elenco prestazioni, un valore per riga"
                />
                {!isReadOnlyManifestazione ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={Boolean(savingSection) || !manifestazioneId}
                      onClick={() => void salvaPrestazioni()}
                      className={`${impSaveBtn} bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-emerald-300`}
                    >
                      {savingSection === 'prestazioni' ? 'Salvataggio…' : 'Salva prestazioni'}
                    </button>
                  </div>
                ) : null}
              </div>
              <div>
                <h3 className={IMP_H3}>Elenco farmaci</h3>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={isReadOnlyManifestazione}
                    onClick={() => setFarmaciDraft((t) => sortLinesText(t))}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium uppercase text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    Ordina Alfabeticamente
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Campi Firestore: <code className="rounded bg-slate-100 px-1">farmaci_lista</code>,{' '}
                  <code className="rounded bg-slate-100 px-1">impostazioni.farmaci_imp</code>. Un valore per riga.
                </p>
                <textarea
                  value={farmaciDraft}
                  onChange={(e) => setFarmaciDraft(e.target.value)}
                  disabled={isReadOnlyManifestazione}
                  rows={10}
                  spellCheck={false}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  aria-label="Elenco farmaci, un valore per riga"
                />
                {!isReadOnlyManifestazione ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={Boolean(savingSection) || !manifestazioneId}
                      onClick={() => void salvaFarmaci()}
                      className={`${impSaveBtn} bg-teal-600 hover:bg-teal-500 focus-visible:ring-teal-300`}
                    >
                      {savingSection === 'farmaci' ? 'Salvataggio…' : 'Salva farmaci'}
                    </button>
                  </div>
                ) : null}
              </div>
              <div>
                <h3 className={IMP_H3}>Dettaglio EO rapido (tab clinici)</h3>
                <p className="mt-2 text-xs text-slate-500">
                  Un valore per riga; l&apos;ordine delle righe è quello usato in cartella (non alfabetico). La prima
                  riga non vuota seguendo le tab da GENERALE in poi definisce il default in cartella (
                  <code className="rounded bg-slate-100 px-1">dettaglio_eo_rapido_default</code>). Campo liste:{' '}
                  <code className="rounded bg-slate-100 px-1">dettaglio_eo_rapido</code>.
                </p>
                <div className="mt-4 flex flex-wrap gap-1 border-b border-slate-200 pb-2">
                  {EO_CLINICAL_TABS.map((tab) => {
                    const sel = eoActiveTab === tab
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setEoActiveTab(tab)}
                        className={
                          sel
                            ? 'rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase text-white'
                            : 'rounded-md px-3 py-1.5 text-xs font-medium uppercase text-slate-600 hover:bg-slate-100'
                        }
                      >
                        {tab}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-medium text-slate-600">
                    Valori per {eoActiveTab} (uno per riga)
                    <textarea
                      value={eoDraft[eoActiveTab] ?? ''}
                      onChange={(e) => setEoDraft((prev) => ({ ...prev, [eoActiveTab]: e.target.value }))}
                      disabled={isReadOnlyManifestazione}
                      rows={8}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm disabled:bg-slate-50"
                      spellCheck={false}
                    />
                  </label>
                  {!isReadOnlyManifestazione ? (
                    <div className="mt-3">
                      <button
                        type="button"
                        disabled={Boolean(savingSection) || !manifestazioneId}
                        onClick={() => void salvaEoTab(eoActiveTab)}
                        className={`${impSaveBtn} bg-violet-600 hover:bg-violet-500 focus-visible:ring-violet-300`}
                      >
                        {savingSection === `eo_${eoActiveTab}` ? 'Salvataggio…' : `Salva EO (${eoActiveTab})`}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </details>

          <details name={IMP_ACC_NAME} className={IMP_DETAILS}>
            <summary className={IMP_SUMMARY}>
              <span>Consumati</span>
              <span
                className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              >
                ▼
              </span>
            </summary>
            <div className={IMP_PANEL}>
              <p className="text-xs text-slate-500">
                Per ogni PMA della manifestazione: farmaci registrati dalle schede paziente su{' '}
                <code className="rounded bg-slate-100 px-1">pma/{'{id}'}.impostazioni_pma.elenco_farmaci_usati</code>{' '}
                (<code className="rounded bg-slate-100 px-1">arrayUnion</code>). Se assente, si legge anche il campo
                legacy <code className="rounded bg-slate-100 px-1">farmaci_usati</code> in radice sullo stesso
                documento.
              </p>
              {manifestazioneId && pmaConsumatiError ? (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {pmaConsumatiError}
                </div>
              ) : null}
              {manifestazioneId && !pmaConsumatiError && pmaConsumatiLoading ? (
                <p className="mt-4 text-sm text-slate-600">Caricamento elenco PMA…</p>
              ) : null}
              {manifestazioneId && !pmaConsumatiError && !pmaConsumatiLoading && pmaConsumatiList.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">Nessun PMA collegato a questa manifestazione.</p>
              ) : null}
              {manifestazioneId && !pmaConsumatiError && !pmaConsumatiLoading && pmaConsumatiList.length > 0 ? (
                <div className="mt-6 space-y-8">
                  {pmaConsumatiList.map((pma) => {
                    const farmaciUsati = pma.impostazioni_pma.elenco_farmaci_usati ?? []
                    return (
                      <div key={pma.id}>
                        <h3 className="text-sm font-semibold text-slate-900">{pma.nome}</h3>
                        <p className="mt-0.5 font-mono text-xs text-slate-500">{pma.id}</p>
                        {pma.luogo && pma.luogo !== '—' ? (
                          <p className="mt-1 text-xs text-slate-500">{pma.luogo}</p>
                        ) : null}
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          {farmaciUsati.length === 0 ? (
                            <p className="text-sm text-slate-600">Nessun farmaco registrato ancora.</p>
                          ) : (
                            <ul className="list-inside list-disc text-sm font-medium text-slate-900">
                              {farmaciUsati.map((f) => (
                                <li key={`${pma.id}:${f}`}>{f}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </details>

          <details name={IMP_ACC_NAME} className={IMP_DETAILS}>
            <summary className={IMP_SUMMARY}>
              <span>Preset</span>
              <span
                className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              >
                ▼
              </span>
            </summary>
            <div className={`${IMP_PANEL} space-y-10`}>
              <div>
                <h3 className={IMP_H3}>Preset dimissioni</h3>
                <p className="mt-2 text-xs text-slate-500">
                  Il medico può importare uno o più testi nelle{' '}
                  <strong className="text-slate-800">note di dimissione</strong> dalla scheda. Campo Firestore:{' '}
                  <code className="rounded bg-slate-100 px-1">impostazioni.preset_dimissione</code> (array di oggetti{' '}
                  <code className="rounded bg-slate-100 px-1">titolo</code>,{' '}
                  <code className="rounded bg-slate-100 px-1">testo</code>).
                </p>
                <div className="mt-4 space-y-4">
                  {presetDimissioneDraft.map((row, idx) => (
                    <details
                      key={idx}
                      className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60 shadow-sm [&_summary::-webkit-details-marker]:hidden"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100/80">
                        <span className="truncate">{row.titolo.trim() || `Preset ${idx + 1}`}</span>
                        <span
                          className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                          aria-hidden
                        >
                          ▼
                        </span>
                      </summary>
                      <div className="border-t border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="block min-w-[12rem] flex-1 text-xs font-medium text-slate-600">
                            Titolo (pulsante in scheda)
                            <input
                              type="text"
                              value={row.titolo}
                              onChange={(e) =>
                                setPresetDimissioneDraft((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, titolo: e.target.value } : r)),
                                )
                              }
                              disabled={isReadOnlyManifestazione}
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                              placeholder="es. Dimissione standard"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={isReadOnlyManifestazione}
                            onClick={() =>
                              setPresetDimissioneDraft((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className={`${opToolbarBtnSm} text-red-800`}
                          >
                            Rimuovi
                          </button>
                        </div>
                        <label className="mt-3 block text-xs font-medium text-slate-600">
                          Testo da appendere alle note
                          <textarea
                            value={row.testo}
                            onChange={(e) =>
                              setPresetDimissioneDraft((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, testo: e.target.value } : r)),
                              )
                            }
                            disabled={isReadOnlyManifestazione}
                            rows={5}
                            spellCheck={false}
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                          />
                        </label>
                      </div>
                    </details>
                  ))}
              <button
                type="button"
                disabled={isReadOnlyManifestazione}
                onClick={() =>
                  setPresetDimissioneDraft((prev) => [...prev, { titolo: '', testo: '' }])
                }
                className={opToolbarBtnSm}
              >
                Aggiungi preset
              </button>
              {!isReadOnlyManifestazione ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={Boolean(savingSection) || !manifestazioneId}
                    onClick={() => void salvaPresetDimissione()}
                    className={`${impSaveBtn} bg-amber-600 hover:bg-amber-500 focus-visible:ring-amber-300`}
                  >
                    {savingSection === 'preset_dimissione' ? 'Salvataggio…' : 'Salva preset dimissione'}
                  </button>
                </div>
              ) : null}
                </div>
              </div>
              <div>
                <h3 className={IMP_H3}>Preset farmaci</h3>
                <p className="mt-2 text-xs text-slate-500">
                  In cartella clinica (farmaci) si possono importare uno o più preset: ogni preset ha un nome (es.{' '}
                  <strong className="text-slate-800">NAUSEA</strong>) e un elenco di farmaci con nome, dose e via come
                  in scheda. Campo Firestore:{' '}
                  <code className="rounded bg-slate-100 px-1">impostazioni.preset_farmaci</code>.
                </p>
            <div className="mt-4 space-y-4">
              {presetFarmaciDraft.map((pack, pIdx) => (
                <details
                  key={pIdx}
                  className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60 shadow-sm [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100/80">
                    <span className="truncate">{pack.nome.trim() || `Preset farmaci ${pIdx + 1}`}</span>
                    <span
                      className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                      aria-hidden
                    >
                      ▼
                    </span>
                  </summary>
                  <div className="border-t border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block min-w-[12rem] flex-1 text-xs font-medium text-slate-600">
                      Nome preset
                      <input
                        type="text"
                        value={pack.nome}
                        onChange={(e) =>
                          setPresetFarmaciDraft((prev) =>
                            prev.map((pk, i) => (i === pIdx ? { ...pk, nome: e.target.value } : pk)),
                          )
                        }
                        disabled={isReadOnlyManifestazione}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                        placeholder="es. NAUSEA"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={isReadOnlyManifestazione}
                      onClick={() => setPresetFarmaciDraft((prev) => prev.filter((_, i) => i !== pIdx))}
                      className={`${opToolbarBtnSm} text-red-800`}
                    >
                      Rimuovi preset
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {pack.farmaci.map((f, fi) => (
                      <div
                        key={fi}
                        className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-white p-2"
                      >
                        <label className="min-w-[8rem] flex-1 text-xs font-medium text-slate-600">
                          Nome farmaco
                          <input
                            type="text"
                            value={f.nome}
                            onChange={(e) =>
                              setPresetFarmaciDraft((prev) =>
                                prev.map((pk, i) =>
                                  i !== pIdx
                                    ? pk
                                    : {
                                        ...pk,
                                        farmaci: pk.farmaci.map((row, j) =>
                                          j === fi ? { ...row, nome: e.target.value } : row,
                                        ),
                                      },
                                ),
                              )
                            }
                            disabled={isReadOnlyManifestazione}
                            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
                          />
                        </label>
                        <label className="min-w-[5rem] text-xs font-medium text-slate-600">
                          Dose
                          <input
                            type="text"
                            value={f.dose}
                            onChange={(e) =>
                              setPresetFarmaciDraft((prev) =>
                                prev.map((pk, i) =>
                                  i !== pIdx
                                    ? pk
                                    : {
                                        ...pk,
                                        farmaci: pk.farmaci.map((row, j) =>
                                          j === fi ? { ...row, dose: e.target.value } : row,
                                        ),
                                      },
                                ),
                              )
                            }
                            disabled={isReadOnlyManifestazione}
                            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
                          />
                        </label>
                        <label className="min-w-[4rem] text-xs font-medium text-slate-600">
                          Via
                          <select
                            value={f.via}
                            onChange={(e) => {
                              const v = e.target.value
                              if (!isFarmacoVia(v)) return
                              setPresetFarmaciDraft((prev) =>
                                prev.map((pk, i) =>
                                  i !== pIdx
                                    ? pk
                                    : {
                                        ...pk,
                                        farmaci: pk.farmaci.map((row, j) =>
                                          j === fi ? { ...row, via: v } : row,
                                        ),
                                      },
                                ),
                              )
                            }}
                            disabled={isReadOnlyManifestazione}
                            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
                          >
                            {FARMACO_VIE.map((via) => (
                              <option key={via} value={via}>
                                {FARMACO_VIA_LABEL[via]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          disabled={isReadOnlyManifestazione}
                          onClick={() =>
                            setPresetFarmaciDraft((prev) =>
                              prev.map((pk, i) =>
                                i !== pIdx
                                  ? pk
                                  : { ...pk, farmaci: pk.farmaci.filter((_, j) => j !== fi) },
                              ),
                            )
                          }
                          className={`${opToolbarBtnSm} text-red-800`}
                        >
                          Rimuovi
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={isReadOnlyManifestazione}
                      onClick={() =>
                        setPresetFarmaciDraft((prev) =>
                          prev.map((pk, i) =>
                            i !== pIdx
                              ? pk
                              : {
                                  ...pk,
                                  farmaci: [...pk.farmaci, { nome: '', dose: '', via: 'EV' as FarmacoVia }],
                                },
                          ),
                        )
                      }
                      className={opToolbarBtnSm}
                    >
                      Aggiungi farmaco al preset
                    </button>
                  </div>
                  </div>
                </details>
              ))}
              <button
                type="button"
                disabled={isReadOnlyManifestazione}
                onClick={() =>
                  setPresetFarmaciDraft((prev) => [
                    ...prev,
                    { nome: '', farmaci: [{ nome: '', dose: '', via: 'EV' }] },
                  ])
                }
                className={opToolbarBtnSm}
              >
                Aggiungi preset farmaci
              </button>
              {!isReadOnlyManifestazione ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={Boolean(savingSection) || !manifestazioneId}
                    onClick={() => void salvaPresetFarmaci()}
                    className={`${impSaveBtn} bg-orange-600 hover:bg-orange-500 focus-visible:ring-orange-300`}
                  >
                    {savingSection === 'preset_farmaci' ? 'Salvataggio…' : 'Salva preset farmaci'}
                  </button>
                </div>
              ) : null}
            </div>
              </div>
            </div>
          </details>

          <details name={IMP_ACC_NAME} className={IMP_DETAILS}>
            <summary className={IMP_SUMMARY}>
              <span>Testi</span>
              <span
                className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              >
                ▼
              </span>
            </summary>
            <div className={IMP_PANEL}>
              <p className="text-xs text-slate-500">
                In scheda paziente, dopo le note, se compilati. Il testo &quot;Rifiuto 112&quot; (invio in PS) compare
                solo con esito dimissione <strong className="text-slate-800">Rifiuta invio in PS</strong>. Campi:{' '}
                <code className="rounded bg-slate-100 px-1">impostazioni.consenso_generico_cure</code>,{' '}
                <code className="rounded bg-slate-100 px-1">impostazioni.consenso_privacy</code>,{' '}
                <code className="rounded bg-slate-100 px-1">impostazioni.rifiuto_invio_ps</code>.
              </p>
              <div className="mt-4 space-y-4">
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Consenso</span>
                  <textarea
                    value={consensoGenericoDraft}
                    onChange={(e) => setConsensoGenericoDraft(e.target.value)}
                    disabled={isReadOnlyManifestazione}
                    rows={6}
                    spellCheck={false}
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                    aria-label="Consenso (testo generico alle cure)"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Privacy</span>
                  <textarea
                    value={consensoPrivacyDraft}
                    onChange={(e) => setConsensoPrivacyDraft(e.target.value)}
                    disabled={isReadOnlyManifestazione}
                    rows={6}
                    spellCheck={false}
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                    aria-label="Privacy"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rifiuto 112</span>
                  <textarea
                    value={rifiutoInvioPsDraft}
                    onChange={(e) => setRifiutoInvioPsDraft(e.target.value)}
                    disabled={isReadOnlyManifestazione}
                    rows={6}
                    spellCheck={false}
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                    aria-label="Rifiuto 112 (rifiuto invio in pronto soccorso)"
                  />
                </label>
                {!isReadOnlyManifestazione ? (
                  <div className="mt-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      disabled={Boolean(savingSection) || !manifestazioneId}
                      onClick={() => void salvaConsensi()}
                      className={`${impSaveBtn} bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-300`}
                    >
                      {savingSection === 'consensi' ? 'Salvataggio…' : 'Salva testi'}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </details>

          <details name={IMP_ACC_NAME} className={IMP_DETAILS}>
            <summary className={IMP_SUMMARY}>
              <span>Altro</span>
              <span
                className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              >
                ▼
              </span>
            </summary>
            <div className={IMP_PANEL}>
              <h3 className={IMP_H3}>Elenco partecipanti (Excel)</h3>
              <p className="mt-2 text-xs text-slate-500">
                Primo foglio, colonne <strong className="text-slate-800">A–E</strong>: A = pettorale, B = nome, C =
                cognome, D = data di nascita, E = telefono. Formati data:{' '}
                <code className="rounded bg-slate-100 px-1">gg/mm/aaaa</code>,{' '}
                <code className="rounded bg-slate-100 px-1">aaaa-mm-gg</code> o cella data Excel. L&apos;elenco viene
                salvato in{' '}
                <code className="rounded bg-slate-100 px-1">impostazioni.partecipanti_elenco</code> e usato in scheda
                paziente (ricerca accanto al pettorale).
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                Righe caricate: <span className="tabular-nums">{partecipantiElencoCount}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label
                  className={`inline-flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100 ${
                    isReadOnlyManifestazione || partExcelBusy || !manifestazioneId
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="sr-only"
                    disabled={isReadOnlyManifestazione || partExcelBusy || !manifestazioneId}
                    onChange={(ev) => void onPartecipantiExcel(ev)}
                  />
                  {partExcelBusy ? 'Lettura…' : 'Carica Excel'}
                </label>
                {!isReadOnlyManifestazione && partecipantiElencoCount > 0 ? (
                  <button
                    type="button"
                    disabled={partExcelBusy}
                    onClick={() => void rimuoviElencoPartecipanti()}
                    className={`${opToolbarBtnSm} border-red-200 text-red-800 hover:bg-red-50`}
                  >
                    Rimuovi elenco
                  </button>
                ) : null}
              </div>
            </div>
          </details>

        </div>
      ) : null}
          </>
        }
        aside={
          <div className="space-y-4">
            <section className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Guida rapida</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Le sezioni <strong className="text-slate-900">Evento</strong> e{' '}
                <strong className="text-slate-900">Cartella clinica</strong> sono aperte di default;{' '}
                <strong className="text-slate-900">Consumati</strong>, <strong className="text-slate-900">Preset</strong>,{' '}
                <strong className="text-slate-900">Testi</strong> e <strong className="text-slate-900">Altro</strong> sono
                richiudibili (Consumati è solo lettura: farmaci usati per PMA). Ogni area configurabile ha
                il proprio pulsante <strong className="text-slate-900">Salva</strong>: un solo{' '}
                <code className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-1 font-mono text-xs">updateDoc</code>{' '}
                con i campi di quella sezione. Prestazioni e farmaci: una riga per voce; tipo evento e dettagli per tipo
                separati; EO per tab clinico; preset dimissione e preset farmaci nello stesso blocco; testi legali in un
                salvataggio. L&apos;Excel partecipanti è in <strong className="text-slate-900">Altro</strong> e viene
                scritto su Firestore al caricamento.
              </p>
            </section>
            {isReadOnlyManifestazione ? (
              <section className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <p className="text-sm leading-relaxed text-slate-700">
                  Con il tuo profilo puoi consultare le impostazioni generali della manifestazione; la modifica e
                  il salvataggio non sono abilitati (matrice permessi).
                </p>
              </section>
            ) : null}
          </div>
        }
      />
    </div>
  )
}
