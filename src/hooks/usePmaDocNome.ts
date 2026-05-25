import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'

export type PmaDocSnapshot = {
  nome: string | null
  /** Collegamento alla manifestazione (campo su `pma/{id}`). */
  idManifestazione: string | null
  /** Token integrazione CROSS. */
  token: string | null
  loading: boolean
}

/** Metadati PMA da `pma/{id}` (nome + manifestazione collegata). */
export function usePmaDocSnapshot(pmaId: string | undefined): PmaDocSnapshot {
  const { bumpSync } = useSyncLive()
  const [nome, setNome] = useState<string | null>(null)
  const [idManifestazione, setIdManifestazione] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !pmaId?.trim()) {
      setNome(null)
      setIdManifestazione(null)
      setToken(null)
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
          setToken(null)
          setLoading(false)
          bumpSync()
          return
        }
        const d = snap.data() as Record<string, unknown>
        const n = typeof d.nome === 'string' && d.nome.trim() !== '' ? d.nome.trim() : id
        const mid =
          typeof d.id_manifestazione === 'string' && d.id_manifestazione.trim() !== ''
            ? d.id_manifestazione.trim()
            : null
        const tok = typeof d.token === 'string' && d.token.trim() ? d.token.trim() : null
        setNome(n)
        setIdManifestazione(mid)
        setToken(tok)
        setLoading(false)
        bumpSync()
      },
      () => {
        setNome(id)
        setIdManifestazione(null)
        setToken(null)
        setLoading(false)
        bumpSync()
      },
    )
    return () => unsub()
  }, [pmaId, bumpSync])

  return { nome, idManifestazione, token, loading }
}

/** Nome visualizzato del PMA (compat). */
export function usePmaDocNome(pmaId: string | undefined) {
  return usePmaDocSnapshot(pmaId).nome
}
