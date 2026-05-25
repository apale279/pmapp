import { deleteField, doc, getDoc, updateDoc, type Firestore } from 'firebase/firestore'
import { saveAs } from 'file-saver'
import { EO_CLINICAL_TABS, type EoTabKey } from './multilineList'
import { normalizeEoQuickLabels } from './eoQuickSelection'
import { sortRecordKeysAndValuesIt, sortStringsIt } from './sortLocaleIt'
import {
  parsePresetDimissioneFromFirestore,
  parsePresetFarmaciFromFirestore,
  type PresetDimissioneVoce,
  type PresetFarmaciPack,
} from '../types/manifestazioneImpostazioni'
import { parsePartecipantiElencoFromFirestore } from '../types/manifestazionePartecipanti'
import type { Pma } from '../types/pma'
import { firstEoRapidoDefaultFromDrafts } from './multilineList'

export const PMA_IMPOSTAZIONI_CSV_VERSION = 1

export type PmaImpostazioniManifestazioneBundle = {
  prestazioni: string[]
  farmaci: string[]
  tipo_evento: string[]
  dettaglio_evento: Record<string, string[]>
  dettaglio_eo_rapido: Record<string, string[]>
  dettaglio_eo_rapido_default: string
  consenso_generico_cure: string
  consenso_privacy: string
  rifiuto_invio_ps: string
  preset_dimissione: PresetDimissioneVoce[]
  preset_farmaci: PresetFarmaciPack[]
  partecipanti_elenco: ReturnType<typeof parsePartecipantiElencoFromFirestore>
}

export type PmaImpostazioniExportBundle = {
  version: typeof PMA_IMPOSTAZIONI_CSV_VERSION
  source_pma_id: string
  source_manifestazione_id: string
  pma: {
    posti_letto: number
    elenco_farmaci_usati: string[]
  }
  manifestazione: PmaImpostazioniManifestazioneBundle
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
}

function impRecord(d: Record<string, unknown>): Record<string, unknown> {
  const imp = d.impostazioni
  return imp && typeof imp === 'object' && imp !== null ? (imp as Record<string, unknown>) : {}
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
    if (a.length) return sortStringsIt(a)
  }
  const top = asStringArray(d[topKey])
  return sortStringsIt(top)
}

function parseDettaglioEvento(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const out: Record<string, string[]> = {}
  for (const [k, val] of Object.entries(o)) {
    const arr = asStringArray(val)
    if (arr.length) out[k.trim()] = sortStringsIt(arr)
  }
  return out
}

function pickDettaglioEvento(d: Record<string, unknown>, imp: Record<string, unknown>): Record<string, string[]> {
  for (const raw of [d.dettaglio_evento, imp.dettaglio_evento, imp.dettaglio_evento_per_tipo]) {
    const m = parseDettaglioEvento(raw)
    if (Object.keys(m).length > 0) return sortRecordKeysAndValuesIt(m)
  }
  const out: Record<string, string[]> = {}
  for (const [k, val] of Object.entries(d)) {
    if (!k.startsWith('dettaglio_evento.')) continue
    const tipo = k.slice('dettaglio_evento.'.length).trim()
    if (!tipo) continue
    const arr = asStringArray(val)
    if (arr.length) out[tipo] = sortStringsIt(arr)
  }
  return sortRecordKeysAndValuesIt(out)
}

function normalizeDettaglioEo(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object') {
    return Object.fromEntries(EO_CLINICAL_TABS.map((k) => [k, []])) as Record<string, string[]>
  }
  const o = raw as Record<string, unknown>
  const out = Object.fromEntries(EO_CLINICAL_TABS.map((k) => [k, []])) as Record<string, string[]>
  for (const k of EO_CLINICAL_TABS) {
    out[k] = normalizeEoQuickLabels(asStringArray(o[k]))
  }
  const legacy = asStringArray(o.CAPO_COLLO)
  if (legacy.length) {
    out['CAPO/COLLO'] = [...new Set([...out['CAPO/COLLO'], ...legacy])]
  }
  return out
}

function mergeFarmaciUsati(d: Record<string, unknown>): string[] {
  const imp = d.impostazioni_pma
  let fromNested: string[] = []
  if (imp && typeof imp === 'object' && imp !== null && 'elenco_farmaci_usati' in imp) {
    fromNested = asStringArray((imp as { elenco_farmaci_usati?: unknown }).elenco_farmaci_usati)
  }
  const fromLegacy = asStringArray(d.farmaci_usati)
  return [...new Set([...fromNested, ...fromLegacy])].sort((a, b) => a.localeCompare(b, 'it'))
}

