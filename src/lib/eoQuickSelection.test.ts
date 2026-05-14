import { describe, expect, it } from 'vitest'
import { isNessunaEoOptionLabel, nessunaEoOptionDisabled, toggleEoQuickSelection } from './eoQuickSelection'

describe('eoQuickSelection', () => {
  it('rileva NESSUNA case-insensitive', () => {
    expect(isNessunaEoOptionLabel('NESSUNA')).toBe(true)
    expect(isNessunaEoOptionLabel('  nessuna ')).toBe(true)
    expect(isNessunaEoOptionLabel('Dolore')).toBe(false)
  })

  it('toggle: selezione non-nessuna rimuove NESSUNA', () => {
    expect(toggleEoQuickSelection(['NESSUNA'], 'Dispnea')).toEqual(['Dispnea'])
  })

  it('toggle: NESSUNA azzera le altre', () => {
    expect(toggleEoQuickSelection(['Dispnea', 'Cianosi'], 'NESSUNA')).toEqual(['NESSUNA'])
  })

  it('NESSUNO resta cliccabile anche con altre voci selezionate', () => {
    expect(nessunaEoOptionDisabled(false, ['Dispnea'], 'NESSUNO')).toBe(false)
    expect(nessunaEoOptionDisabled(false, ['Dispnea', 'Cianosi'], 'NESSUNA')).toBe(false)
  })
})
