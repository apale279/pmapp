import type { UserRank } from '../types/userProfile'

/**
 * Sfondo barra chrome operativa per RANK (testi chiari in header).
 * Evitati rosso / verde / giallo / amber (triage codice colore).
 */
export function rankOperativeHeaderClass(rank: UserRank | undefined): string {
  switch (rank) {
    case 'Superadmin':
      return '!bg-neutral-950'
    case 'Centrale':
      return '!bg-[#172554]'
    case 'Medico':
      return '!bg-slate-900'
    case 'Infermiere':
      return '!bg-[#1e1b4b]'
    case 'Triage':
      return '!bg-[#3b0764]'
    case 'Soccorritore':
      return '!bg-[#292524]'
    default:
      return '!bg-[#1a1a2e]'
  }
}
