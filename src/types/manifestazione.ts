import type { Timestamp } from 'firebase/firestore'

export type ManifestazioneStato = 'APERTA' | 'CHIUSA'

export interface Manifestazione {
  /** Uguale all'ID documento in Firestore (senza spazi). */
  nome: string
  data: Timestamp
  stato: ManifestazioneStato
  impostazioni: Record<string, unknown>
}
