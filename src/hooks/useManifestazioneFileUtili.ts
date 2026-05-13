import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, type Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'
import type { FileUtileManifestazioneDoc } from '../types/manifestazioneShared'

export const FILE_UTILI_MANIFESTAZIONE_COLLECTION = 'manifestazione_file_utili'

function tsOrNull(v: unknown): Timestamp | null {
  if (v && typeof v === 'object' && 'toMillis' in v && typeof (v as Timestamp).toMillis === 'function') {
    return v as Timestamp
  }
  return null
}

function parseDoc(id: string, d: Record<string, unknown>): FileUtileManifestazioneDoc {
  return {
    id,
    id_manifestazione: typeof d.id_manifestazione === 'string' ? d.id_manifestazione : '',
    nome_file: typeof d.nome_file === 'string' ? d.nome_file : '',
    descrizione: typeof d.descrizione === 'string' ? d.descrizione : '',
    cloudinary_url: typeof d.cloudinary_url === 'string' ? d.cloudinary_url : '',
    caricato_at: tsOrNull(d.caricato_at),
  }
}

/** File utili globali manifestazione: query solo su `id_manifestazione`. */
export function useManifestazioneFileUtili(manifestazioneId: string | undefined) {
  const { bumpSync } = useSyncLive()
  const [items, setItems] = useState<FileUtileManifestazioneDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db || !manifestazioneId?.trim()) {
      setItems([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const man = manifestazioneId.trim()
    const q = query(collection(db, FILE_UTILI_MANIFESTAZIONE_COLLECTION), where('id_manifestazione', '==', man))

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: FileUtileManifestazioneDoc[] = []
        snap.forEach((docSnap) => {
          next.push(parseDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
        })
        next.sort((a, b) => {
          const ta = a.caricato_at?.toMillis?.() ?? 0
          const tb = b.caricato_at?.toMillis?.() ?? 0
          return tb - ta
        })
        setItems(next)
        setLoading(false)
        bumpSync()
      },
      (e) => {
        setError(e.message)
        setItems([])
        setLoading(false)
        bumpSync()
      },
    )

    return () => unsub()
  }, [manifestazioneId, bumpSync])

  return { items, loading, error }
}
