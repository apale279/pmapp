import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Limita `/manifestazione/:id` alla manifestazione assegnata al profilo (Centrale, staff PMA, ecc.).
 * Superadmin: accesso libero.
 */
export function ManifestazioneScopeGuard() {
  const { id } = useParams<{ id: string }>()
  const { user, status } = useAuth()
  const routeId = id ? decodeURIComponent(id).trim() : ''

  if (status !== 'ready' || !user) {
    return null
  }

  if (user.rank === 'Superadmin') {
    return <Outlet />
  }

  const assigned = user.id_manifestazione?.trim() ?? ''
  if (!assigned || routeId !== assigned) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
