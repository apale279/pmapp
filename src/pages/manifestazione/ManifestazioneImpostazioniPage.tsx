import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { deleteField, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSyncLive } from '../../context/SyncLiveContext'
import { db } from '../../lib/firebase'
import { ChipTagField } from '../../components/manifestazione/ChipTagField'
import { OperativePageGrid } from '../../components/layout/OperativePageGrid'
import { opPrimaryBtn, opToolbarBtnSm } from '../../components/layout/operativeTokens'
import {
  EO_CLINICAL_TABS,
  firstEoRapidoDefaultFromDrafts,
  parseLinesToValues,
  type EoTabKey,
} from '../../lib/multilineList'
import { sortRecordKeysAndValuesIt, sortStringsIt } from '../../lib/sortLocaleIt'
import { manifestazioneImpostazioniAllows } from '../../lib/rankMatrix'
import {
  parsePresetDimissioneFromFirestore,
  type PresetDimissioneVoce,
} from '../../types/manifestazioneImpostazioni'
import { parsePartecipantiExcelFile } from '../../lib/parsePartecipantiExcel'

/** Testo textarea → righe pulite, deduplicate, ordinate, rimesse su righe. */
function sortLinesText(text: string): string {
  return sortStringsIt(parseLinesToValues(text)).join('\n')
}

