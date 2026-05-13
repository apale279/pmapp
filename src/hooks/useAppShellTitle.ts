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
  if (pathname === '/admin' || pathname === '/admin/') {
    return 'PMA Manager - Dashboard admin'
  }
  if (pathname.startsWith('/admin/manifestazioni')) {
    return 'PMA Manager - Manifestazioni (admin)'
  }
  if (pathname.startsWith('/admin/pma')) {
    return 'PMA Manager - PMA globali (admin)'
  }
  if (pathname.startsWith('/admin/utenti')) {
    return 'PMA Manager - Gestione utenti (admin)'
  }
  if (pathname.startsWith('/admin/pazienti')) {
    return 'PMA Manager - Pazienti globali (admin)'
  }
  if (pathname.startsWith('/utenti')) {
    return 'PMA Manager - Gestione utenti'
  }
  if (manifestazioneId && /^\/manifestazione\/[^/]+\/impostazioni\/?$/.test(pathname)) {
    const label = man?.nome?.trim() || manifestazioneId
    return `PMA Manager - ${label} - Impostazioni manifestazione`
  }
  if (manifestazioneId && /^\/manifestazione\/[^/]+\/rubrica\/?$/.test(pathname)) {
    const label = man?.nome?.trim() || manifestazioneId
    return `PMA Manager - ${label} - Rubrica`
  }
  if (manifestazioneId && /^\/manifestazione\/[^/]+\/file-utili\/?$/.test(pathname)) {
    const label = man?.nome?.trim() || manifestazioneId
    return `PMA Manager - ${label} - File utili`
  }
  if (manifestazioneId && /^\/manifestazione\/[^/]+\/?$/.test(pathname)) {
    const label = man?.nome?.trim() || manifestazioneId
    return `PMA Manager - ${label} - Dashboard`
  }
  if (pmaIdFromPath && /^\/pma\/[^/]+\/impostazioni\/?$/.test(pathname)) {
    const label = pmaSnap.nome?.trim() || pmaIdFromPath
    return `PMA Manager - ${label} - Impostazioni PMA`
  }
  if (pmaIdFromPath && /^\/pma\/[^/]+\/paziente\/[^/]+\/?/.test(pathname)) {
    return 'PMA Manager - Scheda paziente'
  }
  if (pmaIdFromPath && /^\/pma\/[^/]+\/?$/.test(pathname)) {
    const label = pmaSnap.nome?.trim() || pmaIdFromPath
    return `PMA Manager - ${label}`
  }

  return `PMA Manager - ${pathname}`
}
