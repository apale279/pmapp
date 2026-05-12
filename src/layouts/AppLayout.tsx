import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { RankThemeProvider } from '../context/RankThemeContext'
import { useRankTheme } from '../hooks/useRankTheme'
import { StethoscopeIcon } from '../components/icons/StethoscopeIcon'
import { AppSidebar } from '../components/layout/AppSidebar'
import type { UserProfile } from '../types/userProfile'
import type { RankTheme } from '../theme/rankTheme'

function UserIdentity({ user, theme }: { user: UserProfile; theme: RankTheme }) {
  const isMedico = user.rank === 'Medico'
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {isMedico ? <StethoscopeIcon /> : null}
      <span className={`truncate font-medium ${theme.headerText}`}>{user.nome}</span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${theme.rankBadge}`}
      >
        {user.rank.toUpperCase()}
      </span>
    </div>
  )
}

function AppLayoutShell({ user, logout }: { user: UserProfile; logout: () => Promise<void> }) {
  const location = useLocation()
  const theme = useRankTheme()

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar user={user} theme={theme} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className={`flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6 ${theme.headerBorder} ${theme.headerBg}`}
        >
          <div className="min-w-0">
            <div className={`text-sm font-medium ${theme.headerText}`}>Area operativa</div>
            <div className={`truncate text-xs ${theme.headerTextMuted}`}>{location.pathname}</div>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <div className="min-w-0 max-w-[42vw] sm:max-w-xs">
              <UserIdentity user={user} theme={theme} />
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${theme.headerButton}`}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function AppLayout() {
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  return (
    <RankThemeProvider rank={user.rank}>
      <AppLayoutShell user={user} logout={logout} />
    </RankThemeProvider>
  )
}
