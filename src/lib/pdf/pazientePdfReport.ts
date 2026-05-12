import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Timestamp } from 'firebase/firestore'
import type { Paziente } from '../../types/paziente'
import {
  CODICE_COLORE_LABEL,
  PAZIENTE_STATO_LABEL,
  TIPO_PAZIENTE_LABEL,
} from '../../types/paziente'
import { DIMISSIONE_ESITO_LABEL } from '../../types/dimissione'
import { FARMACO_VIA_LABEL } from '../../types/cartellaClinica'
import { buildLesioniPngDataUrl } from './lesioniFigurePng'

export type PazientePdfContext = {
  manifestazioneNome: string
  pmaNome: string
}

export function sanitizeFilePart(s: string): string {
  const t = s.trim().replace(/[^a-zA-Z0-9._\s-]+/g, '_').replace(/\s+/g, '_')
  return t.slice(0, 72) || 'PMA'
}

function tsIt(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  try {
    return ts.toDate().toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function tsItDate(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  try {
    return ts.toDate().toLocaleDateString('it-IT')
  } catch {
    return '—'
  }
}

async function normalizeImageSrcForPdf(src: string): Promise<string | null> {
  const s = src.trim()
  if (!s) return null
  if (s.startsWith('data:image')) return s
  if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 80) {
    return `data:image/png;base64,${s.replace(/\s/g, '')}`
  }
  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      const res = await fetch(s, { mode: 'cors' })
      if (!res.ok) return null
      const blob = await res.blob()
      return await new Promise<string | null>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(typeof r.result === 'string' ? r.result : null)
        r.onerror = () => reject(new Error('Lettura immagine fallita.'))
        r.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }
  return null
}

async function addImageDataUrl(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
): Promise<number> {
  const fmt: 'PNG' | 'JPEG' =
    dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg') ? 'JPEG' : 'PNG'
  const img = new Image()
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej(new Error('Immagine firma non decodificabile.'))
    img.src = dataUrl
  })
  const iw = img.naturalWidth || 1
  const ih = img.naturalHeight || 1
  let w = maxW
  let h = (ih / iw) * w
  if (h > maxH) {
    h = maxH
    w = (iw / ih) * h
  }
  doc.addImage(dataUrl, fmt, x, y, w, h)
  return h
}

type DocWithAuto = jsPDF & { lastAutoTable?: { finalY: number } }

function afterAutoTableY(doc: jsPDF, fallback: number): number {
  const d = doc as DocWithAuto
  return (d.lastAutoTable?.finalY ?? fallback) + 5
}

/**
 * Genera PDF A4 compatto (9–10 pt) della scheda paziente.
 */
