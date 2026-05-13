import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'

const BATCH_MAX = 450

/**
 * Elimina manifestazione e dati collegati: pazienti con `id_manifestazione`, tutti i PMA con
 * `id_manifestazione`, documenti in `manifestazioni/{id}/contatori`, infine il documento manifestazione.
 */
export async function deleteManifestazioneCascade(db: Firestore, manifestazioneId: string): Promise<void> {
  const id = manifestazioneId.trim()
  if (!id) throw new Error('ID manifestazione mancante.')

  const pazQ = query(collection(db, 'pazienti'), where('id_manifestazione', '==', id))
  const pazSnap = await getDocs(pazQ)
  for (let i = 0; i < pazSnap.docs.length; i += BATCH_MAX) {
    const batch = writeBatch(db)
    for (const d of pazSnap.docs.slice(i, i + BATCH_MAX)) {
      batch.delete(d.ref)
    }
    await batch.commit()
  }

  const pmaQ = query(collection(db, 'pma'), where('id_manifestazione', '==', id))
  const pmaSnap = await getDocs(pmaQ)
  for (let i = 0; i < pmaSnap.docs.length; i += BATCH_MAX) {
    const batch = writeBatch(db)
    for (const d of pmaSnap.docs.slice(i, i + BATCH_MAX)) {
      batch.delete(d.ref)
    }
    await batch.commit()
  }

  const contatoriCol = collection(db, 'manifestazioni', id, 'contatori')
  const contSnap = await getDocs(contatoriCol)
  for (let i = 0; i < contSnap.docs.length; i += BATCH_MAX) {
    const batch = writeBatch(db)
    for (const d of contSnap.docs.slice(i, i + BATCH_MAX)) {
      batch.delete(d.ref)
    }
    await batch.commit()
  }

  await deleteDoc(doc(db, 'manifestazioni', id))
}
