import type { UserProfile } from '../../types/userProfile'
import { SidebarNavIcon } from '../icons/navLogos'
import {
  SidebarDrawerLink,
  SidebarRailLink,
} from '../layout/sidebarNavLinks'

const RAIL_CLASS =
  'sticky top-0 z-20 flex h-screen w-14 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-slate-900 py-3'

export type AdminEmojiSidebarProps = {
  user: UserProfile
  variant: 'rail' | 'drawer'
  onNavigate?: () => void
}

/**
 * Navigazione esclusiva Superadmin: solo viste lista globali (nessuna dashboard operativa PMA/manifestazione).
 */
export function AdminEmojiSidebar({ user, variant, onNavigate }: AdminEmojiSidebarProps) {
  const brand = <SidebarNavIcon name="superadmin" />

  if (variant === 'rail') {
    return (
      <aside className={RAIL_CLASS} aria-label="Navigazione amministratore">
        <div
          className="mb-1 flex h-10 w-10 items-center justify-center"
          title={`${user.nome} · Superadmin`}
        >
          {brand}
        </div>
        <SidebarRailLink
          to="/admin"
          end
          title="Dashboard admin"
          icon={brand}
          theme="admin"
          onNavigate={onNavigate}
        />
        <SidebarRailLink
          to="/admin/manifestazioni"
          title="Manifestazioni"
          icon={<SidebarNavIcon name="dashboardEvento" />}
          theme="admin"
          onNavigate={onNavigate}
        />
        <SidebarRailLink
          to="/admin/pma"
          title="Gestione PMA globale"
          icon={<SidebarNavIcon name="vistaPma" />}
          theme="admin"
          onNavigate={onNavigate}
        />
        <SidebarRailLink
          to="/admin/utenti"
          title="Utenti"
          icon={<SidebarNavIcon name="listaUtenti" />}
          theme="admin"
          onNavigate={onNavigate}
        />
        <SidebarRailLink
          to="/admin/pazienti"
          title="Pazienti — archivio globale"
          icon={<SidebarNavIcon name="pazientiArchivio" />}
          theme="admin"
          onNavigate={onNavigate}
        />
      </aside>
    )
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-slate-700 bg-slate-900" aria-label="Navigazione admin">
      <div className="border-b border-slate-700 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">{brand}</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Superadmin</p>
            <p className="truncate text-sm font-semibold text-white">{user.nome}</p>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Area</p>
        <p className="mt-1 text-sm text-amber-200">Amministrazione globale</p>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
        <SidebarDrawerLink
          to="/admin"
          end
          label="Dashboard admin"
          icon={brand}
          theme="admin"
          onNavigate={onNavigate}
        />
        <SidebarDrawerLink
          to="/admin/manifestazioni"
          label="Manifestazioni"
          icon={<SidebarNavIcon name="dashboardEvento" />}
          theme="admin"
          onNavigate={onNavigate}
        />
        <SidebarDrawerLink
          to="/admin/pma"
          label="Gestione PMA"
          icon={<SidebarNavIcon name="vistaPma" />}
          theme="admin"
          onNavigate={onNavigate}
        />
        <SidebarDrawerLink
          to="/admin/utenti"
          label="Utenti"
          icon={<SidebarNavIcon name="listaUtenti" />}
          theme="admin"
          onNavigate={onNavigate}
        />
        <SidebarDrawerLink
          to="/admin/pazienti"
          label="Pazienti (globale)"
          icon={<SidebarNavIcon name="pazientiArchivio" />}
          theme="admin"
          onNavigate={onNavigate}
        />
      </nav>
    </aside>
  )
}
