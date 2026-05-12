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
import type { Pma } from '../types/pma'

function parsePma(docId: string, d: Record<string, unknown>): Pma {
  const imp = d.impostazioni_pma
  let posti = 0
  if (imp && typeof imp === 'object' && imp !== null && 'posti_letto' in imp) {
    const n = Number((imp as { posti_letto?: unknown }).posti_letto)
    if (Number.isFinite(n)) posti = n
  }

  return {
    id: docId,
    nome: typeof d.nome === 'string' ? d.nome : docId,
    luogo: typeof d.luogo === 'string' ? d.luogo : '—',
    id_manifestazione:
      typeof d.id_manifestazione === 'string' ? d.id_manifestazione : '',
    impostazioni_pma: { posti_letto: posti },
    ...(d.createdAt &&
    typeof (d.createdAt as Timestamp).toMillis === 'function'
      ? { createdAt: d.createdAt as Timestamp }
      : {}),
  }
}

/**
 * Elenco PMA della manifestazione in tempo reale (onSnapshot).
 */
export function usePmaListForManifestazione(manifestazioneId: string | undefined) {
  const { bumpSync } = useSyncLive()
  const [items, setItems] = useState<Pma[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db || !manifestazioneId) {
      setItems([])
      setLoading(false)
      setError(manifestazioneId ? null : 'ID manifestazione mancante.')
      return
    }

    setLoading(true)
    setError(null)

    const q = query(
      collection(db, 'pma'),
      where('id_manifestazione', '==', manifestazioneId),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: Pma[] = []
        snap.forEach((docSnap) => {
          next.push(parsePma(docSnap.id, docSnap.data() as Record<string, unknown>))
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
  }, [manifestazioneId, bumpSync])

  return { items, loading, error }
}
