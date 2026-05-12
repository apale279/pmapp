import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  FARMACI_LISTA_DEFAULT,
  PRESTAZIONI_LISTA_DEFAULT,
} from '../lib/prestazioniFarmaciDefaults'
import { sortRecordKeysAndValuesIt, sortStringsIt } from '../lib/sortLocaleIt'
import { EO_CLINICAL_TABS } from '../lib/multilineList'
import { EO_OPZIONI_RAPIDE } from '../types/cartellaClinica'

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  const out: string[] = []
  for (const x of v) {
    if (typeof x === 'string' && x.trim() !== '') out.push(x.trim())
  }
  return out
}

function impRecord(d: Record<string, unknown>): Record<string, unknown> {
  const imp = d.impostazioni
  return imp && typeof imp === 'object' && imp !== null ? (imp as Record<string, unknown>) : {}
}

function pickStringList(
  d: Record<string, unknown>,
  imp: Record<string, unknown>,
  impKeys: string[],
  topKeys: string[],
): string[] | null {
  for (const k of impKeys) {
    const fromImp = asStringArray(imp[k])
    if (fromImp !== null) return fromImp
  }
  for (const k of topKeys) {
    const fromTop = asStringArray(d[k])
    if (fromTop !== null) return fromTop
  }
  return null
}

function firstNonEmptyDettaglio(
  ...candidates: unknown[]
): Record<string, string[]> {
  for (const raw of candidates) {
    const m = parseDettaglioPerTipo(raw)
    if (Object.keys(m).length > 0) return m
  }
  return {}
}

export type EoQuickGroupRow = { title: string; labels: string[] }

function buildEoQuickGroups(
  d: Record<string, unknown>,
  imp: Record<string, unknown>,
): EoQuickGroupRow[] {
  const raw = d.dettaglio_eo_rapido ?? imp.dettaglio_eo_rapido ?? imp.eo_quick_imp ?? imp.EO_QUICK_IMP
  const fallback = sortStringsIt([...EO_OPZIONI_RAPIDE])
  if (!raw || typeof raw !== 'object') {
    return EO_CLINICAL_TABS.map((title, i) =>
      i === 0 ? { title, labels: fallback } : { title, labels: [] as string[] },
    )
  }
  const o = raw as Record<string, unknown>
  return EO_CLINICAL_TABS.map((title) => {
    const arr = asStringArray(o[title])
    return { title, labels: arr ? sortStringsIt(arr) : [] }
  })
}

function flattenLabelsFromGroups(groups: EoQuickGroupRow[]): string[] {
  const seen = new Set<string>()
  const flat: string[] = []
  for (const g of groups) {
    for (const x of g.labels) {
      if (!seen.has(x)) {
        seen.add(x)
        flat.push(x)
      }
    }
  }
  return flat.length ? flat : sortStringsIt([...EO_OPZIONI_RAPIDE])
}

function defaultEoQuickGroups(): EoQuickGroupRow[] {
  const fallback = sortStringsIt([...EO_OPZIONI_RAPIDE])
  return EO_CLINICAL_TABS.map((title, i) =>
    i === 0 ? { title, labels: fallback } : { title, labels: [] as string[] },
  )
}

function eoQuickDefaultFromDoc(d: Record<string, unknown>, imp: Record<string, unknown>): string | null {
  const rawDef = d.dettaglio_eo_rapido_default ?? imp.dettaglio_eo_rapido_default
  if (typeof rawDef === 'string' && rawDef.trim() !== '') return rawDef.trim()
  const raw = d.dettaglio_eo_rapido ?? imp.dettaglio_eo_rapido ?? imp.eo_quick_imp ?? imp.EO_QUICK_IMP
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  for (const key of EO_CLINICAL_TABS) {
    const arr = asStringArray(o[key])
    if (arr?.length) return arr[0] ?? null
  }
  const legacy = asStringArray(o.CAPO_COLLO)
  if (legacy?.length) return legacy[0] ?? null
  return null
}

function parseDettaglioPerTipo(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const out: Record<string, string[]> = {}
  for (const [tipo, val] of Object.entries(o)) {
    const arr = asStringArray(val)
    if (arr && arr.length) out[tipo.trim()] = arr
  }
  return out
}

export type ManifestazioneCoreListe = {
  prestazioni: string[]
  farmaci: string[]
  tipoEventoList: string[]
  dettaglioEventoPerTipo: Record<string, string[]>
  eoQuickLabels: string[]
  /** Opzioni rapide EO raggruppate per categoria (v4: GENERALE per prima). */
  eoQuickGroups: EoQuickGroupRow[]
  /** Valore pre-selezionato in cartella (EO rapido) se `eo_quick` è vuoto. */
  eoQuickDefaultLabel: string | null
  loading: boolean
}

/**
 * Liste cliniche + IMP_GENERALI (Core v3) da `manifestazioni/{id}` in tempo reale.
 */
