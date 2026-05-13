import { useEffect, useId, useState, type FormEvent } from 'react'
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { STAFF_RANKS, staffRankRequiresPma, type StaffRank } from '../../types/userProfile'
import { db } from '../../lib/firebase'
import { useSyncLive } from '../../context/SyncLiveContext'
import {
  IdentityToolkitSignUpError,
  identityToolkitSignUp,
} from '../../lib/identityToolkitSignUp'
import { usePmaOptionsForManifestazione } from '../../hooks/usePmaOptionsForManifestazione'
import { readImageFileAsDataUrl, validateFirmaFile } from '../../lib/firmaMedicoImage'

type ManifestazioneOption = { nome: string }

type Props = {
  open: boolean
  onClose: () => void
}

export function AddUserModal({ open, onClose }: Props) {
  const { bumpSync } = useSyncLive()
  const titleId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [rank, setRank] = useState<StaffRank>('Centrale')
  const [idManifestazione, setIdManifestazione] = useState('')
  const [idPma, setIdPma] = useState('')
  const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null)
  const [firmaConverting, setFirmaConverting] = useState(false)
  const [firmaPickError, setFirmaPickError] = useState<string | null>(null)
  const [manifestazioni, setManifestazioni] = useState<ManifestazioneOption[]>([])
  const [manifestazioniLoading, setManifestazioniLoading] = useState(true)
  const [manifestazioniListError, setManifestazioniListError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const manForPma = rank !== 'Centrale' && idManifestazione.trim() ? idManifestazione.trim() : null
  const { items: pmaOptions, loading: pmaLoading } = usePmaOptionsForManifestazione(manForPma)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || !db) {
      return
    }

    const unsub = onSnapshot(
      collection(db, 'manifestazioni'),
      (snap) => {
        setManifestazioniListError(null)
        const next: ManifestazioneOption[] = []
        snap.forEach((docSnap) => {
          const d = docSnap.data() as Record<string, unknown>
          const stato = d.stato === 'CHIUSA' ? 'CHIUSA' : 'APERTA'
          if (stato === 'APERTA') {
            next.push({ nome: docSnap.id })
          }
        })
        next.sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
        setManifestazioni(next)
        setManifestazioniLoading(false)
        bumpSync()
      },
      (err) => {
        setManifestazioniListError(err.message)
        setManifestazioni([])
        setManifestazioniLoading(false)
        bumpSync()
      },
    )
    return () => unsub()
  }, [open, bumpSync])

  if (!open) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!db) {
      setError('Firestore non disponibile.')
      return
    }
    if (!idManifestazione) {
      setError('Seleziona la manifestazione di appartenenza.')
      return
    }
    if (staffRankRequiresPma(rank) && pmaLoading) {
      setError('Attendi il caricamento dell’elenco PMA.')
      return
    }
    if (staffRankRequiresPma(rank) && !idPma.trim()) {
      setError('Per Medico, Infermiere, Soccorritore e Triage è obbligatorio un PMA della manifestazione.')
      return
    }
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri (requisito Firebase).')
      return
    }
    if (rank === 'Medico' && firmaConverting) {
      setError('Attendi il termine della conversione dell’immagine firma.')
      return
    }
    if (rank === 'Medico' && firmaPickError) {
      setError(firmaPickError)
      return
    }

    setSubmitting(true)
    try {
      const { localId, email: createdEmail } = await identityToolkitSignUp(email, password)
      const idPmaValue = rank === 'Centrale' ? null : idPma.trim() || null

      const docPayload: Record<string, unknown> = {
        email: createdEmail.trim().toLowerCase(),
        nome: nome.trim(),
        rank,
        id_manifestazione: idManifestazione,
        id_pma: idPmaValue,
      }

      if (rank === 'Medico' && firmaDataUrl) {
        docPayload.firmaMedicoBase64 = firmaDataUrl
      }

      await setDoc(doc(db, 'utenti', localId), docPayload)

      if (rank === 'Medico' && firmaDataUrl) {
        setSuccess(`Operatore creato. UID: ${localId}. Firma salvata su Firestore (Base64).`)
      } else {
        setSuccess(`Operatore creato. UID: ${localId}. L’account è pronto per il primo accesso.`)
      }
    } catch (err: unknown) {
      if (err instanceof IdentityToolkitSignUpError) {
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-xl"
      >
        <div className="pma-bar flex-col items-start gap-1">
          <h2 id={titleId} className="pma-bar__id text-base font-semibold">
            Nuovo operatore
          </h2>
          <p className="text-xs text-[#a8a8c8]">
            Crea un account per il personale. La sessione del Superadmin non viene interrotta:
            registrazione tramite API REST Identity Toolkit.
          </p>
        </div>

        <form className="space-y-0" onSubmit={(e) => void handleSubmit(e)}>
          <label className="pma-field" htmlFor="au-email">
            <span className="pma-field__label">Email</span>
            <input
              id="au-email"
              type="email"
              autoComplete="off"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </label>
          <label className="pma-field" htmlFor="au-password">
            <span className="pma-field__label">Password</span>
            <input
              id="au-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
            />
          </label>
          <label className="pma-field" htmlFor="au-nome">
            <span className="pma-field__label">Nome</span>
            <input
              id="au-nome"
              type="text"
              required
              value={nome}
              onChange={(ev) => setNome(ev.target.value)}
            />
          </label>
          <label className="pma-field" htmlFor="au-rank">
            <span className="pma-field__label">Ruolo</span>
            <select
              id="au-rank"
              value={rank}
              onChange={(ev) => {
                const r = ev.target.value as StaffRank
                setRank(r)
                if (r === 'Centrale') {
                  setIdPma('')
                }
                if (r !== 'Medico') {
                  setFirmaDataUrl(null)
                  setFirmaPickError(null)
                  setFirmaConverting(false)
                }
              }}
            >
              {STAFF_RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <div className="pma-field">
            <label htmlFor="au-man" className="pma-field__label">
              Manifestazione (attive)
            </label>
            <select
              id="au-man"
              value={idManifestazione}
              onChange={(ev) => {
                setIdManifestazione(ev.target.value)
                setIdPma('')
              }}
              required
              disabled={manifestazioniLoading}
            >
              <option value="">
                {manifestazioniLoading ? 'Caricamento…' : '— Seleziona —'}
              </option>
              {manifestazioni.map((m) => (
                <option key={m.nome} value={m.nome}>
                  {m.nome}
                </option>
              ))}
            </select>
            {!manifestazioniLoading && manifestazioni.length === 0 ? (
              <p className="mt-1 text-xs text-amber-700">
                Nessuna manifestazione APERTA. Creane una dalla homepage.
              </p>
            ) : null}
            {manifestazioniListError ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {manifestazioniListError}
              </p>
            ) : null}
          </div>

          {rank !== 'Centrale' ? (
            <div className="pma-field">
              <label htmlFor="au-pma" className="pma-field__label">
                PMA assegnato
                {staffRankRequiresPma(rank) ? (
                  <span className="font-semibold text-slate-900"> (obbligatorio)</span>
                ) : null}
              </label>
              <select
                id="au-pma"
                value={idPma}
                onChange={(ev) => setIdPma(ev.target.value)}
                disabled={!idManifestazione || pmaLoading}
              >
                <option value="">{staffRankRequiresPma(rank) ? '— Seleziona PMA —' : 'Non assegnato'}</option>
                {pmaOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Per il ruolo Centrale il PMA non si assegna: visibilità su tutti i PMA della
                manifestazione.
              </p>
            </div>
          ) : (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Ruolo Centrale: nessun PMA assegnato (visibilità su tutta la manifestazione).
            </p>
          )}

          {rank === 'Medico' ? (
            <div className="pma-field">
              <label htmlFor="au-firma" className="pma-field__label">
                Timbro / firma (JPEG o PNG, max 2 MB)
              </label>
              <p className="mb-1 text-xs text-slate-500">
                L’immagine viene convertita in Base64 e salvata su Firestore nel campo{' '}
                <code className="rounded bg-slate-100 px-1">firmaMedicoBase64</code> (nessun
                Storage).
              </p>
              <input
                id="au-firma"
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-50"
                onChange={(ev) => {
                  const f = ev.target.files?.[0] ?? null
                  setFirmaPickError(null)
                  setFirmaDataUrl(null)
                  if (!f) {
                    setFirmaConverting(false)
                    return
                  }
                  const ferr = validateFirmaFile(f)
                  if (ferr) {
                    setFirmaPickError(ferr)
                    return
                  }
                  setFirmaConverting(true)
                  void readImageFileAsDataUrl(f)
                    .then((url) => {
                      setFirmaDataUrl(url)
                      setFirmaPickError(null)
                    })
                    .catch((err) => {
                      setFirmaDataUrl(null)
                      setFirmaPickError(err instanceof Error ? err.message : 'Conversione non riuscita.')
                    })
                    .finally(() => setFirmaConverting(false))
                }}
              />
              {firmaConverting ? (
                <p className="mt-2 text-xs text-slate-600">Conversione immagine…</p>
              ) : null}
              {firmaPickError ? (
                <p className="mt-2 text-xs text-red-600" role="alert">
                  {firmaPickError}
                </p>
              ) : null}
              {firmaDataUrl ? (
                <div className="mt-2">
                  <p className="text-xs font-medium text-slate-600">Anteprima (dopo conversione)</p>
                  <img
                    src={firmaDataUrl}
                    alt="Anteprima firma medico"
                    className="mt-1 max-h-28 w-auto max-w-full rounded border border-slate-200 bg-white object-contain p-1"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          {success ? (
            <div
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              role="status"
            >
              {success}
            </div>
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
                disabled={
                  submitting ||
                  manifestazioniLoading ||
                  manifestazioni.length === 0 ||
                  firmaConverting ||
                  (staffRankRequiresPma(rank) && (pmaLoading || !idPma.trim()))
                }
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? 'Creazione…' : 'Crea operatore'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
