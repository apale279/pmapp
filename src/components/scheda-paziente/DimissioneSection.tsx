import { useEffect, useState } from 'react'
import { deleteField, serverTimestamp } from 'firebase/firestore'
import { saveAs } from 'file-saver'
import type { Paziente } from '../../types/paziente'
import type { UserProfile } from '../../types/userProfile'
import {
  DIMISSIONE_ESITO_LABEL,
  DIMISSIONE_ESITO_VALUES,
  type DimissioneEsito,
} from '../../types/dimissione'
import { SignatureCanvas } from './SignatureCanvas'
import {
  buildMailtoReportPaziente,
  buildPazientePdfBlob,
  defaultPdfFilename,
} from '../../lib/pdf/pazientePdfReport'
import type { PresetDimissioneVoce } from '../../types/manifestazioneImpostazioni'

type Props = {
  p: Paziente
  user: UserProfile | null
  isMedico: boolean
  /** Matrice Rank.xlsx: Superadmin, Centrale, Medico con scheda aperta. */
  canEditDimissioneTab: boolean
  /** `p.aperto && user` — scheda modificabile a livello documento */
  canEditScheda: boolean
  write: (patch: Record<string, unknown>) => Promise<void>
  /** Intestazione PDF (manifestazione / PMA). */
  reportManifestazioneNome: string
  reportPmaNome: string
  /** Da impostazioni manifestazione (solo lettura in tab dimissione). */
  consensoGenericoCure?: string
  consensoPrivacy?: string
  rifiutoInvioPs?: string
  presetDimissione?: PresetDimissioneVoce[]
}

/**
 * Sezione 4 — Dimissione (SchedaPaziente v2, §5 MD).
 * Campi dimissione editabili da **Superadmin, Centrale o Medico** con scheda aperta (matrice Rank).
 * Chiusura definitiva (**Dimetti**) e stato **Dimesso**: solo **Medico** con scheda aperta (tab Dimissioni).
 */
