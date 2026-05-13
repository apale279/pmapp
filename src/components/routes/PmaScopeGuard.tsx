import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePmaDocSnapshot } from '../../hooks/usePmaDocNome'

/**
 * Staff clinico / operativo: solo il PMA assegnato sul profilo (`id_pma`).
 * Centrale: PMA deve appartenere alla manifestazione del profilo.
 * Superadmin: accesso libero.
 */
export function PmaScopeGuard() {
  const { id } = useParams<{ id: string }>()
  const { user, status } = useAuth()
  const pmaId = id ? decodeURIComponent(id).trim() : ''
  const pmaSnap = usePmaDocSnapshot(pmaId || undefined)

  if (status !== 'ready' || !user) {
    return null
  }

  if (user.rank === 'Superadmin') {
    return <Outlet />
  }

  if (!pmaId) {
    return <Navigate to="/unauthorized" replace />
  }

  if (pmaSnap.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-slate-600">
        Verifica accesso PMA…
      </div>
    )
  }

  if (user.rank === 'Centrale') {
    const manUser = user.id_manifestazione?.trim() ?? ''
    const manPma = pmaSnap.idManifestazione?.trim() ?? ''
    if (!manUser || !manPma || manPma !== manUser) {
      return <Navigate to="/unauthorized" replace />
    }
    return <Outlet />
  }

  const assignedPma = user.id_pma?.trim() ?? ''
  if (!assignedPma || pmaId !== assignedPma) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
