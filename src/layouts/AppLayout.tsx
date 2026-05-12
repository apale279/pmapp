import { useState } from 'react'
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

function IconMenuHamburger() {
  return (
    <svg className="shrink-0" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AppLayoutShell({ user, logout }: { user: UserProfile; logout: () => Promise<void> }) {
  const location = useLocation()
  const theme = useRankTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  /** Dashboard PMA “manager”: chrome dedicato nella pagina, niente shell standard. */
  const isPmaManagerDashboard = /^\/pma\/[^/]+$/.test(location.pathname)

  if (isPmaManagerDashboard) {
    return (
      <div className="min-h-screen bg-white">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden shrink-0 md:flex">
        <AppSidebar user={user} theme={theme} layout="rail" />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className={`flex min-h-12 shrink-0 items-center justify-between gap-2 border-b px-3 py-2 md:h-14 md:gap-4 md:px-6 md:py-0 ${theme.headerBorder} ${theme.headerBg}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200/90 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50 md:hidden ${theme.headerText}`}
              aria-label="Apri menu di navigazione"
              aria-expanded={mobileNavOpen}
              aria-controls="app-mobile-nav"
              onClick={() => setMobileNavOpen(true)}
            >
              <IconMenuHamburger />
            </button>
            <div className="min-w-0">
              <div className={`text-xs font-medium md:text-sm ${theme.headerText}`}>Area operativa</div>
              <div className={`truncate text-[10px] md:text-xs ${theme.headerTextMuted}`}>{location.pathname}</div>
            </div>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-2 md:gap-3">
            <div className="min-w-0 max-w-[38vw] sm:max-w-xs">
              <UserIdentity user={user} theme={theme} />
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className={`min-h-10 shrink-0 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors md:min-h-0 md:py-1.5 md:text-sm md:normal-case ${theme.headerButton}`}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-2 sm:p-3 md:p-5">
          <Outlet />
        </main>
      </div>

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
            aria-label="Chiudi menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            id="app-mobile-nav"
            className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,90vw)] flex-col shadow-2xl md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigazione"
          >
            <div className="flex shrink-0 items-center justify-end border-b border-slate-200 bg-white px-2 py-2">
              <button
                type="button"
                className="min-h-10 rounded-md px-3 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
                onClick={() => setMobileNavOpen(false)}
              >
                Chiudi
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
              <AppSidebar
                user={user}
                theme={theme}
                layout="drawer"
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
          </div>
        </>
      ) : null}
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
