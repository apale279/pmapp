import type { UserProfile } from '../../types/userProfile'

export function OperativeUserTray({
  user,
  logout,
  variant = 'light',
}: {
  user: UserProfile
  logout: () => Promise<void>
  variant?: 'light' | 'dark'
}) {
  const initial = (user.nome?.trim()?.charAt(0) || user.email?.trim()?.charAt(0) || '?').toUpperCase()
  const isDark = variant === 'dark'
  const avatar = isDark
    ? 'border-white/20 bg-white/10 text-[#e8e8f8]'
    : 'border-slate-200 bg-slate-100 text-slate-700'
  const nomeCls = isDark ? 'text-[#e8e8f8]' : 'text-slate-900'
  return (
    <div className="flex shrink-0 items-center gap-3 pl-2">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${avatar}`}
        title={user.nome}
        aria-hidden
      >
        {initial}
      </div>
      <div className="hidden min-w-0 text-right sm:block">
        <div className={`truncate text-sm font-bold ${nomeCls}`}>{user.nome}</div>
      </div>
      <button type="button" onClick={() => void logout()}>
        Logout
      </button>
    </div>
  )
}
