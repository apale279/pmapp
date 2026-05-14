/**
 * Matrice permessi allineata a `Rank.xlsx` (viste × rank, livelli READ / CREATE / UPDATE / DELETE).
 * Valori "NO ACCESS" o celle vuote = operazione non consentita in UI.
 */
import type { UserRank } from '../types/userProfile'

const RANK_ORDER: UserRank[] = [
  'Superadmin',
  'Centrale',
  'Medico',
  'Infermiere',
  'Soccorritore',
  'Triage',
]

function hasToken(
  row: Partial<Record<UserRank, string>> & { default?: string },
  rank: UserRank,
  token: string,
): boolean {
  const raw = row[rank] ?? row.default
  if (!raw) return false
  const u = raw.trim().toUpperCase()
  if (u === 'NO ACCESS' || u === 'N/A') return false
  return u.includes(token)
}

/** Login: READ + CREATE per tutti i rank (flusso autenticazione). */
export function loginAllows(rank: UserRank, op: 'READ' | 'CREATE'): boolean {
  const read: Record<UserRank, string> = {
    Superadmin: 'READ',
    Centrale: 'READ',
    Medico: 'READ',
    Infermiere: 'READ',
    Soccorritore: 'READ',
    Triage: 'READ',
  }
  const create: Record<UserRank, string> = {
    Superadmin: 'CREATE',
    Centrale: 'CREATE',
    Medico: 'CREATE',
    Infermiere: 'CREATE',
    Soccorritore: 'CREATE',
    Triage: 'CREATE',
  }
  return op === 'READ' ? hasToken(read, rank, 'READ') : hasToken(create, rank, 'CREATE')
}

/** Gestione utenti: Superadmin (globale); Centrale (solo utenti della propria manifestazione, in pagina). */
export function gestioneUtentiAllows(rank: UserRank, _op: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'): boolean {
  return rank === 'Superadmin' || rank === 'Centrale'
}

/** Home: tutti READ; staff "R solo menu…"; CUD solo Superadmin (righe 9–11 col. B). */
export function homeAllows(rank: UserRank, op: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'): boolean {
  if (op === 'READ') return true
  return rank === 'Superadmin'
}

/** Dashboard manifestazione: READ esteso; CUD solo Superadmin + Centrale. */
export function manifestazioneDashboardAllows(
  rank: UserRank,
  op: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE',
): boolean {
  if (op === 'READ') {
    return RANK_ORDER.includes(rank)
  }
  return rank === 'Superadmin' || rank === 'Centrale'
}

export function manifestazioneDashboardRouteRanks(): readonly UserRank[] {
  return RANK_ORDER
}

/** Impostazioni manifestazione: tutti READ; CUD fino a Soccorritore; Triage solo lettura. */
export function manifestazioneImpostazioniAllows(
  rank: UserRank,
  op: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE',
): boolean {
  if (op === 'READ') return true
  if (rank === 'Triage') return false
  return RANK_ORDER.includes(rank)
}

export function manifestazioneImpostazioniRouteRanks(): readonly UserRank[] {
  return RANK_ORDER
}

/** Rotte router: gestione utenti (`/admin/utenti`). */
export function gestioneUtentiRouteRanks(): readonly UserRank[] {
  return ['Superadmin', 'Centrale']
}

/** Area amministrativa globale (liste / CRUD): solo Superadmin. */
export function superadminAdminRouteRanks(): readonly UserRank[] {
  return ['Superadmin']
}

/** Dashboard PMA: tutti i rank (matrice). */
export function pmaDashboardRouteRanks(): readonly UserRank[] {
  return RANK_ORDER
}

/** Scheda paziente sotto PMA: tutti i rank (tab filtrate in pagina). */
export function schedaPazienteRouteRanks(): readonly UserRank[] {
  return RANK_ORDER
}

/** Dashboard PMA: tutti i rank, pieno CRUD in matrice. */
export function pmaDashboardAllows(_rank: UserRank, _op: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'): boolean {
  return true
}

/** Tab Generale / Anagrafica: tutti i rank, pieno CRUD (scheda aperta gestita altrove). */
export function schedaTabGeneraleAllows(_rank: UserRank, _op: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'): boolean {
  return true
}

export function schedaTabAnagraficaAllows(_rank: UserRank, _op: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'): boolean {
  return true
}

/** Cartella clinica: Triage NO ACCESS (né READ tab). */
export function schedaTabCartellaAllows(rank: UserRank, op: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'): boolean {
  if (rank === 'Triage') return false
  if (op === 'READ') return true
  return true
}

/** Dimissione: tab visibile solo a Medico e Centrale (READ); CUD come da matrice legacy. */
export function schedaTabDimissioneAllows(rank: UserRank, op: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'): boolean {
  if (rank === 'Triage') return false
  if (op === 'READ') return rank === 'Medico' || rank === 'Centrale'
  return rank === 'Superadmin' || rank === 'Centrale' || rank === 'Medico'
}

/** Stato `in_arrivo`: impostabile da scheda solo da Centrale (logistica pre-accettazione). */
export function schedaStatoInArrivoAllows(rank: UserRank): boolean {
  return rank === 'Centrale'
}

/** Invio PS: Triage NO ACCESS; CUD solo Superadmin, Centrale, Medico. */
export function schedaTabInvioPsAllows(rank: UserRank, op: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'): boolean {
  if (rank === 'Triage') return false
  if (op === 'READ') return true
  return rank === 'Superadmin' || rank === 'Centrale' || rank === 'Medico'
}

/** Scheda chiusa: tutti READ; CUD solo Superadmin (righe 50–52 col. B). */
export function schedaChiusaAllows(rank: UserRank, op: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'): boolean {
  if (op === 'READ') return true
  return rank === 'Superadmin'
}

/**
 * Scheda chiusa + tab Invio PS (esito invio_ps): READ tutti; UPDATE Superadmin, Centrale, Medico;
 * CREATE/DELETE solo Superadmin (col. B righe 55–56).
 */
export function schedaChiusaInvioPsAllows(
  rank: UserRank,
  op: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE',
): boolean {
  if (op === 'READ') return true
  if (op === 'UPDATE') return rank === 'Superadmin' || rank === 'Centrale' || rank === 'Medico'
  return rank === 'Superadmin'
}

export function canWriteInvioPsFields(rank: UserRank, schedaAperta: boolean): boolean {
  if (schedaAperta) {
    return schedaTabInvioPsAllows(rank, 'UPDATE')
  }
  return schedaChiusaInvioPsAllows(rank, 'UPDATE')
}