/** Per Firestore: trim righe, senza vuoti, senza duplicati, ordine alfabetico. */
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
  const [openAcc, setOpenAcc] = useState<Record<string, boolean>>({})

  const [partecipantiElencoCount, setPartecipantiElencoCount] = useState(0)
  const [partExcelBusy, setPartExcelBusy] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
          nextEoDraft[k] = (eoObj[k] ?? []).join('\n')
        }
        setEoDraft(nextEoDraft)

        setConsensoGenericoDraft(
          typeof imp.consenso_generico_cure === 'string' ? imp.consenso_generico_cure : '',
        )
        setConsensoPrivacyDraft(typeof imp.consenso_privacy === 'string' ? imp.consenso_privacy : '')
        setRifiutoInvioPsDraft(typeof imp.rifiuto_invio_ps === 'string' ? imp.rifiuto_invio_ps : '')
        setPresetDimissioneDraft(parsePresetDimissioneFromFirestore(imp.preset_dimissione))

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

  const salva = useCallback(async () => {
    if (isReadOnlyManifestazione) return
    if (!db || !manifestazioneId) return
    setSaving(true)
    setError(null)
    setSaved(null)
    try {
      const ref = doc(db, 'manifestazioni', manifestazioneId)
      const detFiltered: Record<string, string[]> = {}
      for (const t of tipoEvento) {
        detFiltered[t] = sortStringsIt(parseLinesToValues(dettaglioDraft[t] ?? ''))
      }
      const eoPayload: Record<string, string[]> = {}
      for (const k of EO_CLINICAL_TABS) {
        eoPayload[k] = parseLinesToValues(eoDraft[k] ?? '')
      }
      const defaultPrim = firstEoRapidoDefaultFromDrafts(eoDraft)

      const prestazioniLista = listFromMultilineText(prestazioniDraft)
      const farmaciLista = listFromMultilineText(farmaciDraft)
      const presetPayload = presetDimissioneDraft
        .map((row) => ({ titolo: row.titolo.trim(), testo: row.testo }))
        .filter((row) => row.titolo || row.testo.trim())

      await updateDoc(ref, {
        prestazioni_lista: prestazioniLista,
        farmaci_lista: farmaciLista,
        tipo_evento: sortStringsIt(tipoEvento),
        dettaglio_evento: sortRecordKeysAndValuesIt(detFiltered),
        dettaglio_eo_rapido: eoPayload,
        'impostazioni.prestazioni_imp': prestazioniLista,
        'impostazioni.farmaci_imp': farmaciLista,
        'impostazioni.consenso_generico_cure': consensoGenericoDraft,
        'impostazioni.consenso_privacy': consensoPrivacyDraft,
        'impostazioni.rifiuto_invio_ps': rifiutoInvioPsDraft,
        'impostazioni.preset_dimissione': presetPayload,
        ...(defaultPrim
          ? { dettaglio_eo_rapido_default: defaultPrim }
          : { dettaglio_eo_rapido_default: deleteField() }),
      })
      setSaved('Salvataggio completato.')
      bumpSync()
      window.setTimeout(() => setSaved(null), 5000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }, [
    isReadOnlyManifestazione,
    manifestazioneId,
    prestazioniDraft,
    farmaciDraft,
    tipoEvento,
    dettaglioDraft,
    eoDraft,
    consensoGenericoDraft,
    consensoPrivacyDraft,
    rifiutoInvioPsDraft,
    presetDimissioneDraft,
    bumpSync,
  ])

  const toggleAcc = (tipo: string) => {
    setOpenAcc((o) => ({ ...o, [tipo]: !o[tipo] }))
  }

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

  useEffect(() => {
    setOpenAcc((prev) => {
      const next = { ...prev }
      const prevKeys = new Set(Object.keys(next))
      if (tipoEvento.length && tipoEvento.every((t) => !prevKeys.has(t))) {
        next[tipoEvento[0]] = true
      }
      for (const k of Object.keys(next)) {
        if (!tipoEvento.includes(k)) delete next[k]
      }
      return next
    })
  }, [tipoEvento])

  return (
    <div className="pma-dashboard mx-auto w-full max-w-[1920px] pb-12">
      <OperativePageGrid
        main={
          <>
            <header className="mb-6 overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-sm">
              <div className="pma-bar flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#9090b8]">
                    Manifestazione
                  </div>
                  <h1 className="pma-bar__id mt-0.5 text-lg font-semibold leading-tight">
                    Impostazioni manifestazione
                    {isReadOnlyManifestazione ? (
                      <span className="ml-2 text-sm font-normal text-[#a8a8c8]">(sola lettura)</span>
                    ) : null}
                  </h1>
                  <p className="mt-1 text-xs text-[#a8a8c8]">
                    Documento: manifestazioni/{manifestazioneId || '—'}
                  </p>
                </div>
                <div className="pma-bar__right flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                  <Link
                    to={`/manifestazione/${encodeURIComponent(manifestazioneId)}`}
                    className={`${opToolbarBtnSm} inline-flex justify-center border-slate-600 bg-slate-800 no-underline hover:bg-slate-700`}
                  >
                    Torna alla dashboard
                  </Link>
                  {!isReadOnlyManifestazione ? (
                    <button
                      type="button"
                      disabled={saving || !manifestazioneId}
                      onClick={() => void salva()}
                      className={`${opPrimaryBtn} inline-flex items-center justify-center gap-2`}
                    >
                      {saving ? (
                        <>
                          <span
                            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                            aria-hidden
                          />
                          <span>Salvataggio…</span>
                        </>
                      ) : (
                        'Salva impostazioni'
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            </header>

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
        <div className="space-y-10">
          <section className="rounded-lg border border-[#e2e8f0] bg-white px-6 py-6 sm:px-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Liste cliniche</h2>
            <div className="mt-4 space-y-8">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">Elenco prestazioni</span>
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
                  <code className="rounded bg-slate-100 px-1">impostazioni.prestazioni_imp</code>. Un valore
                  per riga.
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
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">Elenco farmaci</span>
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
                  <code className="rounded bg-slate-100 px-1">impostazioni.farmaci_imp</code>. Un valore per
                  riga.
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
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#e2e8f0] bg-white px-6 py-6 sm:px-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Tipo evento</h2>
            <p className="mt-1 text-xs text-slate-500">
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
          </section>

          <section className="rounded-lg border border-[#e2e8f0] bg-white px-6 py-6 sm:px-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Dettaglio evento per tipo
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Una sezione per ogni tipo. Un valore per riga (andata a capo). Campo:{' '}
              <code className="rounded bg-slate-100 px-1">dettaglio_evento</code>. Al salvataggio le righe di ogni
              tipo sono ordinate alfabeticamente (come richiesto per questo campo).
            </p>
            {tipoEvento.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Aggiungi almeno un tipo evento per configurare i dettagli.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {tipoEvento.map((tipo) => {
                  const open = Boolean(openAcc[tipo])
                  return (
                    <div key={tipo} className="overflow-hidden rounded-lg border border-[#e2e8f0]">
                      <button
                        type="button"
                        onClick={() => toggleAcc(tipo)}
                        className="flex w-full items-center justify-between gap-2 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-100"
                        aria-expanded={open}
                      >
                        <span>{tipo}</span>
                        <span className="text-slate-500">{open ? '▼' : '▶'}</span>
                      </button>
                      {open ? (
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
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-[#e2e8f0] bg-white px-6 py-6 sm:px-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Dettaglio EO rapido (tab clinici)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
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
            </div>
          </section>

          <section className="rounded-lg border border-[#e2e8f0] bg-white px-6 py-6 sm:px-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Preset dimissione</h2>
            <p className="mt-1 text-xs text-slate-500">
              Il medico può importare uno o più testi nelle <strong className="text-slate-800">note di dimissione</strong>{' '}
              dalla scheda. Campo Firestore:{' '}
              <code className="rounded bg-slate-100 px-1">impostazioni.preset_dimissione</code> (array di oggetti{' '}
              <code className="rounded bg-slate-100 px-1">titolo</code>, <code className="rounded bg-slate-100 px-1">testo</code>
              ).
            </p>
            <div className="mt-4 space-y-4">
              {presetDimissioneDraft.map((row, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 shadow-sm"
                >
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
            </div>
          </section>

          <section className="rounded-lg border border-[#e2e8f0] bg-white px-6 py-6 sm:px-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Elenco partecipanti (Excel)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Primo foglio, colonne <strong className="text-slate-800">A–E</strong>: A = pettorale, B = nome, C =
              cognome, D = data di nascita, E = telefono. Formati data: <code className="rounded bg-slate-100 px-1">gg/mm/aaaa</code>,{' '}
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
          </section>

          <section className="rounded-lg border border-[#e2e8f0] bg-white px-6 py-6 sm:px-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Testi legali dimissione (in fondo alle impostazioni)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Consensi sempre mostrati in scheda dopo le note (se compilati). Il testo &quot;Rifiuto invio in PS&quot; è
              visibile solo se l&apos;esito dimissione è <strong className="text-slate-800">Rifiuta invio in PS</strong>.
              Campi:{' '}
              <code className="rounded bg-slate-100 px-1">impostazioni.consenso_generico_cure</code>,{' '}
              <code className="rounded bg-slate-100 px-1">impostazioni.consenso_privacy</code>,{' '}
              <code className="rounded bg-slate-100 px-1">impostazioni.rifiuto_invio_ps</code>.
            </p>
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Consenso generico alle cure
                </span>
                <textarea
                  value={consensoGenericoDraft}
                  onChange={(e) => setConsensoGenericoDraft(e.target.value)}
                  disabled={isReadOnlyManifestazione}
                  rows={6}
                  spellCheck={false}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  aria-label="Testo consenso generico alle cure"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Consenso privacy
                </span>
                <textarea
                  value={consensoPrivacyDraft}
                  onChange={(e) => setConsensoPrivacyDraft(e.target.value)}
                  disabled={isReadOnlyManifestazione}
                  rows={6}
                  spellCheck={false}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  aria-label="Testo consenso privacy"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Rifiuto invio in PS
                </span>
                <textarea
                  value={rifiutoInvioPsDraft}
                  onChange={(e) => setRifiutoInvioPsDraft(e.target.value)}
                  disabled={isReadOnlyManifestazione}
                  rows={6}
                  spellCheck={false}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  aria-label="Testo rifiuto invio in PS"
                />
              </label>
            </div>
          </section>

        </div>
      ) : null}
          </>
        }
        aside={
          <div className="space-y-4">
            <section className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Guida rapida</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Prestazioni e farmaci: una riga per voce; usa &quot;Ordina Alfabeticamente&quot; per pulire e
                ordinare. Tipo evento = evento lesivo (es. trauma).{' '}
                <strong className="text-slate-900">Dettaglio evento per tipo</strong>: al salvataggio righe
                pulite, chiavi e valori ordinati alfabeticamente.{' '}
                <strong className="text-slate-900">Dettaglio EO rapido</strong>: l&apos;ordine delle righe è
                clinico — non viene mai riordinato alfabeticamente. Il primo valore EO non vuoto seguendo le tab
                (GENERALE, poi le altre) definisce{' '}
                <code className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-1 font-mono text-xs">
                  dettaglio_eo_rapido_default
                </code>
                .{' '}
                <code className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-1 font-mono text-xs">
                  updateDoc
                </code>{' '}
                aggiorna solo i campi indicati. L&apos;Excel partecipanti si carica dalla sezione dedicata e non
                richiede &quot;Salva impostazioni&quot;: viene scritto subito su Firestore.
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
