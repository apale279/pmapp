import {
  addDoc,
  collection,
  doc,
  Timestamp,
  updateDoc,
  type UpdateData,
} from 'firebase/firestore'
import { db } from './firebase'

export type CodiceMinoreCreateInput = {
  id_manifestazione: string
  id_pma: string
  ora_accesso: Timestamp
  numero_pettorale: number | null
  motivo_accesso: string
  prestazioni: string
  ora_dimissione: Timestamp | null
}

export async function createCodiceMinore(input: CodiceMinoreCreateInput): Promise<string> {
  if (!db) throw new Error('Firestore non disponibile.')
  const now = Timestamp.now()
  const ref = await addDoc(collection(db, 'codici_minori'), {
    id_manifestazione: input.id_manifestazione.trim(),
    id_pma: input.id_pma.trim(),
    ora_accesso: input.ora_accesso,
    numero_pettorale: input.numero_pettorale,
    motivo_accesso: input.motivo_accesso.trim(),
    prestazioni: input.prestazioni.trim(),
    ora_dimissione: input.ora_dimissione,
    created_at: now,
  })
  return ref.id
}

export async function updateCodiceMinore(
  id: string,
  patch: Partial<{
    ora_accesso: Timestamp
    numero_pettorale: number | null
    motivo_accesso: string
    prestazioni: string
    ora_dimissione: Timestamp | null
  }>,
): Promise<void> {
  if (!db) throw new Error('Firestore non disponibile.')
  const ref = doc(db, 'codici_minori', id)
  await updateDoc(ref, patch as UpdateData<Record<string, unknown>>)
}
