/**
 * Preset testuali per le note di dimissione (configurazione su `manifestazioni`).
 */
export type PresetDimissioneVoce = {
  titolo: string
  testo: string
}

export function parsePresetDimissioneFromFirestore(raw: unknown): PresetDimissioneVoce[] {
  if (!Array.isArray(raw)) return []
  const out: PresetDimissioneVoce[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const titolo = typeof o.titolo === 'string' ? o.titolo.trim() : ''
    const testo = typeof o.testo === 'string' ? o.testo : ''
    if (!titolo && !testo.trim()) continue
    out.push({ titolo: titolo || 'Preset', testo })
  }
  return out
}
