import { arrayUnion, doc, setDoc, type Firestore } from 'firebase/firestore'

/**
 * Aggiorna `farmaci_usati` sul documento `pma/{id}` (IMP_PMA — consumi PMA).
 * `arrayUnion` evita duplicati per la stessa stringa.
 */
export async function registerPmaFarmacoUsato(
  db: Firestore,
  pmaId: string | undefined,
  nomeFarmaco: string,
): Promise<void> {
  const id = pmaId?.trim()
  const nome = nomeFarmaco.trim()
  if (!id || !nome) return
  await setDoc(
    doc(db, 'pma', id),
    { farmaci_usati: arrayUnion(nome) },
    { merge: true },
  )
}
