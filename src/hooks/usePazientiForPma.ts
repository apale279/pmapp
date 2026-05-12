import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  query,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { CodiceColorePaziente, PazienteStato } from '../types/paziente'
import { isCodiceColorePaziente, isPazienteStato } from '../types/paziente'

export type PazienteListItem = {
  id: string
  id_paziente_visibile: string
  nome: string
  cognome: string
  stato: PazienteStato
  codice_colore: CodiceColorePaziente
  apertura_scheda: Timestamp | null
  dimesso_at: Timestamp | null
  id_pma: string
  infermiere_rif: string
  medico_rif: string
}

function parseListItem(id: string, d: Record<string, unknown>): PazienteListItem {
  const stato = isPazienteStato(d.stato) ? d.stato : 'in_carico'
  const colore = isCodiceColorePaziente(d.codice_colore) ? d.codice_colore : 'bianco'
  const ap = d.apertura_scheda
  const apertura =
    ap && typeof (ap as Timestamp).toMillis === 'function' ? (ap as Timestamp) : null
  const dim = d.dimesso_at
  const dimesso_at =
    dim && typeof (dim as Timestamp).toMillis === 'function' ? (dim as Timestamp) : null
  const idPma = typeof d.id_pma === 'string' && d.id_pma.trim() !== '' ? d.id_pma.trim() : ''

  return {
    id,
    id_paziente_visibile:
      typeof d.id_paziente_visibile === 'string' && d.id_paziente_visibile.trim() !== ''
        ? d.id_paziente_visibile.trim()
        : id,
    nome: typeof d.nome === 'string' ? d.nome : '',
    cognome: typeof d.cognome === 'string' ? d.cognome : '',
    stato,
    codice_colore: colore,
    apertura_scheda: apertura,
    dimesso_at,
    id_pma: idPma,
    infermiere_rif: typeof d.infermiere_rif === 'string' ? d.infermiere_rif : '',
    medico_rif: typeof d.medico_rif === 'string' ? d.medico_rif : '',
  }
}

/**
 * Elenco pazienti del PMA in tempo reale: `where('id_pma', '==', pmaId)`.
 */
export function usePazientiForPma(pmaId: string | undefined) {
  const [items, setItems] = useState<PazienteListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db || !pmaId || pmaId.trim() === '') {
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

    const q = query(collection(db, 'pazienti'), where('id_pma', '==', pmaId.trim()))

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: PazienteListItem[] = []
        snap.forEach((docSnap) => {
          next.push(parseListItem(docSnap.id, docSnap.data() as Record<string, unknown>))
        })
        next.sort((a, b) => {
          if (a.stato === 'dimesso' && b.stato === 'dimesso') {
            const da = a.dimesso_at?.toMillis?.() ?? 0
            const db = b.dimesso_at?.toMillis?.() ?? 0
            return db - da
          }
          const ta = a.apertura_scheda?.toMillis?.() ?? 0
          const tb = b.apertura_scheda?.toMillis?.() ?? 0
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
  }, [pmaId])

  return { items, loading, error }
}
