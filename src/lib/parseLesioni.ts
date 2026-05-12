import type { LesioneMarker, LesioneVista } from '../types/lesioni'

function isVista(v: unknown): v is LesioneVista {
  return v === 'front' || v === 'back'
}

export function parseLesioni(raw: unknown): LesioneMarker[] {
  if (!Array.isArray(raw)) return []
  const out: LesioneMarker[] = []
  for (const el of raw) {
    if (!el || typeof el !== 'object') continue
    const o = el as Record<string, unknown>
    const n = Number(o.n)
    if (!Number.isFinite(n) || n < 1) continue
    const vista = o.vista
    if (!isVista(vista)) continue
    const x = Number(o.x)
    const y = Number(o.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const descrizione = typeof o.descrizione === 'string' ? o.descrizione : ''
    out.push({
      n: Math.floor(n),
      vista,
      x,
      y,
      descrizione,
    })
  }
  out.sort((a, b) => a.n - b.n)
  return out
}
