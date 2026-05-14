import type { PazienteStato } from '../types/paziente'
import type { UserRank } from '../types/userProfile'

/**
 * Stato iniziale alla creazione scheda (Sezione 1 — STATO).
 * - Centrale, Superadmin → In arrivo (logistica)
 * - Medico, Infermiere, Triage, Soccorritore → In carico (presa operativa sul PMA)
 */
export function statoInizialePazientePerRank(creatorRank: UserRank): PazienteStato {
  if (creatorRank === 'Centrale' || creatorRank === 'Superadmin') return 'in_arrivo'
  if (
    creatorRank === 'Medico' ||
    creatorRank === 'Infermiere' ||
    creatorRank === 'Triage' ||
    creatorRank === 'Soccorritore'
  ) {
    return 'in_carico'
  }
  return 'in_attesa'
}
