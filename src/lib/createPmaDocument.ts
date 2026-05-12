import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore'
import { normalizePmaDocumentId, PmaNomeInvalidoError } from './normalizePmaId'

export class PmaNomeDuplicatoError extends Error {
  constructor() {
    super('Esiste già un PMA con questo identificativo.')
    this.name = 'PmaNomeDuplicatoError'
  }
}

export async function createPmaDocument(
  db: Firestore,
  manifestazioneId: string,
  nomePmaInput: string,
  luogo: string,
  postiLetto: number,
): Promise<string> {
  const pmaId = normalizePmaDocumentId(nomePmaInput)
  if (!Number.isFinite(postiLetto) || postiLetto < 0) {
    throw new PmaNomeInvalidoError('Numero posti letto non valido.')
  }
  const luogoTrim = luogo.trim()
  if (!luogoTrim) {
    throw new PmaNomeInvalidoError('Il luogo è obbligatorio.')
  }

  const ref = doc(db, 'pma', pmaId)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    throw new PmaNomeDuplicatoError()
  }

  await setDoc(ref, {
    nome: nomePmaInput.trim(),
    luogo: luogoTrim,
    id_manifestazione: manifestazioneId,
    impostazioni_pma: {
      posti_letto: Math.floor(postiLetto),
    },
  })

  return pmaId
}

export { PmaNomeInvalidoError }
