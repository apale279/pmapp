import { doc, getDoc } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { type UserRank, isUserRank, type UserProfile } from '../types/userProfile'

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

function optionalId(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' && value.trim() !== '') return value
  return undefined
}

/**
 * Legge `utenti/{uid}` con getDoc (mai onSnapshot) — .cursorrules.
 */
export async function loadUtenteProfile(
  db: Firestore,
  uid: string,
  email: string | null,
): Promise<UserProfile | null> {
  const ref = doc(db, 'utenti', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null

  const data = snap.data() as Record<string, unknown>
  const rankRaw = data.rank
  const rank: UserRank = isUserRank(rankRaw) ? rankRaw : 'Soccorritore'

  const idManifestazione = optionalId(data.id_manifestazione)
  const idPma = optionalId(data.id_pma)
  const firmaUrl =
    typeof data.firmaUrl === 'string' && data.firmaUrl.trim() !== ''
      ? data.firmaUrl.trim()
      : undefined
  const camelB64 = data.firmaMedicoBase64
  const firma_medico_base64 =
    (typeof camelB64 === 'string' && camelB64.trim() !== '' ? camelB64.trim() : undefined) ??
    (typeof data.firma_medico_base64 === 'string' && data.firma_medico_base64.trim() !== ''
      ? data.firma_medico_base64.trim()
      : undefined)

  const telefono =
    typeof data.telefono === 'string' && data.telefono.trim() !== '' ? data.telefono.trim() : undefined
  const email_contatto =
    typeof data.email_contatto === 'string' && data.email_contatto.trim() !== ''
      ? data.email_contatto.trim()
      : undefined
  const note_utente =
    typeof data.note_utente === 'string' && data.note_utente.trim() !== '' ? data.note_utente.trim() : undefined

  return {
    uid,
    email,
    nome: asString(data.nome, 'Senza nome'),
    rank,
    ...(idManifestazione !== undefined ? { id_manifestazione: idManifestazione } : {}),
    ...(idPma !== undefined ? { id_pma: idPma } : {}),
    ...(telefono !== undefined ? { telefono } : {}),
    ...(email_contatto !== undefined ? { email_contatto } : {}),
    ...(note_utente !== undefined ? { note_utente } : {}),
    ...(firmaUrl !== undefined ? { firmaUrl } : {}),
    ...(firma_medico_base64 !== undefined ? { firma_medico_base64 } : {}),
  }
}
