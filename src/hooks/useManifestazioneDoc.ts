import { useEffect, useState } from 'react'
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useSyncLive } from '../context/SyncLiveContext'
import type { ManifestazioneStato } from '../types/manifestazione'
import { parsePresetDimissioneFromFirestore, type PresetDimissioneVoce } from '../types/manifestazioneImpostazioni'

export interface ManifestazioneHeaderData {
  nome: string
  data: Timestamp | null
  stato: ManifestazioneStato
  /** Testi mostrati in tab Dimissione (da `impostazioni` su `manifestazioni/{id}`). */
  consensoGenericoCure: string
  consensoPrivacy: string
  /** Testo mostrato se esito = Rifiuta invio in PS. */
  rifiutoInvioPs: string
  /** Frammenti importabili nelle note di dimissione. */
  presetDimissione: PresetDimissioneVoce[]
}

export function useManifestazioneDoc(manifestazioneId: string | undefined) {
  const { bumpSync } = useSyncLive()
  const [data, setData] = useState<ManifestazioneHeaderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exists, setExists] = useState(true)

  useEffect(() => {
    if (!db || !manifestazioneId) {
      setLoading(false)
      setExists(false)
      setData(null)
      setError(manifestazioneId ? null : 'ID manifestazione mancante.')
      return
    }

    setLoading(true)
    setError(null)

    const ref = doc(db, 'manifestazioni', manifestazioneId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setExists(false)
          setData(null)
          setLoading(false)
          bumpSync()
          return
        }
        const d = snap.data() as Record<string, unknown>
        const dataField = d.data
        const imp =
          d.impostazioni && typeof d.impostazioni === 'object' && d.impostazioni !== null
            ? (d.impostazioni as Record<string, unknown>)
            : {}
        const ts =
          dataField && typeof (dataField as Timestamp).toDate === 'function'
            ? (dataField as Timestamp)
            : null
        const stato: ManifestazioneStato = d.stato === 'CHIUSA' ? 'CHIUSA' : 'APERTA'
        setExists(true)
        setData({
          nome: typeof d.nome === 'string' ? d.nome : manifestazioneId,
          data: ts,
          stato,
          consensoGenericoCure:
            typeof imp.consenso_generico_cure === 'string' ? imp.consenso_generico_cure : '',
          consensoPrivacy: typeof imp.consenso_privacy === 'string' ? imp.consenso_privacy : '',
          rifiutoInvioPs: typeof imp.rifiuto_invio_ps === 'string' ? imp.rifiuto_invio_ps : '',
          presetDimissione: parsePresetDimissioneFromFirestore(imp.preset_dimissione),
        })
        setLoading(false)
        bumpSync()
      },
      (err) => {
        setError(err.message)
        setLoading(false)
        bumpSync()
      },
    )

    return () => unsub()
  }, [manifestazioneId, bumpSync])

  return { data, loading, error, exists }
}
