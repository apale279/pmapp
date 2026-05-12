import { Timestamp } from 'firebase/firestore'

/**
 * Età in anni compiuti rispetto alla data odierna (fuso locale).
 */
export function calculateEtaAnni(dataNascita: Timestamp | null | undefined): number | null {
  if (!dataNascita || typeof dataNascita.toDate !== 'function') return null
  const birth = dataNascita.toDate()
  if (Number.isNaN(birth.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}

/** Patch granulare Firestore per il campo `eta` da `data_nascita`. */
export function patchEtaFromDataNascita(dataNascita: Timestamp | null): { eta: number | null } {
  return { eta: calculateEtaAnni(dataNascita) }
}
