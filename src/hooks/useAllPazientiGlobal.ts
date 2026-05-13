import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'

export type PazienteGlobalRow = {
  id: string
  idVisibile: string
  nome: string
  cognome: string
  stato: string
  idManifestazione: string
  idPma: string
}

function parseRow(id: string, d: Record<string, unknown>): PazienteGlobalRow {
  const stato = typeof d.stato === 'string' ? d.stato : '—'
  const idVis =
    typeof d.id_paziente_visibile === 'string' && d.id_paziente_visibile.trim() !== ''
      ? d.id_paziente_visibile.trim()
      : id.slice(0, 8)
  return {
    id,
    idVisibile: idVis,
    nome: typeof d.nome === 'string' ? d.nome : '',
    cognome: typeof d.cognome === 'string' ? d.cognome : '',
    stato,
    idManifestazione:
      typeof d.id_manifestazione === 'string' && d.id_manifestazione.trim() !== ''
        ? d.id_manifestazione.trim()
        : '',
    idPma: typeof d.id_pma === 'string' && d.id_pma.trim() !== '' ? d.id_pma.trim() : '',
  }
}

/** Archivio globale pazienti (snapshot `pazienti`). */
export function useAllPazientiGlobal() {
  const { bumpSync } = useSyncLive()
  const [items, setItems] = useState<PazienteGlobalRow[]>([])
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
      collection(db, 'pazienti'),
      (snap) => {
        const next: PazienteGlobalRow[] = []
        snap.forEach((docSnap) => {
          next.push(parseRow(docSnap.id, docSnap.data() as Record<string, unknown>))
        })
        next.sort((a, b) => {
          const t = b.idVisibile.localeCompare(a.idVisibile, 'it')
          if (t !== 0) return t
          return a.id.localeCompare(b.id)
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