function parsePmaFromDoc(docId: string, d: Record<string, unknown>): Pick<Pma, 'id' | 'impostazioni_pma'> {
  const imp = d.impostazioni_pma
  let posti = 0
  if (imp && typeof imp === 'object' && imp !== null) {
    const n = Number((imp as { posti_letto?: unknown }).posti_letto)
    if (Number.isFinite(n)) posti = Math.floor(n)
  }
  return {
    id: docId,
    impostazioni_pma: {
      posti_letto: posti,
      elenco_farmaci_usati: mergeFarmaciUsati(d),
    },
  }
}

function manifestazioneBundleFromDoc(d: Record<string, unknown>): PmaImpostazioniManifestazioneBundle {
  const imp = impRecord(d)
  let tipo: string[] = []
  for (const raw of [d.tipo_evento, imp.tipo_evento, imp.tipo_evento_list]) {
    const a = asStringArray(raw)
    if (a.length) {
      tipo = sortStringsIt(a)
      break
    }
  }
  const eo = normalizeDettaglioEo(d.dettaglio_eo_rapido ?? imp.dettaglio_eo_rapido ?? imp.eo_quick_imp)
  const defaultEo =
    typeof d.dettaglio_eo_rapido_default === 'string'
      ? d.dettaglio_eo_rapido_default.trim()
      : typeof imp.dettaglio_eo_rapido_default === 'string'
        ? imp.dettaglio_eo_rapido_default.trim()
        : ''

  return {
    prestazioni: pickPrestazioniFarmaci(d, imp, 'prestazioni'),
    farmaci: pickPrestazioniFarmaci(d, imp, 'farmaci'),
    tipo_evento: tipo,
    dettaglio_evento: pickDettaglioEvento(d, imp),
    dettaglio_eo_rapido: eo,
    dettaglio_eo_rapido_default: defaultEo,
    consenso_generico_cure: typeof imp.consenso_generico_cure === 'string' ? imp.consenso_generico_cure : '',
    consenso_privacy: typeof imp.consenso_privacy === 'string' ? imp.consenso_privacy : '',
    rifiuto_invio_ps: typeof imp.rifiuto_invio_ps === 'string' ? imp.rifiuto_invio_ps : '',
    preset_dimissione: parsePresetDimissioneFromFirestore(imp.preset_dimissione),
    preset_farmaci: parsePresetFarmaciFromFirestore(imp.preset_farmaci),
    partecipanti_elenco: parsePartecipantiElencoFromFirestore(imp.partecipanti_elenco),
  }
}

export async function fetchPmaImpostazioniBundle(
  db: Firestore,
  pmaId: string,
): Promise<PmaImpostazioniExportBundle> {
  const id = pmaId.trim()
  if (!id) throw new Error('PMA sorgente mancante.')

  const pmaSnap = await getDoc(doc(db, 'pma', id))
  if (!pmaSnap.exists()) throw new Error(`PMA "${id}" non trovato.`)

  const pmaData = pmaSnap.data() as Record<string, unknown>
  const manId =
    typeof pmaData.id_manifestazione === 'string' ? pmaData.id_manifestazione.trim() : ''
  if (!manId) throw new Error('PMA senza manifestazione collegata.')

  const manSnap = await getDoc(doc(db, 'manifestazioni', manId))
  if (!manSnap.exists()) throw new Error(`Manifestazione "${manId}" non trovata.`)

  const parsedPma = parsePmaFromDoc(pmaSnap.id, pmaData)

  return {
    version: PMA_IMPOSTAZIONI_CSV_VERSION,
    source_pma_id: id,
    source_manifestazione_id: manId,
    pma: {
      posti_letto: parsedPma.impostazioni_pma.posti_letto,
      elenco_farmaci_usati: parsedPma.impostazioni_pma.elenco_farmaci_usati ?? [],
    },
    manifestazione: manifestazioneBundleFromDoc(manSnap.data() as Record<string, unknown>),
  }
}

function csvEscapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

