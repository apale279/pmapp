import type { Paziente } from '../../types/paziente'

export type SchedaPazienteTabId = 'generale' | 'anagrafica' | 'cartella' | 'dimissione' | 'invio_ps'

const BASE_TABS: { id: SchedaPazienteTabId; label: string }[] = [
  { id: 'generale', label: 'Generale' },
  { id: 'anagrafica', label: 'Anagrafica' },
  { id: 'cartella', label: 'Cartella clinica' },
  { id: 'dimissione', label: 'Dimissione' },
]

/**
 * Tab visibili sulla scheda: la sezione Invio PS compare solo con esito `invio_ps`.
 */
export function schedaPazienteTabsFor(p: Pick<Paziente, 'dimissione_esito'>): {
  id: SchedaPazienteTabId
  label: string
}[] {
  if (p.dimissione_esito === 'invio_ps') {
    return [...BASE_TABS, { id: 'invio_ps', label: 'Invio PS' }]
  }
  return [...BASE_TABS]
}
