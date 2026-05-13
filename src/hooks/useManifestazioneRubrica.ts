import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  query,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'
import type { RubricaContattoDoc } from '../types/manifestazioneShared'

export const RUBRICA_CONTATTI_COLLECTION = 'rubrica_contatti'

function tsOrNull(v: unknown): Timestamp | null {
  if (v && typeof v === 'object' && 'toMillis' in v && typeof (v as Timestamp).toMillis === 'function') {
    return v as Timestamp
  }
  return null
}

function parseDoc(id: string, d: Record<string, unknown>): RubricaContattoDoc {
  return {
    id,
    id_manifestazione: typeof d.id_manifestazione === 'string' ? d.id_manifestazione : '',
    nome: typeof d.nome === 'string' ? d.nome : '',
    numero: typeof d.numero === 'string' ? d.numero : '',
    descrizione: typeof d.descrizione === 'string' ? d.descrizione : '',
    created_at: tsOrNull(d.created_at),
    updated_at: tsOrNull(d.updated_at),
  }
}

/** Rubrica globale manifestazione: query solo su `id_manifestazione`. */
export function useManifestazioneRubrica(manifestazioneId: string | undefined) {
  const { bumpSync } = useSyncLive()
  const [items, setItems] = useState<RubricaContattoDoc[]>([])
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
    const q = query(collection(db, RUBRICA_CONTATTI_COLLECTION), where('id_manifestazione', '==', man))

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: RubricaContattoDoc[] = []
        snap.forEach((docSnap) => {
          next.push(parseDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
        })
        next.sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }))
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
