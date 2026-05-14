import type { PazienteStato } from '../types/paziente'
import type { UserRank } from '../types/userProfile'

/**
 * Stati mostrati come pill nella scheda (Sez. 1), in base al ruolo.
 * Centrale non può impostare manualmente «In carico» dalla scheda (si usa «Prendi in carico» in dashboard).
 * Con paziente già in carico, Centrale vede solo quello stato (sola lettura insieme al resto della scheda).
 */
export function statiSelezionabiliPerRank(
  rank: UserRank | undefined,
  canSelectInArrivo: boolean,
  statoCorrente: PazienteStato,
): PazienteStato[] {
  const mid: PazienteStato[] = ['in_attesa', 'in_carico', 'in_sospeso']
  if (rank === 'Centrale') {
    if (statoCorrente === 'in_carico') return ['in_carico']
    return ['in_arrivo', 'in_attesa', 'in_sospeso']
  }
  if (canSelectInArrivo || statoCorrente === 'in_arrivo') return ['in_arrivo', ...mid]
  return [...mid]
}
