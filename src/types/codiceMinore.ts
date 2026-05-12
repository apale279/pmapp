import type { Timestamp } from 'firebase/firestore'

/** Record `codici_minori/{id}` — prestazioni minori tracciate per PMA. */
export type CodiceMinore = {
  id: string
  id_manifestazione: string
  id_pma: string
  ora_accesso: Timestamp
  numero_pettorale: number | null
  motivo_accesso: string
  prestazioni: string
  ora_dimissione: Timestamp | null
  created_at: Timestamp | null
}
