import { Link } from 'react-router-dom'
import { useRankTheme } from '../../hooks/useRankTheme'
import type { Pma } from '../../types/pma'
import { PmaCapacityFromPmaId } from './PmaCapacityGauge'

export function PmaCard({ pma }: { pma: Pma }) {
  const theme = useRankTheme()
  const to = `/pma/${encodeURIComponent(pma.id)}`

  return (
    <Link
      to={to}
      className={`group block rounded-lg border border-slate-200 border-l-[3px] ${theme.cardAccentLeft} bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow`}
    >
      <h2 className="truncate text-sm font-semibold text-slate-900 group-hover:text-slate-950">{pma.nome}</h2>
      <p className="mt-0.5 text-[12px] text-slate-600">{pma.luogo}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
        <p className="text-[11px] text-slate-500">
          Posti letto:{' '}
          <span className="font-medium text-slate-800">{pma.impostazioni_pma.posti_letto}</span>
        </p>
      </div>
      <div className="mt-2 max-w-[10rem]">
        <PmaCapacityFromPmaId pmaId={pma.id} postiLetto={pma.impostazioni_pma.posti_letto} />
      </div>
      <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">Dashboard PMA →</p>
    </Link>
  )
}
