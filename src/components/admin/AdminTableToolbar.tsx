import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (v: string) => void
  actions?: ReactNode
}

/**
 * Intestazione lista admin: titolo, filtro ricerca, azioni (es. “Nuovo”).
 */
export function AdminTableToolbar({
  title,
  subtitle,
  searchPlaceholder = 'Cerca…',
  searchValue,
  onSearchChange,
  actions,
}: Props) {
  return (
    <header className="w-full max-w-[min(100%,1800px)] space-y-0 overflow-hidden rounded-t-lg border border-slate-200 bg-white">
      <div className="pma-bar flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="pma-bar__id">{title}</div>
          {subtitle ? <p className="mt-1 max-w-3xl text-xs leading-snug text-[#a8a8c8]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="pma-bar__right flex-wrap justify-end">{actions}</div> : null}
      </div>
      <div className="border-b border-slate-200 bg-white px-3 py-3">
        <label className="block max-w-xl">
          <span className="sr-only">Filtro ricerca</span>
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            autoComplete="off"
          />
        </label>
      </div>
    </header>
  )
}
