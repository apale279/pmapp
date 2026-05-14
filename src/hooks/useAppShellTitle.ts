import { useLocation } from 'react-router-dom'
import { useManifestazioneDoc } from './useManifestazioneDoc'
import { usePmaDocSnapshot } from './usePmaDocNome'
import { parseManifestazioneIdFromPath, parsePmaIdFromPath } from '../lib/routeScopeFromPath'

/** Titolo breve per l’header globale (stampatello, senza nome app). */
export function useAppShellTitle(): string {
  const { pathname } = useLocation()
  const manifestazioneId = parseManifestazioneIdFromPath(pathname)
  const pmaIdFromPath = parsePmaIdFromPath(pathname)
  const { data: man } = useManifestazioneDoc(manifestazioneId)
  const pmaSnap = usePmaDocSnapshot(pmaIdFromPath)

  if (pathname === '/' || pathname === '') {
    return 'HOME'
  }
  if (pathname === '/admin' || pathname === '/admin/') {
    return 'DASHBOARD ADMIN'
  }
  if (pathname.startsWith('/admin/manifestazioni')) {
    return 'MANIFESTAZIONI (ADMIN)'
  }
  if (pathname.startsWith('/admin/pma')) {
    return 'PMA GLOBALI (ADMIN)'
  }
  if (pathname.startsWith('/admin/utenti')) {
    return 'GESTIONE UTENTI (ADMIN)'
  }
  if (pathname.startsWith('/admin/pazienti')) {
    return 'PAZIENTI GLOBALI (ADMIN)'
  }
  if (pathname.startsWith('/utenti')) {
    return 'GESTIONE UTENTI'
  }
  if (manifestazioneId && /^\/manifestazione\/[^/]+\/impostazioni\/?$/.test(pathname)) {
    const label = man?.nome?.trim() || manifestazioneId
    return `IMPOSTAZIONI · ${label.toUpperCase()}`
  }
  if (manifestazioneId && /^\/manifestazione\/[^/]+\/rubrica\/?$/.test(pathname)) {
    return 'RUBRICA'
  }
  if (manifestazioneId && /^\/manifestazione\/[^/]+\/file-utili\/?$/.test(pathname)) {
    return 'FILE UTILI'
  }
  if (manifestazioneId && /^\/manifestazione\/[^/]+\/?$/.test(pathname)) {
    const label = man?.nome?.trim() || manifestazioneId
    return `DASHBOARD · ${label.toUpperCase()}`
  }
  if (pmaIdFromPath && /^\/pma\/[^/]+\/paziente\/[^/]+\/?/.test(pathname)) {
    return 'SCHEDA PAZIENTE'
  }
  if (pmaIdFromPath && /^\/pma\/[^/]+\/?$/.test(pathname)) {
    const label = pmaSnap.nome?.trim() || pmaIdFromPath
    return label.toUpperCase()
  }

  return pathname.replace(/^\//, '').toUpperCase() || 'PMAPP'
}
