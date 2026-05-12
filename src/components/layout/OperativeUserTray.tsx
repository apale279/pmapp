import type { UserProfile } from '../../types/userProfile'

export function OperativeUserTray({ user, logout }: { user: UserProfile; logout: () => Promise<void> }) {
  const initial = (user.nome?.trim()?.charAt(0) || user.email?.trim()?.charAt(0) || '?').toUpperCase()

  return (
    <div className="flex shrink-0 items-center gap-3 pl-2">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700"
        title={user.nome}
        aria-hidden
      >
        {initial}
      </div>
      <div className="hidden min-w-0 text-right sm:block">
        <div className="truncate text-sm font-bold text-[#111827]">{user.nome}</div>
        <div className="mt-0.5">
          <span
            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
              user.rank === 'Medico' ? 'bg-[#2563eb]' : 'bg-slate-600'
            }`}
          >
            {user.rank}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        className="shrink-0 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase text-red-600 transition-colors hover:bg-red-50"
      >
        Logout
      </button>
    </div>
  )
}
