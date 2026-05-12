import { useEffect, useState } from 'react'
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'
import type { ManifestazioneStato } from '../types/manifestazione'

export interface ManifestazioneHeaderData {
  nome: string
  data: Timestamp | null
  stato: ManifestazioneStato
}

export function useManifestazioneDoc(manifestazioneId: string | undefined) {
  const { bumpSync } = useSyncLive()
  const [data, setData] = useState<ManifestazioneHeaderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exists, setExists] = useState(true)

  useEffect(() => {
    if (!db || !manifestazioneId) {
      setLoading(false)
      setExists(false)
      setData(null)
      setError(manifestazioneId ? null : 'ID manifestazione mancante.')
      return
    }

    setLoading(true)
    setError(null)

    const ref = doc(db, 'manifestazioni', manifestazioneId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setExists(false)
          setData(null)
          setLoading(false)
          bumpSync()
          return
        }
        const d = snap.data() as Record<string, unknown>
        const dataField = d.data
        const ts =
          dataField && typeof (dataField as Timestamp).toDate === 'function'
            ? (dataField as Timestamp)
            : null
        const stato: ManifestazioneStato = d.stato === 'CHIUSA' ? 'CHIUSA' : 'APERTA'
        setExists(true)
        setData({
          nome: typeof d.nome === 'string' ? d.nome : manifestazioneId,
          data: ts,
          stato,
        })
        setLoading(false)
        bumpSync()
      },
      (err) => {
        setError(err.message)
        setLoading(false)
        bumpSync()
      },
    )

    return () => unsub()
  }, [manifestazioneId, bumpSync])

  return { data, loading, error, exists }
}
