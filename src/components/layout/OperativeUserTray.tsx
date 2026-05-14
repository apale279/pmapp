import type { UserProfile } from '../../types/userProfile'

function LogoutDoorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 3h4v18h-4M10 17l-4-5 4-5M6 12h9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function OperativeUserTray({
  user,
  logout,
  variant = 'light',
  compact = false,
}: {
  user: UserProfile
  logout: () => Promise<void>
  variant?: 'light' | 'dark'
  compact?: boolean
}) {
  const isDark = variant === 'dark'
  const nomeCls = isDark ? 'text-[#e8e8f8]' : 'text-slate-900'
  const badgeCls = isDark
    ? 'border-white/25 bg-white/10 text-[#e8e8f8]'
    : 'border-slate-200 bg-slate-100 text-slate-800'
  return (
    <div
      className={`flex shrink-0 items-center pl-1 sm:pl-2 ${
        compact ? 'max-w-[min(100%,9.5rem)] gap-1' : 'min-w-0 max-w-[min(100%,14rem)] gap-2 sm:max-w-[min(100%,20rem)]'
      }`}
    >
      <div
        className={`flex min-w-0 max-w-full items-center rounded-md border font-bold uppercase leading-tight tracking-wide ${badgeCls} ${
          compact ? 'gap-0.5 px-1 py-0.5 text-[9px]' : 'gap-1.5 px-2 py-1 text-xs'
        }`}
        title={`${user.rank} · ${user.nome}`}
      >
        <span className="max-w-[4.5rem] shrink-0 truncate" title={user.rank}>
          {user.rank}
        </span>
        <span className={`min-w-0 truncate font-semibold normal-case ${nomeCls} ${compact ? 'max-w-[3.75rem]' : ''}`}>
          {user.nome}
        </span>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        title="Logout"
        aria-label="Logout"
        className={
          isDark
            ? compact
              ? 'pma-theme-skip flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/30 text-[#e8e8f8] hover:bg-white/10'
              : 'shrink-0 whitespace-nowrap rounded border border-white/30 px-2 py-1 text-[11px] font-bold uppercase text-[#e8e8f8] hover:bg-white/10 sm:px-2.5 sm:text-xs'
            : compact
              ? 'pma-theme-skip flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              : 'shrink-0 whitespace-nowrap rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold uppercase text-slate-800 hover:bg-slate-50 sm:px-2.5 sm:text-xs'
        }
      >
        {compact ? <LogoutDoorIcon /> : 'Logout'}
      </button>
    </div>
  )
}
