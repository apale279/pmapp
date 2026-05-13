import type { Timestamp } from 'firebase/firestore'

/** Documento `rubrica_contatti/{id}` — solo `id_manifestazione` come tenant. */
export interface RubricaContattoDoc {
  id: string
  id_manifestazione: string
  nome: string
  numero: string
  descrizione: string
  created_at: Timestamp | null
  updated_at: Timestamp | null
}

/** Documento `manifestazione_file_utili/{id}` — solo `id_manifestazione` come tenant. */
export interface FileUtileManifestazioneDoc {
  id: string
  id_manifestazione: string
  nome_file: string
  descrizione: string
  cloudinary_url: string
  caricato_at: Timestamp | null
}
