import type { UserProfile } from '../types/userProfile'

/**
 * Destinazione dopo login o refresh su `/` (Centrale → dashboard manifestazione; staff PMA → dashboard PMA).
 */
export function defaultRouteAfterLogin(user: UserProfile): string {
  if (user.rank === 'Superadmin') return '/admin'
  if (user.rank === 'Centrale') {
    const m = user.id_manifestazione?.trim()
    if (m) return `/manifestazione/${encodeURIComponent(m)}`
  }
  if (
    user.rank === 'Medico' ||
    user.rank === 'Infermiere' ||
    user.rank === 'Soccorritore' ||
    user.rank === 'Triage'
  ) {
    const p = user.id_pma?.trim()
    if (p) return `/pma/${encodeURIComponent(p)}`
  }
  return '/'
}
