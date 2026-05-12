import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, type Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Manifestazione, ManifestazioneStato } from '../types/manifestazione'

function parseStato(value: unknown): ManifestazioneStato {
  return value === 'CHIUSA' ? 'CHIUSA' : 'APERTA'
}

export function useManifestazioni() {
  const [items, setItems] = useState<Manifestazione[]>([])
  const [loading, setLoading] = useState(() => db !== null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) {
      return
    }

    const unsub = onSnapshot(
      collection(db, 'manifestazioni'),
      (snap) => {
        setError(null)
        const next: Manifestazione[] = []
        snap.forEach((docSnap) => {
          const d = docSnap.data() as Record<string, unknown>
          const dataField = d.data
          if (!dataField || typeof (dataField as Timestamp).toDate !== 'function') {
            return
          }
          next.push({
            nome: docSnap.id,
            data: dataField as Timestamp,
            stato: parseStato(d.stato),
            impostazioni:
              typeof d.impostazioni === 'object' && d.impostazioni !== null
                ? (d.impostazioni as Record<string, unknown>)
                : {},
          })
        })
        setItems(next)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return () => unsub()
  }, [])

  const sorted = useMemo(() => {
    const copy = [...items]
    copy.sort((a, b) => {
      if (a.stato !== b.stato) return a.stato === 'APERTA' ? -1 : 1
      const ta = a.data?.toMillis?.() ?? 0
      const tb = b.data?.toMillis?.() ?? 0
      return tb - ta
    })
    return copy
  }, [items])

  const aperte = useMemo(
    () => sorted.filter((m) => m.stato === 'APERTA'),
    [sorted],
  )
  const chiuse = useMemo(
    () => sorted.filter((m) => m.stato === 'CHIUSA'),
    [sorted],
  )

  const firestoreError = db === null ? 'Firestore non disponibile' : null
  const combinedError = error ?? firestoreError
  const combinedLoading = db === null ? false : loading

  return { aperte, chiuse, loading: combinedLoading, error: combinedError }
}
