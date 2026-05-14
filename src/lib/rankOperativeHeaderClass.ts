import type { UserRank } from '../types/userProfile'

/**
 * Fascia header operativo (scheda, dashboard PMA, …): colore per `data-operative-rank`.
 * I valori esadecimali stanno in `pma-theme.css` (vincono su `.pma-bar { background }`).
 * Palette solo **scura** per testi chiari; **mai** rosso/verde/giallo (pallini triage).
 */
export const operativeRankHeaderStripClass = 'pma-operative-rank-bg'

/** Valore sicuro per l’attributo `data-operative-rank`. */
export function operativeRankDataValue(rank: UserRank | undefined): string {
  if (!rank) return '—'
  return rank
}
