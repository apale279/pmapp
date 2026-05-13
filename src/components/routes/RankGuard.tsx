import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { UserRank } from '../../types/userProfile'

export type RankGuardProps = {
  /** Rank ammessi a montare le rotte figlie (`<Outlet />`). */
  allow: readonly UserRank[]
}

/**
 * Guard RBAC a livello router: valuta `user.rank` **prima** delle pagine figlie (pattern `<Outlet />`).
 * Non autenticato / profilo non pronto: null (il genitore `ProtectedRoute` gestisce auth).
 * Rank non in lista: redirect esplicito (nessun render della pagina protetta).
 */
export function RankGuard({ allow }: RankGuardProps) {
  const { user, status } = useAuth()

  if (status !== 'ready' || !user) {
    return null
  }

  if (!allow.includes(user.rank)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
