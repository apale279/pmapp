import { Link } from 'react-router-dom'
import { useRankTheme } from '../../hooks/useRankTheme'
import type { Pma } from '../../types/pma'

export function PmaCard({ pma }: { pma: Pma }) {
  const theme = useRankTheme()
  const to = `/pma/${encodeURIComponent(pma.id)}`

  return (
    <Link
      to={to}
      className={`group block rounded-xl border border-slate-200 border-l-4 ${theme.cardAccentLeft} bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md`}
    >
      <h2 className="truncate text-lg font-semibold text-slate-900 group-hover:text-slate-950">
        {pma.nome}
      </h2>
      <p className="mt-1 text-sm text-slate-600">{pma.luogo}</p>
      <p className="mt-3 text-xs text-slate-500">
        Posti letto:{' '}
        <span className="font-medium text-slate-800">
          {pma.impostazioni_pma.posti_letto}
        </span>
      </p>
      <p className="mt-2 text-xs text-slate-400">Apri dashboard PMA →</p>
    </Link>
  )
}