export function DimissioneSection({
  p,
  user,
  isMedico,
  canEditDimissioneTab,
  canEditScheda,
  write,
  reportManifestazioneNome,
  reportPmaNome,
  consensoGenericoCure = '',
  consensoPrivacy = '',
  rifiutoInvioPs = '',
  presetDimissione = [],
}: Props) {
  const dimissioneEdit = canEditDimissioneTab && canEditScheda
  const canChiudiDimetti = Boolean(canEditScheda && user && user.rank === 'Medico')
  const [noteDraft, setNoteDraft] = useState(p.dimissione_note)
  const [dimettiOpen, setDimettiOpen] = useState(false)
  const [dimettiBusy, setDimettiBusy] = useState(false)
  const [replaceFirma, setReplaceFirma] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfErr, setPdfErr] = useState<string | null>(null)

  useEffect(() => {
    setNoteDraft(p.dimissione_note)
  }, [p.id])
  useEffect(() => {
    if (!dimissioneEdit) setNoteDraft(p.dimissione_note)
  }, [dimissioneEdit, p.dimissione_note])

  const pdfManifestazioneTesti = {
    consensoGenericoCure: consensoGenericoCure.trim() || undefined,
    consensoPrivacy: consensoPrivacy.trim() || undefined,
    rifiutoInvioPsText: rifiutoInvioPs.trim() || undefined,
  }

  const firmaMedicoProfilo =
    isMedico && user
      ? (user.firma_medico_base64?.trim() || user.firmaUrl?.trim() || null)
      : null
  const firmaMedicoPreview = p.dimissione_firma_medico_base64 ?? firmaMedicoProfilo

  async function handleSaveFirmaPaziente(dataUrl: string) {
    await write({
      firma_paziente_base64: dataUrl,
      firma_paziente_url: deleteField(),
    })
    setReplaceFirma(false)
  }

  async function handleDimettiConfirm() {
    if (!canChiudiDimetti || !user) return
    setDimettiBusy(true)
    try {
      const snap =
        user.firma_medico_base64?.trim() ||
        user.firmaUrl?.trim() ||
        null
      await write({
        aperto: false,
        stato: 'dimesso',
        dimesso_at: serverTimestamp(),
        dimissione_firma_medico_base64: snap,
        dimissione_firma_medico_url: deleteField(),
      })
      setDimettiOpen(false)
    } finally {
      setDimettiBusy(false)
    }
  }

  async function handleDownloadPdf() {
    setPdfErr(null)
    setPdfBusy(true)
    try {
      const blob = await buildPazientePdfBlob(p, {
        manifestazioneNome: reportManifestazioneNome,
        pmaNome: reportPmaNome,
        firmaMedicoProfiloDataUrl: firmaMedicoProfilo,
        ...pdfManifestazioneTesti,
      })
      saveAs(blob, defaultPdfFilename(p))
    } catch (e) {
      setPdfErr(e instanceof Error ? e.message : 'Generazione PDF non riuscita.')
    } finally {
      setPdfBusy(false)
    }
  }

  async function handleInviaEmailPdf() {
    if (!dimissioneEdit) return
    let to = p.email?.trim() ?? ''
    if (!to) {
      const entered = window.prompt(
        'Email del destinatario non presente sulla scheda. Inserisci l’indirizzo email per aprire il messaggio.',
      )
      if (!entered?.trim()) return
      to = entered.trim()
    }
    setPdfErr(null)
    setPdfBusy(true)
    try {
      const blob = await buildPazientePdfBlob(p, {
        manifestazioneNome: reportManifestazioneNome,
        pmaNome: reportPmaNome,
        firmaMedicoProfiloDataUrl: firmaMedicoProfilo,
        ...pdfManifestazioneTesti,
      })
      const fname = defaultPdfFilename(p)
      saveAs(blob, fname)
      const mail = buildMailtoReportPaziente({
        toEmail: to,
        pazienteIdVisibile: p.id_paziente_visibile,
        pdfFilename: fname,
      })
      window.location.assign(mail)
    } catch (e) {
      setPdfErr(e instanceof Error ? e.message : 'Operazione non riuscita.')
    } finally {
      setPdfBusy(false)
    }
  }

  const firmaPaz = p.firma_paziente_base64

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="pma-section-hdr">Sezione 4 — Dimissione</div>
      <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-slate-600">
          Modificabile da <strong>Superadmin, Centrale o Medico</strong> con scheda aperta. Dopo la dimissione
          definitiva la scheda è chiusa per tutti i ruoli.
        </p>
        {p.dimesso_at ? (
          <p className="shrink-0 text-xs text-slate-500">
            Chiusura:{' '}
            <span className="font-medium text-slate-800">
              {p.dimesso_at.toDate().toLocaleString('it-IT')}
            </span>
          </p>
        ) : null}
      </div>

      {!dimissioneEdit ? (
        <p className="mx-3 mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {canEditDimissioneTab && !p.aperto
            ? 'Scheda chiusa dopo dimissione: dimissione e firme in sola lettura.'
            : 'Sola lettura: la dimissione su scheda aperta è riservata a Superadmin, Centrale o Medico.'}
        </p>
      ) : null}

      <div className="space-y-0">
        <div className="pma-row">
          <label className="pma-field max-w-xl">
            <span className="pma-field__label">Esito</span>
            <select
              disabled={!dimissioneEdit}
              value={p.dimissione_esito ?? ''}
              onChange={(e) => {
                const v = e.target.value
                void write({
                  dimissione_esito: v === '' ? null : (v as DimissioneEsito),
                })
              }}
            >
              <option value="">— Seleziona —</option>
              {DIMISSIONE_ESITO_VALUES.map((id) => (
                <option key={id} value={id}>
                  {DIMISSIONE_ESITO_LABEL[id]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {p.dimissione_esito === 'riaffidato' ? (
          <div className="border-b border-slate-100">
            <div className="pma-section-hdr">Dati affidatario</div>
            <div className="pma-row pma-row--2">
              <label className="pma-field pma-field--br">
                <span className="pma-field__label">Nome</span>
                <input
                  key={`afn-${p.id}-${p.affidatario_nome}`}
                  type="text"
                  disabled={!dimissioneEdit}
                  defaultValue={p.affidatario_nome}
                  onBlur={(e) => void write({ affidatario_nome: e.target.value })}
                />
              </label>
              <label className="pma-field">
                <span className="pma-field__label">Cognome</span>
                <input
                  key={`afc-${p.id}-${p.affidatario_cognome}`}
                  type="text"
                  disabled={!dimissioneEdit}
                  defaultValue={p.affidatario_cognome}
                  onBlur={(e) => void write({ affidatario_cognome: e.target.value })}
                />
              </label>
            </div>
            <div className="pma-row">
              <label className="pma-field">
                <span className="pma-field__label">Legame</span>
                <input
                  key={`afl-${p.id}-${p.affidatario_legame}`}
                  type="text"
                  disabled={!dimissioneEdit}
                  defaultValue={p.affidatario_legame}
                  onBlur={(e) => void write({ affidatario_legame: e.target.value })}
                  placeholder="es. Genitore, accompagnatore…"
                />
              </label>
            </div>
          </div>
        ) : null}

        <div className="pma-field max-w-3xl">
          <label htmlFor={`dimissione-note-${p.id}`} className="pma-field__label">
            Note di dimissione
          </label>
          {dimissioneEdit && presetDimissione.length > 0 ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Importa preset:</span>
              {presetDimissione.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const t = preset.testo.trim()
                    if (!t) return
                    setNoteDraft((prev) => {
                      const base = prev.trimEnd()
                      const next = base ? `${base}\n\n${t}` : t
                      void write({ dimissione_note: next })
                      return next
                    })
                  }}
                  className="pma-pill pma-pill--stato-off text-xs"
                >
                  {preset.titolo.trim() || `Preset ${idx + 1}`}
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            id={`dimissione-note-${p.id}`}
            disabled={!dimissioneEdit}
            rows={5}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={() => void write({ dimissione_note: noteDraft })}
          />
        </div>

        {consensoGenericoCure.trim() ? (
          <div className="pma-card max-w-3xl">
            <div className="pma-card__hdr">Consenso generico alle cure</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {consensoGenericoCure.trim()}
            </p>
          </div>
        ) : null}
        {consensoPrivacy.trim() ? (
          <div className="pma-card max-w-3xl">
            <div className="pma-card__hdr">Consenso privacy</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {consensoPrivacy.trim()}
            </p>
          </div>
        ) : null}
        {p.dimissione_esito === 'rifiuta_invio_ps' && rifiutoInvioPs.trim() ? (
          <div className="pma-card max-w-3xl">
            <div className="pma-card__hdr">Rifiuto invio in PS</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {rifiutoInvioPs.trim()}
            </p>
          </div>
        ) : null}

        <div>
          <div className="pma-section-hdr">Firma paziente</div>
          <p className="px-3 py-2 text-xs text-slate-500">
            Area ampia per tablet; la firma viene salvata come immagine (Base64) nel documento
            paziente, senza Firebase Storage. Con scheda aperta il Medico può sempre tracciare o
            aggiornare la firma; dopo la dimissione definitiva questa sezione è solo lettura.
          </p>
          <div className="px-3 pb-3">
            {dimissioneEdit ? (
              <div className="space-y-3">
                {firmaPaz ? (
                  <div className="flex flex-wrap gap-2">
                    {!replaceFirma ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setReplaceFirma(true)}
                          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        >
                          Sostituisci firma
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void write({
                              firma_paziente_base64: deleteField(),
                              firma_paziente_url: deleteField(),
                            })
                          }
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-100"
                        >
                          Rimuovi firma
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReplaceFirma(false)}
                        className="text-sm font-medium text-slate-600 underline hover:text-slate-900"
                      >
                        Annulla sostituzione
                      </button>
                    )}
                  </div>
                ) : null}
                <SignatureCanvas
                  key={`firma-${p.id}-${replaceFirma}`}
                  variant="compact"
                  preloadImageSrc={!replaceFirma ? firmaPaz : null}
                  onSaveDataUrl={handleSaveFirmaPaziente}
                />
              </div>
            ) : (
              <SignatureCanvas
                disabled
                variant="compact"
                savedImageSrc={firmaPaz}
                onSaveDataUrl={handleSaveFirmaPaziente}
              />
            )}
          </div>
        </div>

        <div>
          <div className="pma-section-hdr">Firma medico</div>
          <p className="px-3 py-2 text-xs text-slate-500">
            Anteprima dal profilo utente (firma in Base64 o URL legacy) o copia salvata alla
            dimissione definitiva.
          </p>
          <div className="px-3 pb-3">
            {firmaMedicoPreview ? (
              <div className="inline-block max-w-full rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
                <img
                  src={firmaMedicoPreview}
                  alt="Firma medico"
                  className="max-h-28 max-w-full object-contain sm:max-h-32"
                />
              </div>
            ) : (
              <div
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                role="status"
              >
                {isMedico ? 'Firma non configurata' : 'Firma medico non disponibile (nessuna copia su scheda e profilo non applicabile a questa vista).'}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200">
          <div className="pma-section-hdr">Report PDF</div>
          <p className="px-3 py-2 text-xs text-slate-600">
            Esportazione A4 densa (anagrafica, cartella clinica, parametri vitali, farmaci, rivalutazioni,
            lesioni, dimissione, firme).
          </p>
          {pdfErr ? (
            <p className="mt-2 text-sm text-red-700" role="alert">
              {pdfErr}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 px-3 pb-4">
            <button
              type="button"
              disabled={pdfBusy}
              onClick={() => void handleDownloadPdf()}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold uppercase text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {pdfBusy ? 'Generazione…' : 'Scarica PDF'}
            </button>
            {user?.rank === 'Medico' ? (
              <button
                type="button"
                disabled={pdfBusy}
                onClick={() => void handleInviaEmailPdf()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-800 px-4 text-sm font-bold uppercase text-white shadow-sm hover:bg-slate-900 disabled:opacity-50"
              >
                Invia via Email
              </button>
            ) : null}
            {pdfBusy ? (
              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
                  aria-hidden
                />
                Elaborazione PDF…
              </span>
            ) : null}
          </div>
        </div>

        {canChiudiDimetti ? (
          <div className="border-t border-slate-200 px-3 py-4">
            <button
              type="button"
              onClick={() => setDimettiOpen(true)}
              className="inline-flex h-10 w-full max-w-md items-center justify-center rounded-lg bg-red-700 px-4 text-sm font-bold uppercase text-white shadow-md hover:bg-red-800"
            >
              DIMETTI PAZIENTE
            </button>
            <p className="mt-2 max-w-xl text-xs text-slate-500">
              Chiude definitivamente la scheda (<code className="rounded bg-slate-100 px-1">aperto: false</code>
              , stato <strong>Dimesso</strong>, timestamp di chiusura).
            </p>
          </div>
        ) : null}
      </div>

      {dimettiOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dimetti-title"
        >
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 id="dimetti-title" className="text-lg font-bold text-slate-900">
              Conferma dimissione
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              Sei sicuro? Una volta dimesso, il paziente verrà chiuso e non sarà più possibile modificare i
              dati.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={dimettiBusy}
                onClick={() => setDimettiOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-bold uppercase text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={dimettiBusy}
                onClick={() => void handleDimettiConfirm()}
                className="inline-flex h-10 items-center justify-center rounded-md bg-red-700 px-4 text-sm font-bold uppercase text-white hover:bg-red-800 disabled:opacity-50"
              >
                {dimettiBusy ? 'Chiusura…' : 'Conferma e chiudi scheda'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
