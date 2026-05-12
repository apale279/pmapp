import { useMemo } from 'react'
import { usePazientiForPma } from '../../hooks/usePazientiForPma'
import type { CodiceColorePaziente } from '../../types/paziente'
import { CODICE_COLORE_LABEL } from '../../types/paziente'

const CODICI_ORDINE: CodiceColorePaziente[] = ['rosso', 'giallo', 'verde', 'bianco']

const COLORE_DOT: Record<CodiceColorePaziente, string> = {
  rosso: 'bg-red-600',
  giallo: 'bg-amber-400',
  verde: 'bg-emerald-600',
  bianco: 'bg-slate-300',
}

type Layout = 'inline' | 'coordination'

type Props = {
  pmaId: string
  /** `coordination`: breakdown per stato e codice colore (dashboard manifestazione). */
  layout?: Layout
}

/** Conteggi pazienti per PMA (dashboard coordinamento / card). */
export function PmaOperationalCounts({ pmaId, layout = 'inline' }: Props) {
  const { items, loading, error } = usePazientiForPma(pmaId)

  const stats = useMemo(() => {
    let dimessi = 0
    let in_arrivo = 0
    let in_attesa = 0
    let in_carico = 0
    let altri = 0
    const colore: Record<CodiceColorePaziente, number> = {
      rosso: 0,
      giallo: 0,
      verde: 0,
      bianco: 0,
    }
    for (const p of items) {
      if (p.stato === 'dimesso') {
        dimessi += 1
        continue
      }
      colore[p.codice_colore] += 1
      if (p.stato === 'in_arrivo') in_arrivo += 1
      else if (p.stato === 'in_attesa') in_attesa += 1
      else if (p.stato === 'in_carico') in_carico += 1
      else altri += 1
    }
    const attivi = items.length - dimessi
    return { attivi, dimessi, in_arrivo, in_attesa, in_carico, altri, colore }
  }, [items])

  if (loading) return <span className="text-xs text-slate-500">…</span>
  if (error) return <span className="text-xs text-red-600">—</span>

  if (layout === 'inline') {
    return (
      <span className="text-xs text-slate-600">
        <span className="font-medium text-slate-800">{stats.attivi}</span> attivi ·{' '}
        <span className="font-medium text-slate-800">{stats.dimessi}</span> dimessi
      </span>
    )
  }

  return (
    <div className="space-y-2 text-xs text-slate-700">
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-medium text-slate-800">
          Arr {stats.in_arrivo}
        </span>
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-medium text-slate-800">
          Att {stats.in_attesa}
        </span>
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-medium text-slate-800">
          Car {stats.in_carico}
        </span>
        {stats.altri > 0 ? (
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-700">
            Altro {stats.altri}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600">
        {CODICI_ORDINE.map((c) => (
          <span key={c} className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COLORE_DOT[c]}`} aria-hidden />
            <span className="font-medium text-slate-800">{stats.colore[c]}</span>
            <span className="text-slate-400">{CODICE_COLORE_LABEL[c].slice(0, 1)}</span>
          </span>
        ))}
      </div>
      <div className="text-[11px] text-slate-500">
        <span className="font-medium text-slate-700">{stats.attivi}</span> attivi ·{' '}
        <span className="font-medium text-slate-700">{stats.dimessi}</span> dimessi
      </div>
    </div>
  )
}