function bundleToCsvRows(bundle: PmaImpostazioniExportBundle): string[] {
  const rows: string[] = ['sezione,chiave,valore']
  const push = (sezione: string, chiave: string, valore: string) => {
    rows.push(`${csvEscapeCell(sezione)},${csvEscapeCell(chiave)},${csvEscapeCell(valore)}`)
  }

  push('meta', 'versione', String(bundle.version))
  push('meta', 'pma_sorgente', bundle.source_pma_id)
  push('meta', 'manifestazione_sorgente', bundle.source_manifestazione_id)
  push('pma', 'posti_letto', String(bundle.pma.posti_letto))
  for (const f of bundle.pma.elenco_farmaci_usati) push('pma', 'farmaco_usato', f)

  const m = bundle.manifestazione
  for (const p of m.prestazioni) push('manifestazione', 'prestazione', p)
  for (const f of m.farmaci) push('manifestazione', 'farmaco', f)
  for (const t of m.tipo_evento) push('manifestazione', 'tipo_evento', t)
  for (const [tipo, vals] of Object.entries(m.dettaglio_evento)) {
    for (const v of vals) push('manifestazione', `dettaglio_evento|${tipo}`, v)
  }
  for (const tab of EO_CLINICAL_TABS) {
    for (const v of m.dettaglio_eo_rapido[tab] ?? []) {
      push('manifestazione', `dettaglio_eo_rapido|${tab}`, v)
    }
  }
  if (m.dettaglio_eo_rapido_default) {
    push('manifestazione', 'dettaglio_eo_rapido_default', m.dettaglio_eo_rapido_default)
  }
  push('manifestazione', 'consenso_generico_cure', m.consenso_generico_cure)
  push('manifestazione', 'consenso_privacy', m.consenso_privacy)
  push('manifestazione', 'rifiuto_invio_ps', m.rifiuto_invio_ps)
  if (m.preset_dimissione.length) {
    push('manifestazione', 'preset_dimissione_json', JSON.stringify(m.preset_dimissione))
  }
  if (m.preset_farmaci.length) {
    push('manifestazione', 'preset_farmaci_json', JSON.stringify(m.preset_farmaci))
  }
  if (m.partecipanti_elenco.length) {
    push('manifestazione', 'partecipanti_elenco_json', JSON.stringify(m.partecipanti_elenco))
  }

  return rows
}

export function downloadPmaImpostazioniCsv(bundle: PmaImpostazioniExportBundle, filename?: string): void {
  const name =
    filename ??
    `PMApp_impostazioni_${bundle.source_pma_id}_${new Date().toISOString().slice(0, 10)}.csv`
  const blob = new Blob(['\uFEFF', bundleToCsvRows(bundle).join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  })
  saveAs(blob, name)
}

