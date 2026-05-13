import { collection, deleteDoc, doc, getDocs, query, where, writeBatch, type Firestore } from 'firebase/firestore'

const BATCH_MAX = 450

/** Elimina tutti i pazienti con `id_pma` uguale al PMA, poi il documento `pma/{id}`. */
export async function deletePmaCascade(db: Firestore, pmaId: string): Promise<void> {
  const id = pmaId.trim()
  if (!id) throw new Error('ID PMA mancante.')

  const pazQ = query(collection(db, 'pazienti'), where('id_pma', '==', id))
  const pazSnap = await getDocs(pazQ)
  for (let i = 0; i < pazSnap.docs.length; i += BATCH_MAX) {
    const batch = writeBatch(db)
    for (const d of pazSnap.docs.slice(i, i + BATCH_MAX)) {
      batch.delete(d.ref)
    }
    await batch.commit()
  }

  await deleteDoc(doc(db, 'pma', id))
}
