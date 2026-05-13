import { Link } from 'react-router-dom'
import { useRankTheme } from '../../hooks/useRankTheme'
import type { Manifestazione } from '../../types/manifestazione'

function formatData(m: Manifestazione): string {
  try {
    return m.data.toDate().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function statoBadge(stato: Manifestazione['stato']): string {
  return stato === 'APERTA'
    ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
    : 'bg-slate-100 text-slate-700 ring-slate-600/10'
}

export function ManifestazioneCard({ manifestazione }: { manifestazione: Manifestazione }) {
  const theme = useRankTheme()
  const to = `/manifestazione/${encodeURIComponent(manifestazione.nome)}`

  return (
    <Link
      to={to}
      className={`group block pma-card border-l-4 ${theme.cardAccentLeft} no-underline transition hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-slate-900 group-hover:text-slate-950">
            {manifestazione.nome}
          </h2>
          <p className="mt-1 text-sm pma-field__value--muted">{formatData(manifestazione)}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statoBadge(manifestazione.stato)}`}
        >
          {manifestazione.stato}
        </span>
      </div>
      <p className="mt-3 text-xs pma-field__value--muted">Apri dashboard →</p>
    </Link>
  )
}