export function parsePmaImpostazioniCsv(text: string): PmaImpostazioniExportBundle {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) throw new Error('File CSV vuoto o non valido.')

  const header = parseCsvLine(lines[0]).map((c) => c.trim().toLowerCase())
  if (header[0] !== 'sezione' || header[1] !== 'chiave' || header[2] !== 'valore') {
    throw new Error('Intestazione CSV non riconosciuta (attese colonne: sezione, chiave, valore).')
  }

  let version = PMA_IMPOSTAZIONI_CSV_VERSION
  let sourcePma = ''
  let sourceMan = ''
  let postiLetto = 0
  const farmaciUsati: string[] = []
  const prestazioni: string[] = []
  const farmaci: string[] = []
  const tipoEvento: string[] = []
  const dettaglioEvento: Record<string, string[]> = {}
  const dettaglioEo: Record<string, string[]> = Object.fromEntries(
    EO_CLINICAL_TABS.map((k) => [k, []]),
  ) as Record<string, string[]>
  let eoDefault = ''
  let consensoGenerico = ''
  let consensoPrivacy = ''
  let rifiutoPs = ''
  let presetDimissione: PresetDimissioneVoce[] = []
  let presetFarmaci: PresetFarmaciPack[] = []
  let partecipanti: ReturnType<typeof parsePartecipantiElencoFromFirestore> = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    if (cols.length < 3) continue
    const sezione = cols[0].trim()
    const chiave = cols[1].trim()
    const valore = cols.slice(2).join(',').trim()
    if (!sezione || !chiave) continue

    if (sezione === 'meta') {
      if (chiave === 'versione') version = Number(valore) || PMA_IMPOSTAZIONI_CSV_VERSION
      if (chiave === 'pma_sorgente') sourcePma = valore
      if (chiave === 'manifestazione_sorgente') sourceMan = valore
      continue
    }

    if (sezione === 'pma') {
      if (chiave === 'posti_letto') {
        const n = Number(valore)
        if (Number.isFinite(n) && n >= 0) postiLetto = Math.floor(n)
      } else if (chiave === 'farmaco_usato' && valore) {
        farmaciUsati.push(valore)
      }
      continue
    }

    if (sezione !== 'manifestazione') continue

    if (chiave === 'prestazione' && valore) prestazioni.push(valore)
    else if (chiave === 'farmaco' && valore) farmaci.push(valore)
    else if (chiave === 'tipo_evento' && valore) tipoEvento.push(valore)
    else if (chiave.startsWith('dettaglio_evento|') && valore) {
      const tipo = chiave.slice('dettaglio_evento|'.length).trim()
      if (!tipo) continue
      if (!dettaglioEvento[tipo]) dettaglioEvento[tipo] = []
      dettaglioEvento[tipo].push(valore)
    } else if (chiave.startsWith('dettaglio_eo_rapido|') && valore) {
      const tab = chiave.slice('dettaglio_eo_rapido|'.length).trim() as EoTabKey
      if (!(tab in dettaglioEo)) continue
      dettaglioEo[tab].push(valore)
    } else if (chiave === 'dettaglio_eo_rapido_default') eoDefault = valore
    else if (chiave === 'consenso_generico_cure') consensoGenerico = valore
    else if (chiave === 'consenso_privacy') consensoPrivacy = valore
    else if (chiave === 'rifiuto_invio_ps') rifiutoPs = valore
    else if (chiave === 'preset_dimissione_json' && valore) {
      presetDimissione = parsePresetDimissioneFromFirestore(JSON.parse(valore))
    } else if (chiave === 'preset_farmaci_json' && valore) {
      presetFarmaci = parsePresetFarmaciFromFirestore(JSON.parse(valore))
    } else if (chiave === 'partecipanti_elenco_json' && valore) {
      partecipanti = parsePartecipantiElencoFromFirestore(JSON.parse(valore))
    }
  }

  if (version !== PMA_IMPOSTAZIONI_CSV_VERSION) {
    throw new Error(`Versione CSV non supportata: ${version}`)
  }

  for (const tab of EO_CLINICAL_TABS) {
    dettaglioEo[tab] = normalizeEoQuickLabels(dettaglioEo[tab] ?? [])
  }

  return {
    version: PMA_IMPOSTAZIONI_CSV_VERSION,
    source_pma_id: sourcePma,
    source_manifestazione_id: sourceMan,
    pma: {
      posti_letto: postiLetto,
      elenco_farmaci_usati: sortStringsIt([...new Set(farmaciUsati)]),
    },
    manifestazione: {
      prestazioni: sortStringsIt(prestazioni),
      farmaci: sortStringsIt(farmaci),
      tipo_evento: sortStringsIt(tipoEvento),
      dettaglio_evento: sortRecordKeysAndValuesIt(dettaglioEvento),
      dettaglio_eo_rapido: dettaglioEo,
      dettaglio_eo_rapido_default: eoDefault,
      consenso_generico_cure: consensoGenerico,
      consenso_privacy: consensoPrivacy,
      rifiuto_invio_ps: rifiutoPs,
      preset_dimissione: presetDimissione,
      preset_farmaci: presetFarmaci,
      partecipanti_elenco: partecipanti,
    },
  }
}

