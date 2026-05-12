import type { UserProfile } from '../types/userProfile'

/**
 * Identificativo testuale per riferimenti "soft" (infermiere_rif / medico_rif):
 * preferisce nome profilo, poi email, infine uid.
 */
export function staffSoftRefFromUser(user: UserProfile | null | undefined): string {
  if (!user) return ''
  const nome = typeof user.nome === 'string' ? user.nome.trim() : ''
  if (nome) return nome
  const email = typeof user.email === 'string' ? user.email.trim() : ''
  if (email) return email
  return user.uid
}
