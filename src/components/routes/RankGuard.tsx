import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { defaultOperativePath } from '../../lib/defaultOperativePath'
import type { UserRank } from '../../types/userProfile'

export type RankGuardProps = {
  allow: readonly UserRank[]
  children: ReactNode
}

export function RankGuard({ allow, children }: RankGuardProps) {
  const { user } = useAuth()
  if (!user) {
    return null
  }
  if (!allow.includes(user.rank)) {
    return <Navigate to={defaultOperativePath(user)} replace />
  }
  return <>{children}</>
}
