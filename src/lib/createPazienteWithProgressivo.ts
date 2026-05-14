import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type Firestore,
} from 'firebase/firestore'
import { statoInizialePazientePerRank } from './pazienteStatoIniziale'
import { createPmaAlert } from './createPmaAlert'
import type { CodiceColorePaziente, TipoPaziente } from '../types/paziente'
import type { UserRank } from '../types/userProfile'

const CONTATORE_SEG = 'contatori'
const CONTATORE_DOC = 'pazienti_progressivo'

export type BozzaNuovaScheda = {
  tipo_paziente?: TipoPaziente
  breve_descrizione?: string
  codice_colore?: CodiceColorePaziente
}

/**
 * Crea `pazienti/{nuovoUuid}` con **setDoc atomico in transazione** (counter + documento),
 * progressivo `P_n` per manifestazione, **`id_pma` sempre valorizzato** (ID PMA della rotta),
 * stato iniziale da rank creatore.
 */
export async function createPazienteWithProgressivo(
  db: Firestore,
  params: {
    manifestazioneId: string
    /** ID documento PMA (deve coincidere con `pma/:id` in router). */
    idPma: string
    creatorRank: UserRank
    creatorUid: string
    bozza?: BozzaNuovaScheda
  },
): Promise<{ id: string; id_paziente_visibile: string }> {
  const idPmaTrim = params.idPma.trim()
  if (!idPmaTrim) {
    throw new Error('id_pma mancante: apri la dashboard da un URL PMA valido.')
  }

  const pazienteRef = doc(collection(db, 'pazienti'))
  const counterRef = doc(
    db,
    'manifestazioni',
    params.manifestazioneId,
    CONTATORE_SEG,
    CONTATORE_DOC,
  )

  const stato = statoInizialePazientePerRank(params.creatorRank)
  const now = Timestamp.now()
  const tipo =
    params.bozza?.tipo_paziente ??
    (params.creatorRank === 'Centrale' ? 'trasportato' : 'autopresentato')
  const breve = params.bozza?.breve_descrizione ?? ''
  const colore = params.bozza?.codice_colore ?? 'bianco'

  let idPazienteVisibile = ''
  await runTransaction(db, async (tx) => {
    const cSnap = await tx.get(counterRef)
    const prev = typeof cSnap.data()?.ultimo === 'number' ? (cSnap.data()?.ultimo as number) : 0
    const next = prev + 1
    const idVis = `P_${next}`
    idPazienteVisibile = idVis

    tx.set(
      counterRef,
      { ultimo: next, aggiornato_at: serverTimestamp() },
      { merge: true },
    )

    tx.set(pazienteRef, {
      id_manifestazione: params.manifestazioneId,
      id_pma: idPmaTrim,
      aperto: true,
      id_paziente_visibile: idVis,
      apertura_scheda: now,
      tipo_paziente: tipo,
      breve_descrizione: breve,
      codice_colore: colore,
      trasportato_da: null,
      note_centrale: null,
      eta_pma_minuti: null,
      eta_pma_deadline: null,
      stato,
      pettorale: null,
      nome: '',
      cognome: '',
      data_nascita: null,
      eta: null,
      email: '',
      telefono: '',
      email_tel: '',
      codice_fiscale: '',
      apr: 'Nulla.',
      allergie: 'Nega.',
      app: '',
      EO_GENERALE: [],
      EO_NEUROLOGICO: [],
      EO_CUTE: [],
      EO_TORACE: [],
      EO_ADDOME: [],
      EO_CAPO_COLLO: [],
      eo_note: '',
      parametri_vitali: [],
      prestazioni_sel: [],
      farmaci: [],
      rivalutazioni: [],
      lesioni: [],
      tipo_evento: '',
      dettaglio_evento: '',
      invio_ps_missione_areu: null,
      invio_ps_data_ora: null,
      invio_ps_mezzo: '',
      invio_ps_ospedale: '',
      invio_ps_codice_trasporto: null,
      invio_ps_note: '',
      dimissione_esito: null,
      dimissione_note: '',
      affidatario_nome: '',
      affidatario_cognome: '',
      affidatario_legame: '',
      firma_paziente_base64: null,
      dimissione_firma_medico_base64: null,
      dimesso_at: null,
      ripreso_in_carico_at: null,
      infermiere_rif: '',
      medico_rif: '',
      creato_da_uid: params.creatorUid,
      creato_da_rank: params.creatorRank,
      creato_at: serverTimestamp(),
    })
  })

  if (params.creatorRank !== 'Centrale' && colore === 'rosso' && idPazienteVisibile) {
    try {
      await createPmaAlert(db, {
        idPma: idPmaTrim,
        idManifestazione: params.manifestazioneId,
        pazienteId: pazienteRef.id,
        idPazienteVisibile,
        messaggio: `Codice ROSSO: nuova scheda ${idPazienteVisibile} — creato da ${params.creatorRank}.`,
        creatoDaUid: params.creatorUid,
      })
    } catch {
      /* allerta best-effort */
    }
  }

  return { id: pazienteRef.id, id_paziente_visibile: idPazienteVisibile }
}
