import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'

export type PmaGlobalRow = {
  id: string
  nome: string
  idManifestazione: string
}

export function useAllPmaGlobal() {
  const { bumpSync } = useSyncLive()
  const [items, setItems] = useState<PmaGlobalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) {
      setItems([])
      setLoading(false)
      setError('Firestore non disponibile.')
      return
    }

    setLoading(true)
    setError(null)

    const unsub = onSnapshot(
      collection(db, 'pma'),
      (snap) => {
        const next: PmaGlobalRow[] = []
        snap.forEach((docSnap) => {
          const d = docSnap.data() as Record<string, unknown>
          const nome =
            typeof d.nome === 'string' && d.nome.trim() !== '' ? d.nome.trim() : docSnap.id
          const idMan =
            typeof d.id_manifestazione === 'string' && d.id_manifestazione.trim() !== ''
              ? d.id_manifestazione.trim()
              : ''
          next.push({ id: docSnap.id, nome, idManifestazione: idMan })
        })
        next.sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
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
  }, [bumpSync])

  return useMemo(() => ({ items, loading, error }), [items, loading, error])
}
