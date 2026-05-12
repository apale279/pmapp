import type { UserProfile } from '../types/userProfile'

/** Destinazione predefinita dopo login o quando una rotta è vietata (RBAC). */
export function defaultOperativePath(user: UserProfile): string {
  const pma = user.id_pma?.trim()
  if (pma) {
    return `/pma/${encodeURIComponent(pma)}`
  }
  const man = user.id_manifestazione?.trim()
  if (man && (user.rank === 'Centrale' || user.rank === 'Superadmin')) {
    return `/manifestazione/${encodeURIComponent(man)}`
  }
  return '/'
}
