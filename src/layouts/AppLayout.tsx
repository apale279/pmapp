import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { RankThemeProvider } from '../context/RankThemeContext'
import { OperativeAppShell } from '../components/layout/OperativeAppShell'
import { OperativeAppSideRail } from '../components/layout/OperativeAppSideRail'
import { useAppShellTitle } from '../hooks/useAppShellTitle'
import type { UserProfile } from '../types/userProfile'

function PmaSelfContainedOutlet() {
  return (
    <div className="min-h-screen bg-white">
      <Outlet />
    </div>
  )
}

function StandardAppChrome({ user, logout }: { user: UserProfile; logout: () => Promise<void> }) {
  const title = useAppShellTitle()

  return (
    <OperativeAppShell
      user={user}
      logout={logout}
      title={title}
      renderRail={(variant, closeMobile) => (
        <OperativeAppSideRail user={user} variant={variant} onNavigate={closeMobile} />
      )}
    >
      <Outlet />
    </OperativeAppShell>
  )
}

function AppLayoutShell({ user, logout }: { user: UserProfile; logout: () => Promise<void> }) {
  const location = useLocation()
  const path = location.pathname

  const isPmaDashboard = /^\/pma\/[^/]+$/.test(path)
  const isSchedaPaziente = /^\/pma\/[^/]+\/paziente\/[^/]+$/.test(path)
  const isPmaImpostazioni = /^\/pma\/[^/]+\/impostazioni\/?$/.test(path)

  if (isPmaDashboard || isSchedaPaziente || isPmaImpostazioni) {
    return <PmaSelfContainedOutlet />
  }

  return <StandardAppChrome user={user} logout={logout} />
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
