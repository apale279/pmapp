import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'

export type PmaOption = { id: string; nome: string }

/**
 * PMA appartenenti a una manifestazione (real-time).
 */
export function usePmaOptionsForManifestazione(manifestazioneId: string | null) {
  const { bumpSync } = useSyncLive()
  const [items, setItems] = useState<PmaOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!db || !manifestazioneId) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)

    const q = query(
      collection(db, 'pma'),
      where('id_manifestazione', '==', manifestazioneId),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: PmaOption[] = []
        snap.forEach((docSnap) => {
          const d = docSnap.data() as Record<string, unknown>
          const nome =
            typeof d.nome === 'string' && d.nome.trim() !== '' ? d.nome.trim() : docSnap.id
          next.push({ id: docSnap.id, nome })
        })
        next.sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
        setItems(next)
        setLoading(false)
        bumpSync()
      },
      () => {
        setItems([])
        setLoading(false)
        bumpSync()
      },
    )

    return () => unsub()
  }, [manifestazioneId, bumpSync])

  return { items, loading }
}
