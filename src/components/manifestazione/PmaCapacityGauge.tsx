import { useMemo } from 'react'
import { usePazientiForPma } from '../../hooks/usePazientiForPma'

/** Barra saturazione letti PMA (occupati = pazienti non dimessi). */
export function PmaCapacityGauge({
  occupati,
  posti,
  compact,
}: {
  occupati: number
  posti: number
  compact?: boolean
}) {
  const cap = Math.max(1, posti)
  const pct = Math.min(100, Math.round((occupati / cap) * 100))
  const tone =
    pct >= 95 ? 'bg-red-600' : pct >= 80 ? 'bg-amber-500' : pct >= 60 ? 'bg-slate-500' : 'bg-slate-400'

  return (
    <div className={compact ? 'min-w-[6.5rem]' : 'min-w-[7.5rem]'}>
      <div className="mb-0.5 flex items-baseline justify-between gap-1 text-[10px] text-slate-600">
        <span className="font-semibold uppercase tracking-wide text-slate-500">Letti</span>
        <span className="tabular-nums text-slate-800">
          {occupati}/{posti}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-0.5 text-[10px] tabular-nums text-slate-500">{pct}%</div>
    </div>
  )
}

/** Hook + gauge per riga tabella (una subscription per PMA). */
export function PmaCapacityFromPmaId({ pmaId, postiLetto }: { pmaId: string; postiLetto: number }) {
  const { items, loading } = usePazientiForPma(pmaId)
  const occupati = useMemo(() => items.filter((p) => p.stato !== 'dimesso').length, [items])
  if (postiLetto <= 0) return null
  if (loading) return <span className="text-[10px] text-slate-400">…</span>
  return <PmaCapacityGauge occupati={occupati} posti={postiLetto} compact />
}
