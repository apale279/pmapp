/**
 * Riga elenco partecipanti (da Excel manifestazione, colonne A–E).
 * Salvata in `manifestazioni/{id}.impostazioni.partecipanti_elenco`.
 */
export type PartecipanteElencoRow = {
  pettorale: number
  nome: string
  cognome: string
  /** `yyyy-mm-dd` o null se assente / non interpretabile */
  data_nascita_ymd: string | null
  telefono: string
}

function strCell(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v).trim()
  return String(v).trim()
}

function numPettorale(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return Math.floor(v)
  const s = String(v).trim().replace(',', '.')
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return Math.floor(n)
}

/** Legge array salvato su Firestore. */
export function parsePartecipantiElencoFromFirestore(raw: unknown): PartecipanteElencoRow[] {
  if (!Array.isArray(raw)) return []
  const out: PartecipanteElencoRow[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const pet = numPettorale(o.pettorale)
    if (pet === null) continue
    const nome = strCell(o.nome)
    const cognome = strCell(o.cognome)
    const data_nascita_ymd =
      typeof o.data_nascita_ymd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.data_nascita_ymd.trim())
        ? o.data_nascita_ymd.trim()
        : null
    const telefono = strCell(o.telefono)
    out.push({ pettorale: pet, nome, cognome, data_nascita_ymd, telefono })
  }
  return out
}

export function findPartecipanteByPettorale(
  rows: PartecipanteElencoRow[],
  pettorale: number,
): PartecipanteElencoRow | undefined {
  const p = Math.floor(pettorale)
  return rows.find((r) => r.pettorale === p)
}
