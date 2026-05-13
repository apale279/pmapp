import { useEffect, useMemo, useState } from 'react'
import { Timestamp, collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'
import type { Manifestazione, ManifestazioneStato } from '../types/manifestazione'

function parseStato(value: unknown): ManifestazioneStato {
  return value === 'CHIUSA' ? 'CHIUSA' : 'APERTA'
}

export type ManifestazioneAdminRow = Manifestazione

/** Lista completa manifestazioni per admin (snapshot, include documenti senza campo `data`). */
export function useManifestazioniAdminList() {
  const { bumpSync } = useSyncLive()
  const [items, setItems] = useState<ManifestazioneAdminRow[]>([])
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
        const next: ManifestazioneAdminRow[] = []
        snap.forEach((docSnap) => {
          const d = docSnap.data() as Record<string, unknown>
          const dataField = d.data
          const data =
            dataField && typeof (dataField as Timestamp).toDate === 'function'
              ? (dataField as Timestamp)
              : Timestamp.fromMillis(0)
          next.push({
            nome: docSnap.id,
            data,
            stato: parseStato(d.stato),
            impostazioni:
              typeof d.impostazioni === 'object' && d.impostazioni !== null
                ? (d.impostazioni as Record<string, unknown>)
                : {},
          })
        })
        next.sort((a, b) => {
          const ta = a.data?.toMillis?.() ?? 0
          const tb = b.data?.toMillis?.() ?? 0
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
  }, [bumpSync])

  return useMemo(() => ({ items, loading, error }), [items, loading, error])
}
