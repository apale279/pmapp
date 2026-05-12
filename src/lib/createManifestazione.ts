import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  type Firestore,
} from 'firebase/firestore'

export class ManifestazioneNomeInvalidoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ManifestazioneNomeInvalidoError'
  }
}

export class ManifestazioneNomeDuplicatoError extends Error {
  constructor() {
    super('Esiste già una manifestazione con questo nome.')
    this.name = 'ManifestazioneNomeDuplicatoError'
  }
}

function assertNomeManifestazioneValido(nome: string): string {
  const trimmed = nome.trim()
  if (!trimmed) {
    throw new ManifestazioneNomeInvalidoError('Il nome è obbligatorio.')
  }
  if (/\s/.test(trimmed)) {
    throw new ManifestazioneNomeInvalidoError('Il nome non può contenere spazi.')
  }
  if (trimmed.includes('/')) {
    throw new ManifestazioneNomeInvalidoError('Il nome non può contenere il carattere "/".')
  }
  return trimmed
}

/**
 * Crea il documento `manifestazioni/{nome}` dopo controllo unicità (getDoc).
 */
export async function createManifestazioneDocument(
  db: Firestore,
  nomeInput: string,
  dataIso: string,
): Promise<string> {
  const nome = assertNomeManifestazioneValido(nomeInput)
  const ref = doc(db, 'manifestazioni', nome)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    throw new ManifestazioneNomeDuplicatoError()
  }

  const parts = dataIso.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new ManifestazioneNomeInvalidoError('Data non valida.')
  }
  const [y, m, d] = parts
  const dataDate = new Date(y, m - 1, d, 12, 0, 0, 0)

  await setDoc(ref, {
    nome,
    data: Timestamp.fromDate(dataDate),
    stato: 'APERTA',
    impostazioni: {},
  })

  return nome
}
