import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore'

const RUBRICA_COLLECTION = 'rubrica_contatti'

/** ID documento rubrica derivato dall’utente (sincronizzazione automatica contatto). */
export function rubricaDocIdForUtenteSync(uid: string): string {
  return `sync_utente_${uid}`
}

/**
 * Se l’utente ha un numero di telefono, aggiorna (o crea) una voce in rubrica manifestazione
 * con nome e numero; la descrizione riceve le note solo se compilate.
 * Se il telefono viene rimosso, elimina la voce sincronizzata.
 */
export async function syncUtenteTelefonoToRubrica(
  db: Firestore,
  params: {
    uid: string
    idManifestazione: string
    nome: string
    telefono: string | null | undefined
    note: string | null | undefined
  },
): Promise<void> {
  const man = params.idManifestazione.trim()
  if (!man) return
  const rubricaId = rubricaDocIdForUtenteSync(params.uid)
  const ref = doc(db, RUBRICA_COLLECTION, rubricaId)
  const tel = (params.telefono ?? '').trim()
  if (!tel) {
    try {
      await deleteDoc(ref)
    } catch {
      /* assente */
    }
    return
  }
  const nome = params.nome.trim() || 'Contatto'
  const descrizione = (params.note ?? '').trim()
  const snap = await getDoc(ref)
  await setDoc(
    ref,
    {
      id_manifestazione: man,
      nome,
      numero: tel,
      descrizione,
      linked_utente_uid: params.uid,
      updated_at: serverTimestamp(),
      ...(snap.exists() ? {} : { created_at: serverTimestamp() }),
    },
    { merge: true },
  )
}
