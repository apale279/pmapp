import { doc, updateDoc, type Firestore } from 'firebase/firestore'

/**
 * Salvataggio granulare scheda paziente: un solo (o pochi) campi per `updateDoc`,
 * per ridurre conflitti in multi-utenza su `pazienti/{id}`.
 */
export async function updateSchedaPazienteGranular(
  db: Firestore,
  pazienteId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  if (Object.keys(patch).length === 0) return
  await updateDoc(doc(db, 'pazienti', pazienteId), patch)
}
