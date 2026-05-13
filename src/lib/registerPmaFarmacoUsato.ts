import { arrayUnion, doc, updateDoc, type Firestore } from 'firebase/firestore'

const ELENCO_PATH = 'impostazioni_pma.elenco_farmaci_usati' as const

/**
 * Aggiorna `impostazioni_pma.elenco_farmaci_usati` sul documento `pma/{id}` (IMP_PMA — consumi PMA).
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
  await updateDoc(doc(db, 'pma', id), {
    [ELENCO_PATH]: arrayUnion(nome),
  })
}
