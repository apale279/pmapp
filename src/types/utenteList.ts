import type { UserRank } from './userProfile'

/** Riga utente da `utenti/{uid}` + id documento. */
export interface UtenteListRow {
  uid: string
  nome: string
  email: string
  rank: UserRank
  id_manifestazione?: string
  id_pma?: string
  /** Data URL / Base64 su Firestore (`firmaMedicoBase64`). */
  firmaMedicoBase64?: string
  /** URL Storage legacy. */
  firmaUrl?: string
}
