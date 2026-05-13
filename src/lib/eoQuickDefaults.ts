import { EO_CLINICAL_TABS } from './multilineList'
import { EO_OPZIONI_RAPIDE } from '../types/cartellaClinica'

export type EoQuickGroupRow = { title: string; labels: string[] }

/** Stesso schema usato in impostazioni manifestazione / `useManifestazioneListeCliniche`. */
export function defaultEoQuickGroupRows(): EoQuickGroupRow[] {
  const fallback = [...EO_OPZIONI_RAPIDE]
  return EO_CLINICAL_TABS.map((title, i) =>
    i === 0 ? { title, labels: fallback } : { title, labels: [] as string[] },
  )
}
