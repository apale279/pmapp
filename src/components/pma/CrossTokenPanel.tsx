import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'

function newCrossToken(): string {
  return crypto.randomUUID()
}

export function TokenDisplay({ token, pmaId }: { token: string; pmaId: string }) {
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenErr, setRegenErr] = useState<string | null>(null)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setRegenErr('Copia negli appunti non riuscita.')
    }
  }

  async function handleRegenerate() {
    if (
      !window.confirm(
        'Rigenerare il token? Il vecchio token su CROSS smetterà di funzionare.',
      )
    ) {
      return
    }
    if (!db) {
      setRegenErr('Firestore non disponibile.')
      return
    }
    setRegenerating(true)
    setRegenErr(null)
    try {
      await updateDoc(doc(db, 'pma', pmaId), { token: newCrossToken() })
    } catch (e) {
      setRegenErr(e instanceof Error ? e.message : 'Rigenerazione non riuscita.')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <code className="block max-w-full truncate rounded border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-xs text-slate-800">
          {token}
        </code>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          {copied ? 'Copiato!' : 'Copia'}
        </button>
        <button
          type="button"
          disabled={regenerating}
          onClick={() => void handleRegenerate()}
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {regenerating ? '…' : 'Rigenera'}
        </button>
      </div>
      {regenErr ? (
        <p className="text-xs text-red-600" role="alert">
          {regenErr}
        </p>
      ) : null}
    </div>
  )
}

export function GeneraTokenButton({ pmaId }: { pmaId: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleGenerate() {
    if (!db) {
      setErr('Firestore non disponibile.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await updateDoc(doc(db, 'pma', pmaId), { token: newCrossToken() })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Generazione non riuscita.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleGenerate()}
        className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? 'Generazione…' : 'Genera token'}
      </button>
      {err ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  )
}
