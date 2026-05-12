import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'

export type ManifestazioneSelectOption = {
  id: string
  nome: string
  stato: 'APERTA' | 'CHIUSA'
}

/**
 * Manifestazioni esistenti per select admin (onSnapshot).
 */
export function useManifestazioniSelectOptions() {
  const { bumpSync } = useSyncLive()
  const [items, setItems] = useState<ManifestazioneSelectOption[]>([])
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
      collection(db, 'manifestazioni'),
      (snap) => {
        const next: ManifestazioneSelectOption[] = []
        snap.forEach((docSnap) => {
          const d = docSnap.data() as Record<string, unknown>
          const stato = d.stato === 'CHIUSA' ? 'CHIUSA' : 'APERTA'
          const nome =
            typeof d.nome === 'string' && d.nome.trim() !== '' ? d.nome.trim() : docSnap.id
          next.push({
            id: docSnap.id,
            nome,
            stato,
          })
        })
        next.sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
        setItems(next)
        setLoading(false)
        bumpSync()
      },
      (err) => {
        setError(err.message)
        setItems([])
        setLoading(false)
        bumpSync()
      },
    )

    return () => unsub()
  }, [bumpSync])

  return { items, loading, error }
}
