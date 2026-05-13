import { useEffect, useId, useState, type FormEvent } from 'react'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { UtenteListRow } from '../../types/utenteList'
import { STAFF_RANKS, isStaffRank, staffRankRequiresPma, type StaffRank } from '../../types/userProfile'
import type { ManifestazioneSelectOption } from '../../hooks/useManifestazioniSelectOptions'
import { usePmaOptionsForManifestazione } from '../../hooks/usePmaOptionsForManifestazione'
import { readImageFileAsDataUrl, validateFirmaFile } from '../../lib/firmaMedicoImage'

type Props = {
  open: boolean
  utente: UtenteListRow | null
  manifestazioni: ManifestazioneSelectOption[]
  manifestazioniLoading: boolean
  onClose: () => void
  onSaved: () => void
}

type InnerProps = {
  utente: UtenteListRow
  manifestazioni: ManifestazioneSelectOption[]
  manifestazioniLoading: boolean
  onClose: () => void
  onSaved: () => void
}

function EditUserModalInner({
  utente: row,
  manifestazioni,
  manifestazioniLoading,
  onClose,
  onSaved,
}: InnerProps) {
  const titleId = useId()
  const [nome, setNome] = useState(() => row.nome)
  const [rank, setRank] = useState<StaffRank>(() =>
    isStaffRank(row.rank) ? row.rank : 'Soccorritore',
  )
  const [idManifestazione, setIdManifestazione] = useState(() => row.id_manifestazione ?? '')
  const [idPma, setIdPma] = useState(() => row.id_pma ?? '')
  const [firmaDataUrlPending, setFirmaDataUrlPending] = useState<string | null>(null)
  const [firmaConverting, setFirmaConverting] = useState(false)
  const [firmaPickError, setFirmaPickError] = useState<string | null>(null)
  const [firmaClear, setFirmaClear] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const manForQuery = idManifestazione.trim() || null
  const { items: pmaOptions, loading: pmaLoading } = usePmaOptionsForManifestazione(
    rank === 'Centrale' ? null : manForQuery,
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!db) {
      setError('Firestore non disponibile.')
      return
    }
    const nomeT = nome.trim()
    if (!nomeT) {
      setError('Il nome è obbligatorio.')
      return
    }
    if (!idManifestazione.trim()) {
      setError('È obbligatoria una manifestazione.')
      return
    }
    if (rank === 'Medico' && firmaConverting) {
      setError('Attendi il termine della conversione dell’immagine firma.')
      return
    }

    const manNew = idManifestazione.trim()
    let pmaNew = ''
    if (rank !== 'Centrale' && manNew && !pmaLoading) {
      if (idPma && pmaOptions.some((p) => p.id === idPma)) {
        pmaNew = idPma.trim()
      }
    }

    if (staffRankRequiresPma(rank)) {
      if (pmaLoading) {
        setError('Attendi il caricamento dell’elenco PMA.')
        return
      }
      if (!pmaNew) {
        setError('Per Medico, Infermiere, Soccorritore e Triage è obbligatorio un PMA della manifestazione.')
        return
      }
    }

    const manOrig = row.id_manifestazione ?? ''
    const pmaOrig = row.id_pma ?? ''

    const patch: Record<string, unknown> = {}
    if (nomeT !== row.nome) patch.nome = nomeT
    if (rank !== row.rank) patch.rank = rank
    if (manOrig !== manNew) {
      patch.id_manifestazione = manNew ? manNew : null
    }
    if (pmaOrig !== pmaNew) {
      patch.id_pma = pmaNew ? pmaNew : null
    }

    const hadFirma = Boolean(row.firmaUrl || row.firmaMedicoBase64)

    if (rank !== 'Medico') {
      if (row.rank === 'Medico' && hadFirma) {
        patch.firmaUrl = deleteField()
        patch.firmaMedicoBase64 = deleteField()
        patch.firma_medico_base64 = deleteField()
      }
    } else if (firmaClear && hadFirma) {
      patch.firmaUrl = deleteField()
      patch.firmaMedicoBase64 = deleteField()
      patch.firma_medico_base64 = deleteField()
    } else if (firmaDataUrlPending) {
      patch.firmaMedicoBase64 = firmaDataUrlPending
      patch.firmaUrl = deleteField()
      patch.firma_medico_base64 = deleteField()
    }

    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await updateDoc(doc(db, 'utenti', row.uid), patch)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    } finally {
      setSubmitting(false)
    }
  }

  const showFirma = rank === 'Medico'
  const firmaDisplaySrc = firmaClear
    ? null
    : firmaDataUrlPending ?? row.firmaMedicoBase64 ?? row.firmaUrl

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
            Modifica utente
          </h2>
          <p className="text-xs text-[#a8a8c8]">
            Email (sola lettura): <span className="font-medium text-[#e8e8f8]">{row.email}</span>
          </p>
        </div>

        <form className="space-y-0" onSubmit={(e) => void handleSubmit(e)}>
          <label className="pma-field" htmlFor="eu-nome">
            <span className="pma-field__label">Nome</span>
            <input
              id="eu-nome"
              type="text"
              required
              value={nome}
              onChange={(ev) => setNome(ev.target.value)}
            />
          </label>

          <label className="pma-field" htmlFor="eu-rank">
            <span className="pma-field__label">Rank</span>
            <select
              id="eu-rank"
              value={rank}
              onChange={(ev) => {
                const r = ev.target.value as StaffRank
                setRank(r)
                if (r === 'Centrale') {
                  setIdPma('')
                }
                if (r !== 'Medico') {
                  setFirmaDataUrlPending(null)
                  setFirmaClear(false)
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
            <label htmlFor="eu-man" className="pma-field__label">
              Manifestazione
            </label>
            <select
              id="eu-man"
              value={idManifestazione}
              onChange={(ev) => {
                setIdManifestazione(ev.target.value)
                setIdPma('')
              }}
              disabled={manifestazioniLoading}
            >
              <option value="">
                {manifestazioniLoading ? 'Caricamento…' : '— Seleziona —'}
              </option>
              {manifestazioni.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                  {m.stato === 'CHIUSA' ? ' (chiusa)' : ''}
                </option>
              ))}
            </select>
          </div>

          {rank !== 'Centrale' ? (
            <div className="pma-field">
              <label htmlFor="eu-pma" className="pma-field__label">
                PMA assegnato
                {staffRankRequiresPma(rank) ? (
                  <span className="font-semibold text-slate-900"> (obbligatorio)</span>
                ) : null}
              </label>
              <select
                id="eu-pma"
                value={
                  idPma && pmaOptions.some((p) => p.id === idPma) && !pmaLoading ? idPma : ''
                }
                onChange={(ev) => setIdPma(ev.target.value)}
                disabled={!manForQuery || pmaLoading}
              >
                <option value="">{staffRankRequiresPma(rank) ? '— Seleziona PMA —' : 'Non assegnato'}</option>
                {pmaOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
              {!manForQuery ? (
                <p className="mt-1 text-xs text-slate-500">Seleziona prima una manifestazione.</p>
              ) : pmaLoading ? (
                <p className="mt-1 text-xs text-slate-500">Caricamento PMA…</p>
              ) : pmaOptions.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700">Nessun PMA per questa manifestazione.</p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Ruolo Centrale: nessun PMA assegnato; al salvataggio <code className="rounded bg-slate-100 px-1">id_pma</code> viene azzerato.
            </p>
          )}

          {showFirma ? (
            <div className="pma-card mx-3 mb-2">
              <div className="pma-card__hdr">Timbro / firma (solo Medico)</div>
              <p className="text-xs text-slate-500">
                JPEG o PNG, massimo 2 MB. Conversione in Base64 e salvataggio su Firestore (
                <code className="rounded bg-white px-1">firmaMedicoBase64</code>
                ). Priorità di visualizzazione: Base64, poi URL legacy (
                <code className="rounded bg-white px-1">firmaUrl</code>
                ).
              </p>
              <label htmlFor="eu-firma" className="mt-2 block">
                <span className="pma-field__label">Carica nuova immagine</span>
              </label>
              <input
                id="eu-firma"
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-50"
                onChange={(ev) => {
                  setFirmaClear(false)
                  const f = ev.target.files?.[0] ?? null
                  setFirmaPickError(null)
                  setFirmaDataUrlPending(null)
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
                      setFirmaDataUrlPending(url)
                      setFirmaPickError(null)
                    })
                    .catch((err) => {
                      setFirmaDataUrlPending(null)
                      setFirmaPickError(
                        err instanceof Error ? err.message : 'Conversione non riuscita.',
                      )
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
              {firmaDisplaySrc ? (
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-600">Anteprima</p>
                  <img
                    src={firmaDisplaySrc}
                    alt="Firma medico"
                    className="mt-1 max-h-28 w-auto max-w-full rounded border border-slate-200 bg-white object-contain p-1"
                  />
                </div>
              ) : !firmaConverting ? (
                <p className="mt-3 text-sm text-amber-900" role="status">
                  Firma non configurata
                </p>
              ) : null}
              {firmaClear ? (
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900"
                  onClick={() => setFirmaClear(false)}
                >
                  Annulla rimozione firma
                </button>
              ) : row.firmaMedicoBase64 || row.firmaUrl || firmaDataUrlPending ? (
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-red-700 underline decoration-red-300 underline-offset-2 hover:text-red-800"
                  onClick={() => {
                    setFirmaClear(true)
                    setFirmaDataUrlPending(null)
                    setFirmaPickError(null)
                  }}
                >
                  Rimuovi firma dal profilo
                </button>
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

          <div className="flex justify-end gap-2 border-t border-slate-100 px-3 py-3">
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              onClick={onClose}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting || manifestazioniLoading || firmaConverting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? 'Salvataggio…' : 'Salva modifiche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function EditUserModal({
  open,
  utente,
  manifestazioni,
  manifestazioniLoading,
  onClose,
  onSaved,
}: Props) {
  if (!open || !utente) return null
  return (
    <EditUserModalInner
      key={utente.uid}
      utente={utente}
      manifestazioni={manifestazioni}
      manifestazioniLoading={manifestazioniLoading}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}
