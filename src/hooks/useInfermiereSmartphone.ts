import type { UserProfile } from '../types/userProfile'
import { useIsSmartphone } from './useIsSmartphone'

/** Vista compatta dedicata: infermiere + viewport smartphone. */
export function useInfermiereSmartphone(user: UserProfile | null | undefined): boolean {
  const sm = useIsSmartphone()
  return Boolean(user?.rank === 'Infermiere' && sm)
}
