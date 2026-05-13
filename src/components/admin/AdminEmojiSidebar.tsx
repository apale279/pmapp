import { NavLink } from 'react-router-dom'
import type { UserProfile } from '../../types/userProfile'

const RAIL_CLASS =
  'sticky top-0 z-20 flex h-screen w-14 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-slate-900 py-3'

const BTN =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl leading-none text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

const BTN_ACTIVE =
  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-800 text-white shadow-[inset_3px_0_0_0_#f59e0b]'

function RailLink({
  to,
  end,
  title,
  emoji,
  onNavigate,
}: {
  to: string
  end?: boolean
  title: string
  emoji: string
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={title}
      aria-label={title}
      onClick={() => onNavigate?.()}
      className={({ isActive }) => (isActive ? BTN_ACTIVE : BTN)}
    >
      <span aria-hidden>{emoji}</span>
    </NavLink>
  )
}

function DrawerLink({
  to,
  end,
  label,
  emoji,
  onNavigate,
}: {
  to: string
  end?: boolean
  label: string
  emoji: string
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors',
          isActive ? 'bg-slate-800 text-amber-300' : 'text-slate-200 hover:bg-slate-800/80',
        ].join(' ')
      }
    >
      <span className="text-xl leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </NavLink>
  )
}

export type AdminEmojiSidebarProps = {
  user: UserProfile
  variant: 'rail' | 'drawer'
  onNavigate?: () => void
}

/**
 * Navigazione esclusiva Superadmin: solo viste lista globali (nessuna dashboard operativa PMA/manifestazione).
 */
export function AdminEmojiSidebar({ user, variant, onNavigate }: AdminEmojiSidebarProps) {
  const initial = (user.nome?.trim()?.charAt(0) || user.email?.trim()?.charAt(0) || '?').toUpperCase()

  if (variant === 'rail') {
    return (
      <aside className={RAIL_CLASS} aria-label="Navigazione amministratore">
        <div
          className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-xs font-bold text-amber-200"
          title={`${user.nome} · Superadmin`}
        >
          {initial}
        </div>
        <RailLink to="/admin" end title="Dashboard admin" emoji="👑" onNavigate={onNavigate} />
        <RailLink to="/admin/manifestazioni" title="Manifestazioni" emoji="🏟️" onNavigate={onNavigate} />
        <RailLink to="/admin/pma" title="Gestione PMA globale" emoji="⛺" onNavigate={onNavigate} />
        <RailLink to="/admin/utenti" title="Utenti" emoji="👥" onNavigate={onNavigate} />
        <RailLink to="/admin/pazienti" title="Pazienti — archivio globale" emoji="📋" onNavigate={onNavigate} />
      </aside>
    )
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-slate-700 bg-slate-900" aria-label="Navigazione admin">
      <div className="border-b border-slate-700 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Superadmin</p>
        <p className="mt-1 truncate text-sm font-semibold text-white">{user.nome}</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Area</p>
        <p className="mt-1 text-sm text-amber-200">Amministrazione globale</p>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
        <DrawerLink to="/admin" end label="Dashboard admin" emoji="👑" onNavigate={onNavigate} />
        <DrawerLink to="/admin/manifestazioni" label="Manifestazioni" emoji="🏟️" onNavigate={onNavigate} />
        <DrawerLink to="/admin/pma" label="Gestione PMA" emoji="⛺" onNavigate={onNavigate} />
        <DrawerLink to="/admin/utenti" label="Utenti" emoji="👥" onNavigate={onNavigate} />
        <DrawerLink to="/admin/pazienti" label="Pazienti (globale)" emoji="📋" onNavigate={onNavigate} />
      </nav>
    </aside>
  )
}
