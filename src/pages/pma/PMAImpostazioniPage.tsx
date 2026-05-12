import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { useParams } from 'react-router-dom'
import { db } from '../../lib/firebase'

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((s) => s.trim())
}

/**
 * IMP_PMA — elenco farmaci usati (aggiornato automaticamente dalle schede paziente).
 */
export function PMAImpostazioniPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const pmaId = idParam ? decodeURIComponent(idParam) : ''

  const [farmaciUsati, setFarmaciUsati] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db || !pmaId) {
      setFarmaciUsati([])
      setLoading(false)
      return
    }
    setLoading(true)
    const ref = doc(db, 'pma', pmaId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setFarmaciUsati([])
          setLoading(false)
          return
        }
        const d = snap.data() as Record<string, unknown>
        setFarmaciUsati(asStringArray(d.farmaci_usati))
        setLoading(false)
      },
      (e) => {
        setError(e.message)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [pmaId])

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Impostazioni PMA</h1>
      <p className="text-sm text-slate-500">Documento: pma/{pmaId || '—'}</p>
      <p className="text-sm text-slate-600">
        L’elenco <strong>Farmaci usati</strong> si aggiorna in automatico quando un farmaco viene
        aggiunto a una scheda paziente di questo PMA (<code className="rounded bg-slate-100 px-1">arrayUnion</code> su{' '}
        <code className="rounded bg-slate-100 px-1">farmaci_usati</code>).
      </p>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-slate-600">Caricamento…</p>
      ) : farmaciUsati.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun farmaco registrato ancora.</p>
      ) : (
        <ul className="list-inside list-disc rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800">
          {farmaciUsati.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
