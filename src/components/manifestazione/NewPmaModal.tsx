import { useEffect, useId, useState, type FormEvent } from 'react'
import { createPmaDocument, PmaNomeDuplicatoError, PmaNomeInvalidoError } from '../../lib/createPmaDocument'
import { db } from '../../lib/firebase'

type Props = {
  open: boolean
  manifestazioneId: string
  onClose: () => void
}

export function NewPmaModal({ open, manifestazioneId, onClose }: Props) {
  const titleId = useId()
  const [nome, setNome] = useState('')
  const [luogo, setLuogo] = useState('')
  const [posti, setPosti] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!db) {
      setError('Firestore non disponibile.')
      return
    }
    const n = Number(posti)
    setSubmitting(true)
    try {
      const id = await createPmaDocument(db, manifestazioneId, nome, luogo, n)
      setSuccess(`PMA creato con ID “${id}”.`)
    } catch (err: unknown) {
      if (err instanceof PmaNomeDuplicatoError || err instanceof PmaNomeInvalidoError) {
        setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Creazione non riuscita.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-xl"
      >
        <div className="pma-bar flex-col items-start gap-1">
          <h2 id={titleId} className="pma-bar__id text-base font-semibold">
            Crea nuovo PMA
          </h2>
          <p className="text-xs text-[#a8a8c8]">
            L’ID documento sarà il nome in <strong>minuscolo</strong>, <strong>senza spazi</strong>{' '}
            (come da PRD).
          </p>
        </div>

        <form className="space-y-0" onSubmit={(e) => void handleSubmit(e)}>
          <label className="pma-field" htmlFor="pma-nome">
            <span className="pma-field__label">Nome PMA</span>
            <input
              id="pma-nome"
              type="text"
              required
              value={nome}
              onChange={(ev) => setNome(ev.target.value)}
              placeholder="es. pma_nord"
            />
          </label>
          <label className="pma-field" htmlFor="pma-luogo">
            <span className="pma-field__label">Luogo</span>
            <input
              id="pma-luogo"
              type="text"
              required
              value={luogo}
              onChange={(ev) => setLuogo(ev.target.value)}
            />
          </label>
          <label className="pma-field" htmlFor="pma-posti">
            <span className="pma-field__label">Numero posti letto</span>
            <input
              id="pma-posti"
              type="number"
              min={0}
              step={1}
              required
              value={posti}
              onChange={(ev) => setPosti(ev.target.value)}
            />
          </label>

          {error ? (
            <p className="px-3 py-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mx-3 mb-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
              {success}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-100 px-3 py-3">
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              onClick={onClose}
            >
              {success ? 'Chiudi' : 'Annulla'}
            </button>
            {!success ? (
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? 'Salvataggio…' : 'Crea PMA'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
