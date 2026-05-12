import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

export type PmaDocSnapshot = {
  nome: string | null
  /** Collegamento alla manifestazione (campo su `pma/{id}`). */
  idManifestazione: string | null
  loading: boolean
}

/** Metadati PMA da `pma/{id}` (nome + manifestazione collegata). */
export function usePmaDocSnapshot(pmaId: string | undefined): PmaDocSnapshot {
  const [nome, setNome] = useState<string | null>(null)
  const [idManifestazione, setIdManifestazione] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !pmaId?.trim()) {
      setNome(null)
      setIdManifestazione(null)
      setLoading(false)
      return
    }
    const id = pmaId.trim()
    const ref = doc(db, 'pma', id)
    setLoading(true)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setNome(id)
          setIdManifestazione(null)
          setLoading(false)
          return
        }
        const d = snap.data() as Record<string, unknown>
        const n = typeof d.nome === 'string' && d.nome.trim() !== '' ? d.nome.trim() : id
        const mid =
          typeof d.id_manifestazione === 'string' && d.id_manifestazione.trim() !== ''
            ? d.id_manifestazione.trim()
            : null
        setNome(n)
        setIdManifestazione(mid)
        setLoading(false)
      },
      () => {
        setNome(id)
        setIdManifestazione(null)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [pmaId])

  return { nome, idManifestazione, loading }
}

/** Nome visualizzato del PMA (compat). */
export function usePmaDocNome(pmaId: string | undefined) {
  return usePmaDocSnapshot(pmaId).nome
}
