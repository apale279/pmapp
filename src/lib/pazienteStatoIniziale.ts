import type { PazienteStato } from '../types/paziente'
import type { UserRank } from '../types/userProfile'

/**
 * Stato iniziale alla creazione scheda (Sezione 1 — STATO).
 * - Centrale → In arrivo
 * - Medico, Infermiere, Triage, Soccorritore → In carico
 * - Altri (es. Superadmin) → In carico
 */
export function statoInizialePazientePerRank(creatorRank: UserRank): PazienteStato {
  if (creatorRank === 'Centrale') return 'in_arrivo'
  if (
    creatorRank === 'Medico' ||
    creatorRank === 'Infermiere' ||
    creatorRank === 'Triage' ||
    creatorRank === 'Soccorritore'
  ) {
    return 'in_carico'
  }
  return 'in_carico'
}