export async function buildPazientePdfBlob(p: Paziente, ctx: PazientePdfContext): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const M = 10
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const textW = W - 2 * M
  let y = M

  const setSmall = () => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
  }

  const newPage = () => {
    doc.addPage()
    y = M
  }

  const ensure = (h: number) => {
    if (y + h > H - M) newPage()
  }

  const writeTitle = (t: string, size = 10) => {
    ensure(size + 2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.text(t, M, y)
    y += size * 0.45 + 2
    setSmall()
  }

  const writeParagraph = (title: string, body: string) => {
    ensure(8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(title, M, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const lines = doc.splitTextToSize((body || '').trim() || '—', textW)
    for (const line of lines) {
      ensure(3.6)
      doc.text(line, M, y)
      y += 3.6
    }
    y += 1.5
  }

  // Intestazione
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Report scheda paziente — PMApp', M, y)
  y += 6
  setSmall()
  doc.text(`Manifestazione: ${ctx.manifestazioneNome || '—'}`, M, y)
  y += 4
  doc.text(`PMA: ${ctx.pmaNome || '—'}`, M, y)
  y += 4
  doc.text(
    `ID paziente: ${p.id_paziente_visibile}  ·  Colore: ${CODICE_COLORE_LABEL[p.codice_colore]}  ·  Stato: ${PAZIENTE_STATO_LABEL[p.stato]}`,
    M,
    y,
  )
  y += 5
  doc.text(`Apertura scheda: ${tsIt(p.apertura_scheda)}`, M, y)
  y += 6

  // Anagrafica (2 colonne)
  writeTitle('Dati anagrafici e generali', 10)
  const colGap = 6
  const colW = (textW - colGap) / 2
  const x2 = M + colW + colGap
  const leftCol = [
    `Nome: ${p.nome || '—'}`,
    `Cognome: ${p.cognome || '—'}`,
    `Età (campo): ${p.eta != null ? `${p.eta} anni` : '—'}`,
    `Data nascita: ${tsItDate(p.data_nascita)}`,
  ]
  const rightCol = [
    `Email: ${p.email?.trim() || '—'}`,
    `Telefono: ${p.telefono?.trim() || '—'}`,
    `Tipo: ${TIPO_PAZIENTE_LABEL[p.tipo_paziente]}`,
    `Pettorale: ${p.pettorale != null ? String(p.pettorale) : '—'}`,
  ]
  let ya = y
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  for (let i = 0; i < Math.max(leftCol.length, rightCol.length); i++) {
    ensure(4)
    if (leftCol[i]) doc.text(leftCol[i], M, ya)
    if (rightCol[i]) doc.text(rightCol[i], x2, ya)
    ya += 4
  }
  y = ya + 2

  writeParagraph('Breve descrizione (Sez. 1)', p.breve_descrizione)
  if (p.tipo_evento || p.dettaglio_evento) {
    writeParagraph('Tipo / dettaglio evento', `${p.tipo_evento || '—'} — ${p.dettaglio_evento || '—'}`)
  }

  // Cartella
  writeTitle('Cartella clinica', 10)
  writeParagraph('APR', p.apr)
  writeParagraph('Allergie', p.allergie)
  writeParagraph('APP', p.app)
  writeParagraph('EO — note', p.eo_note)
  const eoList = (p.eo_quick ?? []).length ? p.eo_quick.join(', ') : '—'
  writeParagraph('EO — selezione rapida', eoList)

  // Parametri vitali
  ensure(12)
  writeTitle('Parametri vitali', 9)
  const pvBody = [...p.parametri_vitali]
    .sort((a, b) => (a.registrato_at?.toMillis?.() ?? 0) - (b.registrato_at?.toMillis?.() ?? 0))
    .map((r) => [
      tsIt(r.registrato_at),
      r.operatore_nome,
      String(r.gcs),
      String(r.fr),
      r.spo2_aa != null ? String(r.spo2_aa) : '—',
      r.spo2_o2 != null ? String(r.spo2_o2) : '—',
      String(r.fc),
      `${r.pa_sistolica}/${r.pa_diastolica}`,
      r.temperatura != null ? String(r.temperatura) : '—',
      r.nrs != null ? String(r.nrs) : '—',
    ])

  autoTable(doc, {
    startY: y,
    head: [
      [
        'Data/ora',
        'Op.',
        'GCS',
        'FR',
        'SpO₂ aa',
        'SpO₂ O₂',
        'FC',
        'PA',
        'T°C',
        'NRS',
      ],
    ],
    body: pvBody.length ? pvBody : [['—', '—', '—', '—', '—', '—', '—', '—', '—', '—']],
    styles: { fontSize: 7, cellPadding: 0.8, overflow: 'linebreak' },
    headStyles: { fillColor: [51, 65, 85], fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 18 },
      9: { cellWidth: 10 },
    },
    margin: { left: M, right: M },
  })
  y = afterAutoTableY(doc, y)

  // Prestazioni / farmaci
  const prest = (p.prestazioni_sel ?? []).length ? p.prestazioni_sel.map((x) => `• ${x}`).join('\n') : '—'
  writeTitle('Prestazioni', 9)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const prestLines = doc.splitTextToSize(prest, textW)
  for (const line of prestLines) {
    ensure(3.6)
    doc.text(line, M, y)
    y += 3.6
  }
  y += 2

  writeTitle('Farmaci', 9)
  const farmBody = [...p.farmaci]
    .sort((a, b) => (a.registrato_at?.toMillis?.() ?? 0) - (b.registrato_at?.toMillis?.() ?? 0))
    .map((f) => [
      tsIt(f.registrato_at),
      f.nome,
      f.dose,
      FARMACO_VIA_LABEL[f.via],
    ])
  autoTable(doc, {
    startY: y,
    head: [['Data/ora', 'Farmaco', 'Dose', 'Via']],
    body: farmBody.length ? farmBody : [['—', '—', '—', '—']],
    styles: { fontSize: 8, cellPadding: 1 },
    headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
    columnStyles: { 1: { cellWidth: 55 } },
    margin: { left: M, right: M },
  })
  y = afterAutoTableY(doc, y)

  // Rivalutazioni
  writeTitle('Rivalutazioni', 9)
  const rivBody = [...p.rivalutazioni]
    .sort((a, b) => (a.creato_at?.toMillis?.() ?? 0) - (b.creato_at?.toMillis?.() ?? 0))
    .map((r) => [tsIt(r.creato_at), r.firma_nome, r.testo])
  autoTable(doc, {
    startY: y,
    head: [['Data/ora', 'Firma', 'Nota']],
    body: rivBody.length ? rivBody : [['—', '—', '—']],
    styles: { fontSize: 7.5, cellPadding: 1 },
    headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
    columnStyles: { 2: { cellWidth: 110 } },
    margin: { left: M, right: M },
  })
  y = afterAutoTableY(doc, y)

  // Lesioni
  writeTitle('Lesioni (schema)', 9)
  if (p.lesioni.length) {
    const png = await buildLesioniPngDataUrl(p.lesioni)
    if (png) {
      ensure(58)
      const hImg = await addImageDataUrl(doc, png, M, y, Math.min(textW, 118), 56)
      y += hImg + 4
    }
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    const sorted = [...p.lesioni].sort((a, b) => a.n - b.n)
    for (const L of sorted) {
      const line = `${L.n}. [${L.vista === 'front' ? 'Fronte' : 'Retro'}] ${L.descrizione?.trim() || '—'}`
      const wrapped = doc.splitTextToSize(line, textW)
      for (const ln of wrapped) {
        ensure(3.5)
        doc.text(ln, M, y)
        y += 3.5
      }
    }
    y += 2
  } else {
    doc.setFontSize(9)
    doc.text('Nessun marker lesioni.', M, y)
    y += 5
  }

  // Dimissione
  writeTitle('Dimissione (Sez. 4)', 10)
  const esitoLabel = p.dimissione_esito ? DIMISSIONE_ESITO_LABEL[p.dimissione_esito] : '—'
  doc.setFontSize(9)
  doc.text(`Esito: ${esitoLabel}`, M, y)
  y += 4
  writeParagraph('Note dimissione', p.dimissione_note)
  if (p.dimissione_esito === 'riaffidato') {
    writeParagraph(
      'Affidatario',
      `${p.affidatario_cognome} ${p.affidatario_nome} (${p.affidatario_legame})`.trim(),
    )
  }
  if (p.dimesso_at) {
    doc.text(`Dimesso il: ${tsIt(p.dimesso_at)}`, M, y)
    y += 5
  }

  // Invio PS
  if (p.dimissione_esito === 'invio_ps') {
    writeTitle('Invio in PS (Sez. 5)', 9)
    const lines = [
      `Missione AREU: ${p.invio_ps_missione_areu ?? '—'}`,
      `Data/ora: ${tsIt(p.invio_ps_data_ora)}`,
      `Mezzo: ${p.invio_ps_mezzo || '—'}`,
      `Ospedale: ${p.invio_ps_ospedale || '—'}`,
      `Codice trasporto: ${p.invio_ps_codice_trasporto ?? '—'}`,
      `Note: ${p.invio_ps_note || '—'}`,
    ]
    for (const ln of lines) {
      ensure(4)
      doc.text(ln, M, y)
      y += 4
    }
    y += 2
  }

  // Firme
  writeTitle('Firme', 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text('Firma paziente', M, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  if (p.firma_paziente_base64?.trim()) {
    const u = await normalizeImageSrcForPdf(p.firma_paziente_base64)
    if (u) {
      ensure(42)
      const h = await addImageDataUrl(doc, u, M, y, 75, 38)
      y += h + 3
    } else {
      doc.text('(firma presente ma non caricabile)', M, y)
      y += 5
    }
  } else {
    doc.text('—', M, y)
    y += 5
  }

  doc.setFont('helvetica', 'italic')
  doc.text('Firma / timbro medico (dimissione)', M, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  if (p.dimissione_firma_medico_base64?.trim()) {
    const u = await normalizeImageSrcForPdf(p.dimissione_firma_medico_base64)
    if (u) {
      ensure(42)
      const h = await addImageDataUrl(doc, u, M, y, 75, 38)
      y += h + 3
    } else {
      doc.text('(firma presente ma non caricabile)', M, y)
      y += 5
    }
  } else {
    doc.text('—', M, y)
    y += 5
  }

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  ensure(6)
  doc.text(`Documento generato il ${new Date().toLocaleString('it-IT')} — ID interno: ${p.id}`, M, H - 8)

  return doc.output('blob')
}

export function defaultPdfFilename(p: Paziente): string {
  const id = sanitizeFilePart(p.id_paziente_visibile || p.id)
  return `Scheda_${id}.pdf`
}

export function buildMailtoReportPaziente(params: {
  toEmail: string
  pazienteIdVisibile: string
  pdfFilename: string
}): string {
  const subject = `Scheda visita PMA — ${params.pazienteIdVisibile}`
  const body = `Gentile Collega,

di seguito le istruzioni per l'invio della scheda visita PMA.

1) Il report PDF è stato scaricato automaticamente sul dispositivo con nome:
   ${params.pdfFilename}

2) Poiché il programma di posta non consente allegati automatici da questa applicazione, allega manualmente il file PDF al presente messaggio prima dell'invio.

3) Verifica che l'indirizzo del destinatario sia corretto.

Cordiali saluti`
  return `mailto:${encodeURIComponent(params.toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
