import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  query,
  where,
  limit,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { CodiceColorePaziente } from '../types/paziente'
import { isCodiceColorePaziente } from '../types/paziente'

export type DimessoManifestazioneRow = {
  id: string
  id_paziente_visibile: string
  nome: string
  cognome: string
  id_pma: string
  codice_colore: CodiceColorePaziente
  dimesso_at: Timestamp | null
}

function parseRow(id: string, d: Record<string, unknown>): DimessoManifestazioneRow {
  const colore = isCodiceColorePaziente(d.codice_colore) ? d.codice_colore : 'bianco'
  const idPma = typeof d.id_pma === 'string' && d.id_pma.trim() !== '' ? d.id_pma.trim() : ''
  const dim = d.dimesso_at
  const dimesso_at =
    dim && typeof (dim as Timestamp).toMillis === 'function' ? (dim as Timestamp) : null
  return {
    id,
    id_paziente_visibile:
      typeof d.id_paziente_visibile === 'string' && d.id_paziente_visibile.trim() !== ''
        ? d.id_paziente_visibile.trim()
        : id,
    nome: typeof d.nome === 'string' ? d.nome : '',
    cognome: typeof d.cognome === 'string' ? d.cognome : '',
    id_pma: idPma,
    codice_colore: colore,
    dimesso_at,
  }
}

/**
 * Pazienti dimessi della manifestazione (query composta; ordinamento lato client su `dimesso_at`).
 */
export function useDimessiManifestazione(manifestazioneId: string | undefined) {
  const [items, setItems] = useState<DimessoManifestazioneRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db || !manifestazioneId?.trim()) {
      queueMicrotask(() => {
        setItems([])
        setLoading(false)
        setError(null)
      })
      return
    }

    queueMicrotask(() => {
      setLoading(true)
      setError(null)
    })

    const q = query(
      collection(db, 'pazienti'),
      where('id_manifestazione', '==', manifestazioneId.trim()),
      where('stato', '==', 'dimesso'),
      limit(400),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: DimessoManifestazioneRow[] = []
        snap.forEach((docSnap) => {
          next.push(parseRow(docSnap.id, docSnap.data() as Record<string, unknown>))
        })
        next.sort((a, b) => {
          const ta = a.dimesso_at?.toMillis?.() ?? 0
          const tb = b.dimesso_at?.toMillis?.() ?? 0
          return tb - ta
        })
        setItems(next)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setItems([])
        setLoading(false)
      },
    )

    return () => unsub()
  }, [manifestazioneId])

  return { items, loading, error }
}
