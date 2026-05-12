import { useEffect, useState } from 'react'
import { doc, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  parseEoQuick,
  parseFarmaci,
  parseParametriVitali,
  parsePrestazioniSel,
  parseRivalutazioni,
} from '../lib/parseCartellaClinica'
import { parseLesioni } from '../lib/parseLesioni'
import { isDimissioneEsito } from '../types/dimissione'
import type { Paziente } from '../types/paziente'
import {
  isCodiceColorePaziente,
  isPazienteStato,
  isTipoPaziente,
} from '../types/paziente'

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function strOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function tsOrNull(v: unknown): Timestamp | null {
  if (v && typeof (v as Timestamp).toMillis === 'function') return v as Timestamp
  return null
}

function optionalStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v
  return null
}

/** Firma paziente: nuovo Base64/data URL, camelCase, o URL Storage legacy. */
function firmaPazienteImmagine(d: Record<string, unknown>): string | null {
  const keys = ['firma_paziente_base64', 'firmaPazienteBase64', 'firma_paziente_url'] as const
  for (const k of keys) {
    const v = d[k]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
  }
  return null
}

/** Firma medico alla dimissione: Base64 o URL legacy. */
function dimissioneFirmaMedicoImmagine(d: Record<string, unknown>): string | null {
  const keys = [
    'dimissione_firma_medico_base64',
    'dimissioneFirmaMedicoBase64',
    'dimissione_firma_medico_url',
  ] as const
  for (const k of keys) {
    const v = d[k]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
  }
  return null
}

function parsePaziente(id: string, d: Record<string, unknown>): Paziente {
  const tipo = isTipoPaziente(d.tipo_paziente) ? d.tipo_paziente : 'autopresentato'
  const colore = isCodiceColorePaziente(d.codice_colore) ? d.codice_colore : 'bianco'
  const stato = isPazienteStato(d.stato) ? d.stato : 'in_carico'

  const apertura = d.apertura_scheda
  let aperturaTs: Timestamp | null =
    apertura && typeof (apertura as Timestamp).toMillis === 'function'
      ? (apertura as Timestamp)
      : null
  if (!aperturaTs) {
    aperturaTs = Timestamp.now()
  }

  const dataNascita = d.data_nascita
  const dataNascitaTs =
    dataNascita && typeof (dataNascita as Timestamp).toMillis === 'function'
      ? (dataNascita as Timestamp)
      : null

  const deadline = d.eta_pma_deadline
  const deadlineTs =
    deadline && typeof (deadline as Timestamp).toMillis === 'function'
      ? (deadline as Timestamp)
      : null

  const idMan = strOrEmpty(d.id_manifestazione)
  const idPmaField = strOrEmpty(d.id_pma)

  const aprRaw = strOrEmpty(d.apr)
  const allergieRaw = strOrEmpty(d.allergie)

  const rawEsito = d.dimissione_esito
  const dimissione_esito =
    rawEsito !== null &&
    rawEsito !== undefined &&
    rawEsito !== '' &&
    isDimissioneEsito(rawEsito)
      ? rawEsito
      : null

  const ct = d.invio_ps_codice_trasporto
  const invio_ps_codice_trasporto =
    ct === 'verde' || ct === 'giallo' || ct === 'rosso' ? ct : null

  return {
    id,
    id_manifestazione: idMan || id,
    ...(idPmaField ? { id_pma: idPmaField } : {}),
    aperto: d.aperto !== false,
    id_paziente_visibile: strOrEmpty(d.id_paziente_visibile) || id,
    apertura_scheda: aperturaTs,
    tipo_paziente: tipo,
    breve_descrizione: strOrEmpty(d.breve_descrizione),
    codice_colore: colore,
    trasportato_da: optionalStr(d.trasportato_da),
    note_centrale: optionalStr(d.note_centrale),
    eta_pma_minuti: numOrNull(d.eta_pma_minuti),
    eta_pma_deadline: deadlineTs,
    stato,
    pettorale: numOrNull(d.pettorale),
    nome: strOrEmpty(d.nome),
    cognome: strOrEmpty(d.cognome),
    data_nascita: dataNascitaTs,
    eta: numOrNull(d.eta),
    ...(() => {
      let email = strOrEmpty(d.email)
      let telefono = strOrEmpty(d.telefono)
      const legacy = strOrEmpty(d.email_tel)
      if (!email && !telefono && legacy) {
        if (legacy.includes('@')) email = legacy.trim()
        else telefono = legacy.trim()
      }
      const glue = email && telefono ? ' · ' : ''
      const email_tel = legacy.trim() !== '' ? legacy.trim() : `${email}${glue}${telefono}`.trim()
      return { email, telefono, email_tel }
    })(),

    apr: aprRaw === '' ? 'Nulla.' : aprRaw,
    allergie: allergieRaw === '' ? 'Nega.' : allergieRaw,
    app: strOrEmpty(d.app),
    eo_quick: parseEoQuick(d.eo_quick),
    eo_note: strOrEmpty(d.eo_note),
    parametri_vitali: parseParametriVitali(d.parametri_vitali),
    prestazioni_sel: parsePrestazioniSel(d.prestazioni_sel),
    farmaci: parseFarmaci(d.farmaci),
    rivalutazioni: parseRivalutazioni(d.rivalutazioni),
    lesioni: parseLesioni(d.lesioni),

    tipo_evento: strOrEmpty(d.tipo_evento),
    dettaglio_evento: strOrEmpty(d.dettaglio_evento),

    invio_ps_missione_areu: numOrNull(d.invio_ps_missione_areu),
    invio_ps_data_ora: tsOrNull(d.invio_ps_data_ora),
    invio_ps_mezzo: strOrEmpty(d.invio_ps_mezzo),
    invio_ps_ospedale: strOrEmpty(d.invio_ps_ospedale),
    invio_ps_codice_trasporto,
    invio_ps_note: strOrEmpty(d.invio_ps_note),

    dimissione_esito,
    dimissione_note: strOrEmpty(d.dimissione_note),
    affidatario_nome: strOrEmpty(d.affidatario_nome),
    affidatario_cognome: strOrEmpty(d.affidatario_cognome),
    affidatario_legame: strOrEmpty(d.affidatario_legame),
    firma_paziente_base64: firmaPazienteImmagine(d),
    dimissione_firma_medico_base64: dimissioneFirmaMedicoImmagine(d),
    dimesso_at: tsOrNull(d.dimesso_at),

    infermiere_rif: strOrEmpty(d.infermiere_rif),
    medico_rif: strOrEmpty(d.medico_rif),
  }
}

export function parsePazienteFromFirestore(id: string, raw: Record<string, unknown>): Paziente {
  return parsePaziente(id, raw)
}

/**
 * Scheda paziente in tempo reale (`pazienti/{id}`).
 */
export function usePazienteDoc(pazienteId: string | undefined) {
  const [data, setData] = useState<Paziente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exists, setExists] = useState(true)

  useEffect(() => {
    if (!db || !pazienteId) {
      queueMicrotask(() => {
        setData(null)
        setLoading(false)
        setExists(false)
        setError(pazienteId ? null : 'ID paziente mancante.')
      })
      return
    }

    queueMicrotask(() => {
      setLoading(true)
      setError(null)
    })

    const ref = doc(db, 'pazienti', pazienteId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setExists(false)
          setData(null)
          setLoading(false)
          return
        }
        setExists(true)
        setData(parsePaziente(snap.id, snap.data() as Record<string, unknown>))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setData(null)
        setLoading(false)
      },
    )

    return () => unsub()
  }, [pazienteId])

  return { data, loading, error, exists }
}
