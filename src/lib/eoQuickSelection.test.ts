import { describe, expect, it } from 'vitest'
import {
  isNessunaEoOptionLabel,
  nessunaEoOptionDisabled,
  normalizeEoQuickLabels,
  toggleEoQuickFirstDefaultExclusive,
  toggleEoQuickSelection,
} from './eoQuickSelection'

describe('eoQuickSelection', () => {
  it('rileva NESSUNA case-insensitive', () => {
    expect(isNessunaEoOptionLabel('NESSUNA')).toBe(true)
    expect(isNessunaEoOptionLabel('  nessuna ')).toBe(true)
    expect(isNessunaEoOptionLabel('Dolore')).toBe(false)
  })

  it('normalizeEoQuickLabels rimuove NESSUNO/NESSUNA e duplicati', () => {
    expect(normalizeEoQuickLabels(['NESSUNO', 'Dispnea', ' Cianosi ', 'Dispnea'])).toEqual(['Dispnea', 'Cianosi'])
    expect(normalizeEoQuickLabels(['NESSUNA', 'Dispnea'])).toEqual(['Dispnea'])
    expect(normalizeEoQuickLabels([])).toEqual([])
  })

  it('toggle: selezione non-nessuna rimuove NESSUNA', () => {
    expect(toggleEoQuickSelection(['NESSUNA'], 'Dispnea')).toEqual(['Dispnea'])
  })

  it('toggle: NESSUNA azzera le altre', () => {
    expect(toggleEoQuickSelection(['Dispnea', 'Cianosi'], 'NESSUNA')).toEqual(['NESSUNA'])
  })

  it('nessunaEoOptionDisabled: non disabilita chip', () => {
    expect(nessunaEoOptionDisabled(false, ['Dispnea'], 'NESSUNO')).toBe(false)
    expect(nessunaEoOptionDisabled(false, ['Dispnea', 'Cianosi'], 'NESSUNA')).toBe(false)
  })

  it('toggleEoQuickFirstDefaultExclusive: primo = solo default', () => {
    const first = 'Cosciente'
    expect(toggleEoQuickFirstDefaultExclusive([first], first, first)).toEqual([first])
    expect(toggleEoQuickFirstDefaultExclusive([first, 'Dispnea'], first, first)).toEqual([first])
  })

  it('toggleEoQuickFirstDefaultExclusive: altro valore toglie il primo', () => {
    const first = 'Cosciente'
    expect(toggleEoQuickFirstDefaultExclusive([first], 'Dispnea', first)).toEqual(['Dispnea'])
    expect(toggleEoQuickFirstDefaultExclusive(['Dispnea'], 'Dispnea', first)).toEqual([first])
  })
})
