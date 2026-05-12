import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { UtenteListRow } from '../types/utenteList'
import { isUserRank, type UserRank } from '../types/userProfile'

function parseRow(uid: string, d: Record<string, unknown>): UtenteListRow {
  const rankRaw = d.rank
  const rank: UserRank = isUserRank(rankRaw) ? rankRaw : 'Soccorritore'
  const idMan =
    typeof d.id_manifestazione === 'string' && d.id_manifestazione.trim() !== ''
      ? d.id_manifestazione.trim()
      : undefined
  const idPma =
    typeof d.id_pma === 'string' && d.id_pma.trim() !== ''
      ? d.id_pma.trim()
      : undefined
  const firmaUrl =
    typeof d.firmaUrl === 'string' && d.firmaUrl.trim() !== '' ? d.firmaUrl.trim() : undefined
  const firmaMedicoBase64Raw =
    typeof d.firmaMedicoBase64 === 'string' && d.firmaMedicoBase64.trim() !== ''
      ? d.firmaMedicoBase64.trim()
      : typeof d.firma_medico_base64 === 'string' && d.firma_medico_base64.trim() !== ''
        ? d.firma_medico_base64.trim()
        : undefined

  return {
    uid,
    nome: typeof d.nome === 'string' && d.nome.trim() !== '' ? d.nome.trim() : 'Senza nome',
    email: typeof d.email === 'string' && d.email.trim() !== '' ? d.email.trim() : '—',
    rank,
    ...(idMan !== undefined ? { id_manifestazione: idMan } : {}),
    ...(idPma !== undefined ? { id_pma: idPma } : {}),
    ...(firmaMedicoBase64Raw !== undefined ? { firmaMedicoBase64: firmaMedicoBase64Raw } : {}),
    ...(firmaUrl !== undefined ? { firmaUrl } : {}),
  }
}

/**
 * Elenco utenti in tempo reale (onSnapshot su `utenti`).
 */
export function useUtentiRealtime() {
  const [items, setItems] = useState<UtenteListRow[]>([])
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
      collection(db, 'utenti'),
      (snap) => {
        const next: UtenteListRow[] = []
        snap.forEach((docSnap) => {
          next.push(parseRow(docSnap.id, docSnap.data() as Record<string, unknown>))
        })
        next.sort((a, b) => {
          const byNome = a.nome.localeCompare(b.nome, 'it')
          if (byNome !== 0) return byNome
          return a.uid.localeCompare(b.uid)
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
  }, [])

  return { items, loading, error }
}
