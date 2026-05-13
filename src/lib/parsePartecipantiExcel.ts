import type { PartecipanteElencoRow } from '../types/manifestazionePartecipanti'

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** Data locale (non UTC) da oggetto Date. */
function dateToYmdLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/**
 * Serial Excel → data locale (mezzanotte locale del giorno di calendario Excel).
 * Approssimazione standard (epoch 1899-12-30).
 */
function excelSerialToYmd(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1) return null
  const ms = (serial - 25569) * 86400 * 1000
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return null
  return dateToYmdLocal(d)
}

function cellToYmd(cell: unknown): string | null {
  if (cell == null || cell === '') return null
  if (cell instanceof Date) {
    if (Number.isNaN(cell.getTime())) return null
    return dateToYmdLocal(cell)
  }
  if (typeof cell === 'number' && Number.isFinite(cell)) {
    if (cell > 30000 && cell < 60000) return excelSerialToYmd(cell)
    if (cell > 1e12) {
      const d = new Date(cell)
      return Number.isNaN(d.getTime()) ? null : dateToYmdLocal(d)
    }
    if (cell >= 1000 && cell <= 30000) return excelSerialToYmd(cell)
  }
  const s = String(cell).trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const it = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s)
  if (it) {
    const dd = Number(it[1])
    const mm = Number(it[2])
    const yyyy = Number(it[3])
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yyyy > 1800)
      return `${yyyy}-${pad2(mm)}-${pad2(dd)}`
  }
  return null
}

function rowPettorale(cell: unknown): number | null {
  if (cell == null || cell === '') return null
  if (typeof cell === 'number' && Number.isFinite(cell)) return Math.floor(cell)
  const s = String(cell).trim().replace(/\s/g, '').replace(',', '.')
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return Math.floor(n)
}

function isHeaderRow(a: unknown): boolean {
  const s = String(a ?? '')
    .trim()
    .toLowerCase()
  if (!s) return false
  return (
    s.includes('pettor') ||
    s.includes('pett') ||
    s.includes('numero') ||
    s.includes('nr') ||
    s === 'nome' ||
    s === 'cognome'
  )
}

/**
 * Primo foglio: colonne A–E = pettorale, nome, cognome, data nascita, telefono.
 * La prima riga viene ignorata se sembra un’intestazione.
 */
export async function parsePartecipantiExcelFile(file: File): Promise<PartecipanteElencoRow[]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const name = wb.SheetNames[0]
  if (!name) return []
  const sheet = wb.Sheets[name]
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null | undefined)[]>(sheet, {
    header: 1,
    defval: '',
  }) as unknown[][]

  let start = 0
  if (matrix.length > 0) {
    const firstA = matrix[0]?.[0]
    if (isHeaderRow(firstA) || rowPettorale(firstA) === null) start = 1
  }

  const byPett = new Map<number, PartecipanteElencoRow>()
  for (let i = start; i < matrix.length; i++) {
    const row = matrix[i]
    if (!row || row.length === 0) continue
    const pet = rowPettorale(row[0])
    if (pet === null) continue
    const nome = String(row[1] ?? '').trim()
    const cognome = String(row[2] ?? '').trim()
    const data_nascita_ymd = cellToYmd(row[3])
    const telefono = String(row[4] ?? '').trim()
    byPett.set(pet, { pettorale: pet, nome, cognome, data_nascita_ymd, telefono })
  }
  return [...byPett.values()].sort((a, b) => a.pettorale - b.pettorale)
}
