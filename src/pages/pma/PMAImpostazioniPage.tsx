import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { useSyncLive } from '../../context/SyncLiveContext'
import { db } from '../../lib/firebase'
import { usePmaDocSnapshot } from '../../hooks/usePmaDocNome'
import { PmaManagerShell } from '../../components/pma/PmaManagerShell'
import { OperativePageGrid } from '../../components/layout/OperativePageGrid'
import { opToolbarBtnSm } from '../../components/layout/operativeTokens'

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((s) => s.trim())
}

export function PMAImpostazioniPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const pmaId = idParam ? decodeURIComponent(idParam) : ''
  const { user, logout } = useAuth()
  const { bumpSync } = useSyncLive()
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
          bumpSync()
          return
        }
        const d = snap.data() as Record<string, unknown>
        setFarmaciUsati(asStringArray(d.farmaci_usati))
        setLoading(false)
        bumpSync()
      },
      (e) => {
        setError(e.message)
        setLoading(false)
        bumpSync()
      },
    )
    return () => unsub()
  }, [pmaId, bumpSync])

  if (!user) {
    return null
  }

  const mainCol = (
    <div className="space-y-6">
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
        <ul className="list-inside list-disc rounded-lg border border-[#e2e8f0] bg-white px-6 py-4 text-sm text-slate-900">
          {farmaciUsati.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  )

  const asideCol = (
    <div className="space-y-4">
      <section className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-slate-500">Documento</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
          Percorso Firestore:{' '}
          <code className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-1.5 py-0.5 font-mono text-xs text-slate-900">
            pma/{pmaId || '—'}
          </code>
        </p>
      </section>
      <section className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-slate-500">Farmaci usati</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
          L&apos;elenco si aggiorna in automatico quando un farmaco viene aggiunto a una scheda paziente di
          questo PMA (<code className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-1 text-xs">arrayUnion</code>{' '}
          su <code className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-1 text-xs">farmaci_usati</code>).
        </p>
      </section>
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
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Impostazioni PMA</h2>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Link
              to={`/pma/${encodeURIComponent(pmaId)}`}
              className={`${opToolbarBtnSm} no-underline`}
              aria-disabled={!pmaId.trim()}
              onClick={(e) => {
                if (!pmaId.trim()) e.preventDefault()
              }}
            >
              Torna alla dashboard
            </Link>
          </div>
        </div>
      }
    >
      <OperativePageGrid main={mainCol} aside={asideCol} />
    </PmaManagerShell>
  )
}
