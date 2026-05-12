import { useLocation } from 'react-router-dom'
import { useManifestazioneDoc } from './useManifestazioneDoc'
import { usePmaDocSnapshot } from './usePmaDocNome'
import { parseManifestazioneIdFromPath, parsePmaIdFromPath } from '../lib/routeScopeFromPath'

export function useAppShellTitle(): string {
  const { pathname } = useLocation()
  const manifestazioneId = parseManifestazioneIdFromPath(pathname)
  const pmaIdFromPath = parsePmaIdFromPath(pathname)
  const { data: man } = useManifestazioneDoc(manifestazioneId)
  const pmaSnap = usePmaDocSnapshot(pmaIdFromPath)

  if (pathname === '/' || pathname === '') {
    return 'PMA Manager - Home'
  }
  if (pathname.startsWith('/utenti')) {
    return 'PMA Manager - Gestione utenti'
  }
  if (manifestazioneId && /^\/manifestazione\/[^/]+\/impostazioni\/?$/.test(pathname)) {
    const label = man?.nome?.trim() || manifestazioneId
    return `PMA Manager - ${label} - Impostazioni manifestazione`
  }
  if (manifestazioneId && /^\/manifestazione\/[^/]+\/?$/.test(pathname)) {
    const label = man?.nome?.trim() || manifestazioneId
    return `PMA Manager - ${label} - Dashboard`
  }
  if (pmaIdFromPath && /^\/pma\/[^/]+\/impostazioni\/?$/.test(pathname)) {
    const label = pmaSnap.nome?.trim() || pmaIdFromPath
    return `PMA Manager - ${label} - Impostazioni PMA`
  }

  return `PMA Manager - ${pathname}`
}
