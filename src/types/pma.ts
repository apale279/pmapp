import type { Timestamp } from 'firebase/firestore'

export interface Pma {
  /** ID documento (nome normalizzato: minuscolo, senza spazi). */
  id: string
  nome: string
  luogo: string
  id_manifestazione: string
  impostazioni_pma: {
    posti_letto: number
  }
  /** Campi opzionali per estensioni future */
  createdAt?: Timestamp
}