export async function applyPmaImpostazioniImport(
  db: Firestore,
  targetPmaId: string,
  bundle: PmaImpostazioniExportBundle,
): Promise<{ targetManifestazioneId: string }> {
  const pmaId = targetPmaId.trim()
  if (!pmaId) throw new Error('PMA destinazione mancante.')

  const pmaRef = doc(db, 'pma', pmaId)
  const pmaSnap = await getDoc(pmaRef)
  if (!pmaSnap.exists()) throw new Error(`PMA destinazione "${pmaId}" non trovato.`)

  const targetManId =
    typeof pmaSnap.data()?.id_manifestazione === 'string'
      ? (pmaSnap.data()?.id_manifestazione as string).trim()
      : ''
  if (!targetManId) throw new Error('PMA destinazione senza manifestazione collegata.')

  const manRef = doc(db, 'manifestazioni', targetManId)
  const manSnap = await getDoc(manRef)
  if (!manSnap.exists()) throw new Error(`Manifestazione "${targetManId}" non trovata.`)

  await updateDoc(pmaRef, {
    'impostazioni_pma.posti_letto': bundle.pma.posti_letto,
    'impostazioni_pma.elenco_farmaci_usati': bundle.pma.elenco_farmaci_usati,
  })

  const m = bundle.manifestazione
  const manPatch: Record<string, unknown> = {
    prestazioni_lista: m.prestazioni,
    'impostazioni.prestazioni_imp': m.prestazioni,
    farmaci_lista: m.farmaci,
    'impostazioni.farmaci_imp': m.farmaci,
    tipo_evento: m.tipo_evento,
    'impostazioni.consenso_generico_cure': m.consenso_generico_cure,
    'impostazioni.consenso_privacy': m.consenso_privacy,
    'impostazioni.rifiuto_invio_ps': m.rifiuto_invio_ps,
    'impostazioni.preset_dimissione': m.preset_dimissione,
    'impostazioni.preset_farmaci': m.preset_farmaci,
  }

  for (const tab of EO_CLINICAL_TABS) {
    manPatch[`dettaglio_eo_rapido.${tab}`] = m.dettaglio_eo_rapido[tab] ?? []
  }
  if (m.dettaglio_eo_rapido_default.trim()) {
    manPatch.dettaglio_eo_rapido_default = m.dettaglio_eo_rapido_default.trim()
  } else {
    manPatch.dettaglio_eo_rapido_default = deleteField()
  }

  for (const [tipo, vals] of Object.entries(m.dettaglio_evento)) {
    manPatch[`dettaglio_evento.${tipo}`] = vals
  }

  if (m.partecipanti_elenco.length > 0) {
    manPatch['impostazioni.partecipanti_elenco'] = m.partecipanti_elenco
  }

  await updateDoc(manRef, manPatch)

  return { targetManifestazioneId: targetManId }
}

/** Costruisce bundle dai draft correnti della pagina impostazioni + PMA selezionato. */
export function buildPmaImpostazioniBundleFromDrafts(params: {
  sourcePmaId: string
  sourceManifestazioneId: string
  postiLetto: number
  elencoFarmaciUsati: string[]
  prestazioniDraft: string
  farmaciDraft: string
  tipoEvento: string[]
  dettaglioDraft: Record<string, string>
  eoDraft: Record<EoTabKey, string>
  consensoGenericoDraft: string
  consensoPrivacyDraft: string
  rifiutoInvioPsDraft: string
  presetDimissioneDraft: PresetDimissioneVoce[]
  presetFarmaciDraft: PresetFarmaciPack[]
  partecipantiElenco: ReturnType<typeof parsePartecipantiElencoFromFirestore>
}): PmaImpostazioniExportBundle {
  const dettaglio: Record<string, string[]> = {}
  for (const t of params.tipoEvento) {
    const lines = params.dettaglioDraft[t]?.split('\n').map((s) => s.trim()).filter(Boolean) ?? []
    if (lines.length) dettaglio[t] = sortStringsIt(lines)
  }
  const eo: Record<string, string[]> = {}
  for (const tab of EO_CLINICAL_TABS) {
    eo[tab] = normalizeEoQuickLabels(
      (params.eoDraft[tab] ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
    )
  }

  return {
    version: PMA_IMPOSTAZIONI_CSV_VERSION,
    source_pma_id: params.sourcePmaId,
    source_manifestazione_id: params.sourceManifestazioneId,
    pma: {
      posti_letto: params.postiLetto,
      elenco_farmaci_usati: sortStringsIt(params.elencoFarmaciUsati),
    },
    manifestazione: {
      prestazioni: sortStringsIt(
        params.prestazioniDraft.split('\n').map((s) => s.trim()).filter(Boolean),
      ),
      farmaci: sortStringsIt(params.farmaciDraft.split('\n').map((s) => s.trim()).filter(Boolean)),
      tipo_evento: sortStringsIt(params.tipoEvento),
      dettaglio_evento: sortRecordKeysAndValuesIt(dettaglio),
      dettaglio_eo_rapido: eo,
      dettaglio_eo_rapido_default: firstEoRapidoDefaultFromDrafts(params.eoDraft) ?? '',
      consenso_generico_cure: params.consensoGenericoDraft,
      consenso_privacy: params.consensoPrivacyDraft,
      rifiuto_invio_ps: params.rifiutoInvioPsDraft,
      preset_dimissione: params.presetDimissioneDraft,
      preset_farmaci: params.presetFarmaciDraft,
      partecipanti_elenco: params.partecipantiElenco,
    },
  }
}
