import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

export type SidebarNavTheme = 'admin' | 'operative'

const RAIL_OPERATIVE =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white hover:text-[#2563eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] text-slate-600'

const RAIL_OPERATIVE_ACTIVE =
  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-[#2563eb] shadow-[inset_3px_0_0_0_#2563eb]'

const RAIL_ADMIN =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 text-slate-300'

const RAIL_ADMIN_ACTIVE =
  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-800 text-white shadow-[inset_3px_0_0_0_#f59e0b]'

function railClasses(theme: SidebarNavTheme, isActive: boolean) {
  if (theme === 'admin') return isActive ? RAIL_ADMIN_ACTIVE : RAIL_ADMIN
  return isActive ? RAIL_OPERATIVE_ACTIVE : RAIL_OPERATIVE
}

function drawerClasses(theme: SidebarNavTheme, isActive: boolean) {
  if (theme === 'admin') {
    return isActive
      ? 'bg-slate-800 text-amber-300'
      : 'text-slate-200 hover:bg-slate-800/80'
  }
  return isActive ? 'bg-slate-100 text-[#2563eb]' : 'text-slate-900 hover:bg-slate-50'
}

export function SidebarRailLink({
  to,
  end,
  title,
  icon,
  theme,
  onNavigate,
}: {
  to: string
  end?: boolean
  title: string
  icon: ReactNode
  theme: SidebarNavTheme
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={title}
      aria-label={title}
      onClick={() => onNavigate?.()}
      className={({ isActive }) => railClasses(theme, isActive)}
    >
      {icon}
    </NavLink>
  )
}

export function SidebarRailDisabled({
  title,
  icon,
  theme,
}: {
  title: string
  icon: ReactNode
  theme: SidebarNavTheme
}) {
  const base = theme === 'admin' ? RAIL_ADMIN : RAIL_OPERATIVE
  return (
    <span className={`${base} cursor-not-allowed opacity-35`} title={title} aria-hidden>
      {icon}
    </span>
  )
}

export function SidebarDrawerLink({
  to,
  end,
  label,
  icon,
  theme,
  onNavigate,
}: {
  to: string
  end?: boolean
  label: string
  icon: ReactNode
  theme: SidebarNavTheme
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
          drawerClasses(theme, isActive),
        ].join(' ')
      }
    >
      {icon}
      <span className="min-w-0 truncate">{label}</span>
    </NavLink>
  )
}

export function SidebarDrawerDisabled({
  label,
  icon,
}: {
  label: string
  icon: ReactNode
}) {
  return (
    <div className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-400 opacity-50">
      {icon}
      <span>{label}</span>
    </div>
  )
}
