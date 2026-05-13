import type { UserProfile } from '../types/userProfile'

/**
 * ID manifestazione usato per query/salvataggi Rubrica e File utili (solo tenant manifestazione, mai `id_pma`).
 * Staff: profilo `id_manifestazione` (allineato alla URL da `ManifestazioneScopeGuard`).
 * Superadmin: contesto dalla URL `/manifestazione/:id/...`.
 */
export function manifestazioneTenantIdForFirestore(user: UserProfile, routeManifestazioneId: string): string {
  const route = routeManifestazioneId.trim()
  if (user.rank === 'Superadmin') return route
  return (user.id_manifestazione ?? '').trim() || route
}
