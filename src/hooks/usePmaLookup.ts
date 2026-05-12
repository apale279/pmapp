import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'

/**
 * Mappa id documento PMA → nome visualizzato (onSnapshot su tutta la collection `pma`).
 */
export function usePmaLookup() {
  const { bumpSync } = useSyncLive()
  const [nomeById, setNomeById] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) {
      setNomeById({})
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const unsub = onSnapshot(
      collection(db, 'pma'),
      (snap) => {
        const next: Record<string, string> = {}
        snap.forEach((docSnap) => {
          const d = docSnap.data() as Record<string, unknown>
          const nome = typeof d.nome === 'string' && d.nome.trim() !== '' ? d.nome.trim() : docSnap.id
          next[docSnap.id] = nome
        })
        setNomeById(next)
        setLoading(false)
        bumpSync()
      },
      (err) => {
        setError(err.message)
        setNomeById({})
        setLoading(false)
        bumpSync()
      },
    )

    return () => unsub()
  }, [bumpSync])

  return { nomeById, loading, error }
}
