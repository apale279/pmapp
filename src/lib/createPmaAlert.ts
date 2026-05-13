import { addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore'

export type CreatePmaAlertInput = {
  idPma: string
  idManifestazione: string
  pazienteId: string
  idPazienteVisibile: string
  messaggio: string
  creatoDaUid: string
}

/** Allerta operativa per il PMA (notifica in tempo reale + opzionale Notification browser). */
export async function createPmaAlert(db: Firestore, input: CreatePmaAlertInput): Promise<void> {
  const idPma = input.idPma.trim()
  if (!idPma) throw new Error('PMA destinazione mancante.')
  await addDoc(collection(db, 'allerte_pma'), {
    id_pma: idPma,
    id_manifestazione: input.idManifestazione.trim(),
    paziente_id: input.pazienteId,
    id_paziente_visibile: input.idPazienteVisibile.trim(),
    messaggio: input.messaggio.trim().slice(0, 500),
    creato_da_uid: input.creatoDaUid,
    created_at: serverTimestamp(),
  })
}