export function useManifestazioneListeCliniche(manifestazioneId: string | undefined): ManifestazioneCoreListe {
  const [prestazioni, setPrestazioni] = useState<string[]>(() =>
    sortStringsIt([...PRESTAZIONI_LISTA_DEFAULT]),
  )
  const [farmaci, setFarmaci] = useState<string[]>(() => sortStringsIt([...FARMACI_LISTA_DEFAULT]))
  const [tipoEventoList, setTipoEventoList] = useState<string[]>([])
  const [dettaglioEventoPerTipo, setDettaglioEventoPerTipo] = useState<Record<string, string[]>>({})
  const [eoQuickLabels, setEoQuickLabels] = useState<string[]>(() => flattenLabelsFromGroups(defaultEoQuickGroups()))
  const [eoQuickGroups, setEoQuickGroups] = useState<EoQuickGroupRow[]>(() => defaultEoQuickGroups())
  const [eoQuickDefaultLabel, setEoQuickDefaultLabel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !manifestazioneId?.trim()) {
      queueMicrotask(() => {
        setPrestazioni(sortStringsIt([...PRESTAZIONI_LISTA_DEFAULT]))
        setFarmaci(sortStringsIt([...FARMACI_LISTA_DEFAULT]))
        setTipoEventoList([])
        setDettaglioEventoPerTipo({})
        const defG = defaultEoQuickGroups()
        setEoQuickGroups(defG)
        setEoQuickLabels(flattenLabelsFromGroups(defG))
        setEoQuickDefaultLabel(null)
        setLoading(false)
      })
      return
    }

    queueMicrotask(() => setLoading(true))

    const ref = doc(db, 'manifestazioni', manifestazioneId.trim())
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setPrestazioni(sortStringsIt([...PRESTAZIONI_LISTA_DEFAULT]))
          setFarmaci(sortStringsIt([...FARMACI_LISTA_DEFAULT]))
          setTipoEventoList([])
          setDettaglioEventoPerTipo({})
          const defG2 = defaultEoQuickGroups()
          setEoQuickGroups(defG2)
          setEoQuickLabels(flattenLabelsFromGroups(defG2))
          setEoQuickDefaultLabel(null)
          setLoading(false)
          return
        }
        const d = snap.data() as Record<string, unknown>
        const imp = impRecord(d)

        const pList = sortStringsIt(
          pickStringList(d, imp, ['prestazioni_imp', 'PRESTAZIONI_IMP'], ['prestazioni_lista']) ??
            PRESTAZIONI_LISTA_DEFAULT,
        )
        const fList = sortStringsIt(
          pickStringList(d, imp, ['farmaci_imp', 'FARMACI_IMP'], ['farmaci_lista']) ??
            FARMACI_LISTA_DEFAULT,
        )

        const tipoEv = sortStringsIt(
          asStringArray(d.tipo_evento) ??
            asStringArray(imp.tipo_evento) ??
            asStringArray(imp.tipo_evento_list) ??
            [],
        )
        const detMap = sortRecordKeysAndValuesIt(
          firstNonEmptyDettaglio(
            d.dettaglio_evento,
            imp.dettaglio_evento,
            imp.dettaglio_evento_per_tipo,
          ),
        )

        const eoGroups = buildEoQuickGroups(d, imp)
        const eoFlat = flattenLabelsFromGroups(eoGroups)
        const eoDef = eoQuickDefaultFromDoc(d, imp)

        setPrestazioni(pList)
        setFarmaci(fList)
        setTipoEventoList(tipoEv)
        setDettaglioEventoPerTipo(detMap)
        setEoQuickGroups(eoGroups)
        setEoQuickLabels(eoFlat)
        setEoQuickDefaultLabel(eoDef)
        setLoading(false)
      },
      () => {
        setPrestazioni(sortStringsIt([...PRESTAZIONI_LISTA_DEFAULT]))
        setFarmaci(sortStringsIt([...FARMACI_LISTA_DEFAULT]))
        setTipoEventoList([])
        setDettaglioEventoPerTipo({})
        const defG3 = defaultEoQuickGroups()
        setEoQuickGroups(defG3)
        setEoQuickLabels(flattenLabelsFromGroups(defG3))
        setEoQuickDefaultLabel(null)
        setLoading(false)
      },
    )

    return () => unsub()
  }, [manifestazioneId])

  return useMemo(
    () => ({
      prestazioni,
      farmaci,
      tipoEventoList,
      dettaglioEventoPerTipo,
      eoQuickLabels,
      eoQuickGroups,
      eoQuickDefaultLabel,
      loading,
    }),
    [
      prestazioni,
      farmaci,
      tipoEventoList,
      dettaglioEventoPerTipo,
      eoQuickLabels,
      eoQuickGroups,
      eoQuickDefaultLabel,
      loading,
    ],
  )
}
