import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { usePmaDocSnapshot } from '../../hooks/usePmaDocNome'
import { PmaManagerShell } from '../../components/pma/PmaManagerShell'

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((s) => s.trim())
}

export function PMAImpostazioniPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const pmaId = idParam ? decodeURIComponent(idParam) : ''
  const { user, logout } = useAuth()
  const pmaSnap = usePmaDocSnapshot(pmaId || undefined)
  const manIdForNav = pmaSnap.idManifestazione?.trim() ?? user?.id_manifestazione?.trim() ?? ''

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

  if (!user) {
    return null
  }

  const inner = (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[#111827]">Impostazioni PMA</h2>
        <p className="mt-2 text-[13px] text-slate-600">
          Documento: <code className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs">pma/{pmaId || '—'}</code>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          L&apos;elenco <strong className="text-[#111827]">Farmaci usati</strong> si aggiorna in automatico quando un farmaco viene
          aggiunto a una scheda paziente di questo PMA (<code className="rounded border border-slate-200 bg-slate-50 px-1 text-xs">arrayUnion</code> su{' '}
          <code className="rounded border border-slate-200 bg-slate-50 px-1 text-xs">farmaci_usati</code>).
        </p>
      </div>
      {error ? (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-slate-600">Caricamento…</p>
      ) : farmaciUsati.length === 0 ? (
        <p className="text-sm text-slate-600">Nessun farmaco registrato ancora.</p>
      ) : (
        <ul className="list-inside list-disc rounded-lg border border-slate-200 bg-white px-6 py-4 text-sm text-[#111827]">
          {farmaciUsati.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <PmaManagerShell
      user={user}
      pmaId={pmaId || '—'}
      manifestazioneId={manIdForNav}
      pmaDisplayTitle={`${pmaSnap.nome ?? pmaId} - Impostazioni`}
      logout={logout}
      triageStrip={null}
      topToolbar={
        <p className="text-[13px] text-slate-600">
          Elenco farmaci rilevati dalle schede cliniche collegate a questo PMA.
        </p>
      }
    >
      {inner}
    </PmaManagerShell>
  )
}
