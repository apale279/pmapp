import { useEffect, useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ManifestazioneNomeDuplicatoError,
  ManifestazioneNomeInvalidoError,
  createManifestazioneDocument,
} from '../../lib/createManifestazione'
import { auth, db } from '../../lib/firebase'
import { opPrimaryBtn } from '../layout/operativeTokens'

type Props = {
  open: boolean
  onClose: () => void
}

export function NewManifestazioneModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const titleId = useId()
  const [nome, setNome] = useState('')
  const [data, setData] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

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
    setCreatedId(null)
    if (!db || !auth?.currentUser) {
      setError('Sessione o Firebase non disponibili.')
      return
    }
    setSubmitting(true)
    try {
      const nomeId = await createManifestazioneDocument(db, nome, data)
      setCreatedId(nomeId)
    } catch (err: unknown) {
      if (err instanceof ManifestazioneNomeDuplicatoError) {
        setError(err.message)
      } else if (err instanceof ManifestazioneNomeInvalidoError) {
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
            Nuova manifestazione
          </h2>
          <p className="text-xs text-[#a8a8c8]">
            Il nome è l’identificativo univoco: niente spazi (né altri caratteri non validi per l’ID).
          </p>
        </div>

        <form className="space-y-0" onSubmit={(e) => void handleSubmit(e)}>
          <label className="pma-field" htmlFor="nm-nome">
            <span className="pma-field__label">Nome (ID)</span>
            <input
              id="nm-nome"
              type="text"
              autoComplete="off"
              value={nome}
              onChange={(ev) => setNome(ev.target.value)}
              placeholder="es. MilanoMarathon2026"
              required
            />
          </label>
          <label className="pma-field" htmlFor="nm-data">
            <span className="pma-field__label">Data</span>
            <input id="nm-data" type="date" value={data} onChange={(ev) => setData(ev.target.value)} required />
          </label>

          {error ? (
            <p className="px-3 py-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {createdId ? (
            <div className="mx-3 mb-2 space-y-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-950" role="status">
              <p>
                Manifestazione <strong>{createdId}</strong> creata con stato APERTA.
              </p>
              <p className="text-emerald-900/90">
                Apri la dashboard per creare i PMA dell&apos;evento, poi aggiungi il personale da Gestione utenti.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-3 py-3">
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              onClick={onClose}
            >
              {createdId ? 'Chiudi' : 'Annulla'}
            </button>
            {createdId ? (
              <button
                type="button"
                className={opPrimaryBtn}
                onClick={() => {
                  onClose()
                  void navigate(
                    `/manifestazione/${encodeURIComponent(createdId)}?nuovoPma=1`,
                  )
                }}
              >
                Apri dashboard e crea PMA
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? 'Salvataggio…' : 'Crea'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
