import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'
import type { CodiceMinore } from '../types/codiceMinore'

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  return null
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function ts(v: unknown): Timestamp | null {
  if (v && typeof v === 'object' && 'toMillis' in (v as object)) return v as Timestamp
  return null
}

function parseDoc(id: string, d: Record<string, unknown>): CodiceMinore | null {
  const id_manifestazione = str(d.id_manifestazione).trim()
  const id_pma = str(d.id_pma).trim()
  const ora_accesso = ts(d.ora_accesso)
  if (!id_manifestazione || !id_pma || !ora_accesso) return null
  return {
    id,
    id_manifestazione,
    id_pma,
    ora_accesso,
    numero_pettorale: numOrNull(d.numero_pettorale),
    motivo_accesso: str(d.motivo_accesso),
    prestazioni: str(d.prestazioni),
    ora_dimissione: ts(d.ora_dimissione),
    created_at: ts(d.created_at),
  }
}

export function useCodiciMinoriForPma(pmaId: string | undefined) {
  const { bumpSync } = useSyncLive()
  const [items, setItems] = useState<CodiceMinore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db || !pmaId?.trim()) {
      setItems([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const q = query(
      collection(db, 'codici_minori'),
      where('id_pma', '==', pmaId.trim()),
      orderBy('ora_accesso', 'desc'),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: CodiceMinore[] = []
        snap.forEach((docSnap) => {
          const row = parseDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
          if (row) next.push(row)
        })
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
  }, [pmaId, bumpSync])

  return { items, loading, error }
}
