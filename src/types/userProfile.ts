/**
 * Ruoli assegnabili al personale (il Superadmin non si crea da questo form).
 */
export const STAFF_RANKS = [
  'Centrale',
  'Medico',
  'Infermiere',
  'Soccorritore',
  'Triage',
] as const

export type StaffRank = (typeof STAFF_RANKS)[number]

/** Ruoli operativi su un singolo PMA (obbligatorio `id_pma` in anagrafica utente). */
export const STAFF_RANKS_REQUIRING_PMA = ['Medico', 'Infermiere', 'Soccorritore', 'Triage'] as const

export type StaffRankRequiringPma = (typeof STAFF_RANKS_REQUIRING_PMA)[number]

export function staffRankRequiresPma(rank: StaffRank): rank is StaffRankRequiringPma {
  return (STAFF_RANKS_REQUIRING_PMA as readonly string[]).includes(rank)
}

export function isStaffRank(value: unknown): value is StaffRank {
  return typeof value === 'string' && (STAFF_RANKS as readonly string[]).includes(value)
}

/**
 * Ruoli globali / piattaforma: solo Superadmin gestisce account e manifestazioni.
 * "Centrale" è ruolo operativo legato a una manifestazione (come Medico, ecc.).
 */
export const USER_RANKS = ['Superadmin', ...STAFF_RANKS] as const

export type UserRank = (typeof USER_RANKS)[number]

export function isUserRank(value: unknown): value is UserRank {
  return typeof value === 'string' && (USER_RANKS as readonly string[]).includes(value)
}

/**
 * Profilo applicativo: dati Auth (uid, email) + campi da Firestore `utenti/{uid}`.
 */
export interface UserProfile {
  uid: string
  email: string | null
  nome: string
  rank: UserRank
  id_manifestazione?: string
  id_pma?: string
  /** Telefono di contatto (opzionale). */
  telefono?: string
  /** Email di contatto aggiuntiva (opzionale; diversa dall’email di login Auth). */
  email_contatto?: string
  /** Note interne (opzionale). */
  note_utente?: string
  /** URL immagine firma (solo Medico; legacy Storage). */
  firmaUrl?: string
  /** Data URL / Base64 firma medico (senza Storage). */
  firma_medico_base64?: string
}
