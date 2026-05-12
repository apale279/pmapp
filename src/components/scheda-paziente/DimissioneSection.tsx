import { useState } from 'react'
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

type Props = {
  p: Paziente
  user: UserProfile | null
  isMedico: boolean
  /** `p.aperto && user` — scheda modificabile a livello documento */
  canEditScheda: boolean
  write: (patch: Record<string, unknown>) => Promise<void>
  /** Intestazione PDF (manifestazione / PMA). */
  reportManifestazioneNome: string
  reportPmaNome: string
}

/**
 * Sezione 4 — Dimissione (SchedaPaziente v2, §5 MD).
 * Editabile solo da **Medico** con scheda aperta; altrimenti sola lettura.
 * Firme persistite come stringhe (data URL / Base64) su Firestore, senza Storage.
 */
export function DimissioneSection({
  p,
  user,
  isMedico,
  canEditScheda,
  write,
  reportManifestazioneNome,
  reportPmaNome,
}: Props) {
  const medicoEdit = isMedico && canEditScheda
  const [dimettiOpen, setDimettiOpen] = useState(false)
  const [dimettiBusy, setDimettiBusy] = useState(false)
  const [replaceFirma, setReplaceFirma] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfErr, setPdfErr] = useState<string | null>(null)

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
    if (!medicoEdit || !user) return
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
      })
      saveAs(blob, defaultPdfFilename(p))
    } catch (e) {
      setPdfErr(e instanceof Error ? e.message : 'Generazione PDF non riuscita.')
    } finally {
      setPdfBusy(false)
    }
  }

  async function handleInviaEmailPdf() {
    if (!isMedico) return
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
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Sezione 4 — Dimissione
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Modificabile <strong>solo dal Medico</strong> con scheda aperta. Dopo la dimissione
            definitiva la scheda è chiusa per tutti i ruoli.
          </p>
        </div>
        {p.dimesso_at ? (
          <p className="shrink-0 text-xs text-slate-500">
            Chiusura:{' '}
            <span className="font-medium text-slate-800">
              {p.dimesso_at.toDate().toLocaleString('it-IT')}
            </span>
          </p>
        ) : null}
      </div>

      {!medicoEdit ? (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {isMedico && !p.aperto
            ? 'Scheda chiusa dopo dimissione: dimissione e firme in sola lettura.'
            : 'Sola lettura: solo un utente con ruolo Medico può compilare la dimissione su una scheda aperta.'}
        </p>
      ) : null}

      <div className="mt-6 space-y-8">
        <label className="block max-w-xl text-sm">
          <span className="font-medium text-slate-700">Esito</span>
          <select
            disabled={!medicoEdit}
            value={p.dimissione_esito ?? ''}
            onChange={(e) => {
              const v = e.target.value
              void write({
                dimissione_esito: v === '' ? null : (v as DimissioneEsito),
              })
            }}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
          >
            <option value="">— Seleziona —</option>
            {DIMISSIONE_ESITO_VALUES.map((id) => (
              <option key={id} value={id}>
                {DIMISSIONE_ESITO_LABEL[id]}
              </option>
            ))}
          </select>
        </label>

        {p.dimissione_esito === 'riaffidato' ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Dati affidatario</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Nome</span>
                <input
                  key={`afn-${p.id}-${p.affidatario_nome}`}
                  type="text"
                  disabled={!medicoEdit}
                  defaultValue={p.affidatario_nome}
                  onBlur={(e) => void write({ affidatario_nome: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Cognome</span>
                <input
                  key={`afc-${p.id}-${p.affidatario_cognome}`}
                  type="text"
                  disabled={!medicoEdit}
                  defaultValue={p.affidatario_cognome}
                  onBlur={(e) => void write({ affidatario_cognome: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Legame</span>
                <input
                  key={`afl-${p.id}-${p.affidatario_legame}`}
                  type="text"
                  disabled={!medicoEdit}
                  defaultValue={p.affidatario_legame}
                  onBlur={(e) => void write({ affidatario_legame: e.target.value })}
                  placeholder="es. Genitore, accompagnatore…"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
            </div>
          </div>
        ) : null}

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Note di dimissione</span>
          <textarea
            key={`dn-${p.id}-${p.dimissione_note}`}
            disabled={!medicoEdit}
            rows={6}
            defaultValue={p.dimissione_note}
            onBlur={(e) => void write({ dimissione_note: e.target.value })}
            className="mt-1 w-full max-w-3xl rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          />
        </label>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Firma paziente</h3>
          <p className="mt-1 text-xs text-slate-500">
            Area ampia per tablet; la firma viene salvata come immagine (Base64) nel documento
            paziente, senza Firebase Storage. Con scheda aperta il Medico può sempre tracciare o
            aggiornare la firma; dopo la dimissione definitiva questa sezione è solo lettura.
          </p>
          <div className="mt-3">
            {medicoEdit ? (
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
                  preloadImageSrc={!replaceFirma ? firmaPaz : null}
                  onSaveDataUrl={handleSaveFirmaPaziente}
                />
              </div>
            ) : (
              <SignatureCanvas
                disabled
                savedImageSrc={firmaPaz}
                onSaveDataUrl={handleSaveFirmaPaziente}
              />
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Firma medico</h3>
          <p className="mt-1 text-xs text-slate-500">
            Anteprima dal profilo utente (firma in Base64 o URL legacy) o copia salvata alla
            dimissione definitiva.
          </p>
          <div className="mt-3">
            {firmaMedicoPreview ? (
              <div className="inline-block max-w-full rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                <img
                  src={firmaMedicoPreview}
                  alt="Firma medico"
                  className="max-h-48 max-w-full object-contain sm:max-h-56 md:max-h-64"
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

        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold text-slate-800">Report PDF</h3>
          <p className="mt-1 text-xs text-slate-600">
            Esportazione A4 densa (anagrafica, cartella clinica, parametri vitali, farmaci, rivalutazioni,
            lesioni, dimissione, firme).
          </p>
          {pdfErr ? (
            <p className="mt-2 text-sm text-red-700" role="alert">
              {pdfErr}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pdfBusy}
              onClick={() => void handleDownloadPdf()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {pdfBusy ? 'Generazione…' : 'Scarica PDF'}
            </button>
            {user?.rank === 'Medico' ? (
              <button
                type="button"
                disabled={pdfBusy}
                onClick={() => void handleInviaEmailPdf()}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-900 disabled:opacity-50"
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

        {medicoEdit ? (
          <div className="border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={() => setDimettiOpen(true)}
              className="w-full rounded-lg bg-red-700 px-4 py-4 text-base font-bold tracking-wide text-white shadow-md hover:bg-red-800 sm:max-w-md"
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
            <h3 id="dimetti-title" className="text-lg font-semibold text-slate-900">
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
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={dimettiBusy}
                onClick={() => void handleDimettiConfirm()}
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
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
