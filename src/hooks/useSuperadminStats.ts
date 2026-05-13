import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'

export type SuperadminStats = {
  totaleUtenti: number
  eventiAttivi: number
  loading: boolean
  error: string | null
}

/**
 * Statistiche globali per dashboard admin (snapshot Firestore).
 */
export function useSuperadminStats(): SuperadminStats {
  const { bumpSync } = useSyncLive()
  const [totaleUtenti, setTotaleUtenti] = useState(0)
  const [eventiAttivi, setEventiAttivi] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) {
      setTotaleUtenti(0)
      setEventiAttivi(0)
      setLoading(false)
      setError('Firestore non disponibile.')
      return
    }

    setLoading(true)
    setError(null)

    const unsubUtenti = onSnapshot(
      collection(db, 'utenti'),
      (snap) => {
        setTotaleUtenti(snap.size)
        bumpSync()
      },
      (e) => {
        setError(e.message)
        bumpSync()
      },
    )

    const unsubMan = onSnapshot(
      collection(db, 'manifestazioni'),
      (snap) => {
        let n = 0
        snap.forEach((d) => {
          const raw = d.data() as Record<string, unknown>
          const stato = raw.stato === 'CHIUSA' ? 'CHIUSA' : 'APERTA'
          if (stato === 'APERTA') n += 1
        })
        setEventiAttivi(n)
        setLoading(false)
        bumpSync()
      },
      (e) => {
        setError(e.message)
        setLoading(false)
        bumpSync()
      },
    )

    return () => {
      unsubUtenti()
      unsubMan()
    }
  }, [bumpSync])

  return useMemo(
    () => ({ totaleUtenti, eventiAttivi, loading, error }),
    [totaleUtenti, eventiAttivi, loading, error],
  )
}
