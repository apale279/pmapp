import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { RankThemeProvider } from '../context/RankThemeContext'
import { OperativeAppShell } from '../components/layout/OperativeAppShell'
import type { UserProfile } from '../types/userProfile'

function AppChrome({ user, logout }: { user: UserProfile; logout: () => Promise<void> }) {
  return (
    <OperativeAppShell user={user} logout={logout}>
      <Outlet />
    </OperativeAppShell>
  )
}

export function AppLayout() {
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  return (
    <RankThemeProvider rank={user.rank}>
      <AppChrome user={user} logout={logout} />
    </RankThemeProvider>
  )
}
