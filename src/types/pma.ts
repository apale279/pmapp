import type { Timestamp } from 'firebase/firestore'

export interface Pma {
  /** ID documento (nome normalizzato: minuscolo, senza spazi). */
  id: string
  nome: string
  luogo: string
  id_manifestazione: string
  impostazioni_pma: {
    posti_letto: number
    /** Elenco farmaci usati nel PMA (aggiornato da schede paziente). */
    elenco_farmaci_usati?: string[]
  }
  /** Token opaco per integrazione CROSS (lookup `pma` where token == crossToken). */
  token?: string
  /** Campi opzionali per estensioni future */
  createdAt?: Timestamp
}
