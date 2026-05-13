import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'
import {
  parsePartecipantiElencoFromFirestore,
  type PartecipanteElencoRow,
} from '../types/manifestazionePartecipanti'

function impRecord(d: Record<string, unknown>): Record<string, unknown> {
  const imp = d.impostazioni
  return imp && typeof imp === 'object' && imp !== null ? (imp as Record<string, unknown>) : {}
}

export function useManifestazionePartecipantiElenco(manifestazioneId: string | undefined) {
  const { bumpSync } = useSyncLive()
  const [rows, setRows] = useState<PartecipanteElencoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db || !manifestazioneId?.trim()) {
      setRows([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const ref = doc(db, 'manifestazioni', manifestazioneId.trim())
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRows([])
          setLoading(false)
          bumpSync()
          return
        }
        const d = snap.data() as Record<string, unknown>
        const imp = impRecord(d)
        const raw = imp.partecipanti_elenco ?? (d as Record<string, unknown>).partecipanti_elenco
        setRows(parsePartecipantiElencoFromFirestore(raw))
        setLoading(false)
        bumpSync()
      },
      (e) => {
        setError(e.message)
        setRows([])
        setLoading(false)
        bumpSync()
      },
    )
    return () => unsub()
  }, [manifestazioneId, bumpSync])

  return { rows, loading, error }
}
