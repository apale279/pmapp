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
        const imp = d.impostazioni_pma
        let fromNested: string[] = []
        if (imp && typeof imp === 'object' && imp !== null && 'elenco_farmaci_usati' in imp) {
          fromNested = asStringArray((imp as { elenco_farmaci_usati?: unknown }).elenco_farmaci_usati)
        }
        const fromLegacy = asStringArray(d.farmaci_usati)
        const merged = [...new Set([...fromNested, ...fromLegacy])].sort((a, b) => a.localeCompare(b, 'it'))
        setFarmaciUsati(merged)
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
    <div className="pma-dashboard space-y-6">
      <section className="pma-card">
        <div className="pma-card__hdr">Elenco farmaci usati</div>
        <p className="text-xs text-slate-500">Impostazioni PMA — consumi registrati</p>
        <div className="mt-4 border-t border-slate-100 pt-4">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </div>
          ) : null}
          {!error && loading ? <p className="text-sm text-slate-600">Caricamento…</p> : null}
          {!error && !loading && farmaciUsati.length === 0 ? (
            <p className="text-sm text-slate-600">Nessun farmaco registrato ancora.</p>
          ) : null}
          {!error && !loading && farmaciUsati.length > 0 ? (
            <ul className="list-inside list-disc text-sm font-medium text-slate-900">
              {farmaciUsati.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  )

  const asideCol = (
    <div className="space-y-4">
      <section className="pma-card">
        <div className="pma-card__hdr">Documento</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Percorso Firestore:{' '}
          <code className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-1.5 py-0.5 font-mono text-xs text-slate-900">
            pma/{pmaId || '—'}
          </code>
        </p>
      </section>
      <section className="pma-card">
        <div className="pma-card__hdr">Origine dati</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Campo <code className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-1 text-xs">impostazioni_pma.elenco_farmaci_usati</code> sul documento PMA: si aggiorna quando un farmaco viene registrato su una scheda paziente (
          <code className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-1 text-xs">arrayUnion</code>).
          Se manca, viene letto anche il dato legacy <code className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-1 text-xs">farmaci_usati</code> in radice.
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
