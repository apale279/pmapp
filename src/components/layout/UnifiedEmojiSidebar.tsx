import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import type { UserProfile, UserRank } from '../../types/userProfile'
import { useManifestazioneDoc } from '../../hooks/useManifestazioneDoc'
import { usePmaDocSnapshot } from '../../hooks/usePmaDocNome'
import { SidebarNavIcon } from '../icons/navLogos'
import {
  SidebarDrawerDisabled,
  SidebarDrawerLink,
  SidebarRailDisabled,
  SidebarRailLink,
} from './sidebarNavLinks'

const RAIL_CLASS =
  'sticky top-0 z-20 flex h-screen w-14 shrink-0 flex-col items-center gap-1 border-r border-[#e2e8f0] bg-[#f8fafc] py-3'

function parsePathIds(pathname: string): { manFromUrl: string; pmaFromUrl: string } {
  const man = pathname.match(/^\/manifestazione\/([^/]+)/)
  const pma = pathname.match(/^\/pma\/([^/]+)/)
  return {
    manFromUrl: man ? decodeURIComponent(man[1]) : '',
    pmaFromUrl: pma ? decodeURIComponent(pma[1]) : '',
  }
}

export type UnifiedEmojiSidebarProps = {
  user: UserProfile
  variant: 'rail' | 'drawer'
  onNavigate?: () => void
}

const RANKS_WITH_MANIFEST_EVENTO_SETTINGS: readonly UserRank[] = [
  'Superadmin',
  'Centrale',
  'Medico',
  'Infermiere',
  'Soccorritore',
  'Triage',
]

const RANKS_PMA_DASH: readonly UserRank[] = ['Medico', 'Infermiere', 'Soccorritore', 'Triage']

const RANKS_HIDE_HOME_IN_NAV: readonly UserRank[] = [...RANKS_PMA_DASH]

/**
 * Navigazione globale: contesto da profilo + URL. Superadmin usa `AdminEmojiSidebar`.
 */
export function UnifiedEmojiSidebar({ user, variant, onNavigate }: UnifiedEmojiSidebarProps) {
  const rank = user.rank
  const location = useLocation()

  const { manFromUrl, pmaFromUrl } = useMemo(
    () => parsePathIds(location.pathname),
    [location.pathname],
  )

  const pmaProfile = user.id_pma?.trim() || ''
  const manProfile = user.id_manifestazione?.trim() || ''

  const pmaIdForSnapshot = (pmaFromUrl || pmaProfile).trim() || undefined
  const pmaSnap = usePmaDocSnapshot(pmaIdForSnapshot)

  const effectiveManId = useMemo(() => {
    if (manFromUrl) return manFromUrl
    if (manProfile) return manProfile
    if (pmaIdForSnapshot && pmaSnap.idManifestazione?.trim()) {
      return pmaSnap.idManifestazione.trim()
    }
    return ''
  }, [manFromUrl, manProfile, pmaIdForSnapshot, pmaSnap.idManifestazione])

  const effectivePmaId = (pmaFromUrl || pmaProfile).trim()

  const manSeg = effectiveManId ? encodeURIComponent(effectiveManId) : ''
  const pmaSeg = effectivePmaId ? encodeURIComponent(effectivePmaId) : ''

  const manifestazioneDocId = effectiveManId || undefined
  const { data: manActive } = useManifestazioneDoc(manifestazioneDocId)
  const manifestazioneNome =
    manifestazioneDocId && manActive?.nome ? manActive.nome : manifestazioneDocId || null

  const showDashCentrale = rank === 'Centrale'
  const showElencoUtentiCentrale = rank === 'Centrale'
  const showDashPma = RANKS_PMA_DASH.includes(rank) && Boolean(pmaSeg)
  const showImpEvento = RANKS_WITH_MANIFEST_EVENTO_SETTINGS.includes(rank) && Boolean(manSeg)
  const showHomeNav = !RANKS_HIDE_HOME_IN_NAV.includes(rank)

  const iconHome = <SidebarNavIcon name="home" />
  const iconDashCentrale = <SidebarNavIcon name="dashboardEvento" />
  const iconUtenti = <SidebarNavIcon name="listaUtenti" />
  const iconPma = <SidebarNavIcon name="vistaPma" />
  const iconRubrica = <SidebarNavIcon name="rubrica" />
  const iconFileUtili = <SidebarNavIcon name="fileUtili" />
  const iconImpostazioni = <SidebarNavIcon name="impostazioni" />

  const brandIcon =
    rank === 'Centrale' ? (
      <SidebarNavIcon name="dashboardEvento" />
    ) : RANKS_PMA_DASH.includes(rank) ? (
      <SidebarNavIcon name="vistaPma" />
    ) : (
      <SidebarNavIcon name="home" />
    )

  if (variant === 'rail') {
    return (
      <aside className={RAIL_CLASS} aria-label="Navigazione principale">
        <div
          className="mb-1 flex h-10 w-10 items-center justify-center"
          title={`${user.nome} · ${rank}`}
        >
          {brandIcon}
        </div>

        {showHomeNav ? (
          <SidebarRailLink to="/" end title="Home" icon={iconHome} theme="operative" onNavigate={onNavigate} />
        ) : null}

        {showDashCentrale && manSeg ? (
          <SidebarRailLink
            to={`/manifestazione/${manSeg}`}
            end
            title="Dashboard centrale"
            icon={iconDashCentrale}
            theme="operative"
            onNavigate={onNavigate}
          />
        ) : showDashCentrale ? (
          <SidebarRailDisabled
            title="Dashboard centrale (apri una manifestazione dalla Home)"
            icon={iconDashCentrale}
            theme="operative"
          />
        ) : null}

        {showElencoUtentiCentrale ? (
          <SidebarRailLink
            to="/admin/utenti"
            title="Elenco utenti"
            icon={iconUtenti}
            theme="operative"
            onNavigate={onNavigate}
          />
        ) : null}

        {showDashPma ? (
          <SidebarRailLink
            to={`/pma/${pmaSeg}`}
            end
            title="Dashboard PMA"
            icon={iconPma}
            theme="operative"
            onNavigate={onNavigate}
          />
        ) : RANKS_PMA_DASH.includes(rank) ? (
          <SidebarRailDisabled
            title="Dashboard PMA (nessun PMA nel contesto: profilo o URL /pma/…)"
            icon={iconPma}
            theme="operative"
          />
        ) : null}

        {showImpEvento ? (
          <SidebarRailLink
            to={`/manifestazione/${manSeg}/rubrica`}
            title="Rubrica"
            icon={iconRubrica}
            theme="operative"
            onNavigate={onNavigate}
          />
        ) : RANKS_WITH_MANIFEST_EVENTO_SETTINGS.includes(rank) ? (
          <SidebarRailDisabled
            title="Rubrica (nessuna manifestazione nel contesto)"
            icon={iconRubrica}
            theme="operative"
          />
        ) : null}

        {showImpEvento ? (
          <SidebarRailLink
            to={`/manifestazione/${manSeg}/file-utili`}
            title="File utili"
            icon={iconFileUtili}
            theme="operative"
            onNavigate={onNavigate}
          />
        ) : RANKS_WITH_MANIFEST_EVENTO_SETTINGS.includes(rank) ? (
          <SidebarRailDisabled
            title="File utili (nessuna manifestazione nel contesto)"
            icon={iconFileUtili}
            theme="operative"
          />
        ) : null}

        {showImpEvento ? (
          <SidebarRailLink
            to={`/manifestazione/${manSeg}/impostazioni`}
            title="Impostazioni evento"
            icon={iconImpostazioni}
            theme="operative"
            onNavigate={onNavigate}
          />
        ) : RANKS_WITH_MANIFEST_EVENTO_SETTINGS.includes(rank) ? (
          <SidebarRailDisabled
            title="Impostazioni evento (nessuna manifestazione nel contesto)"
            icon={iconImpostazioni}
            theme="operative"
          />
        ) : null}
      </aside>
    )
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-[#e2e8f0] bg-white" aria-label="Navigazione">
      <div className="border-b border-[#e2e8f0] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Operatore</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user.nome}</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Manifestazione</p>
        <p className="mt-1 truncate text-sm text-slate-900" title={manifestazioneNome ?? undefined}>
          {manifestazioneNome ?? '—'}
        </p>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
        {showHomeNav ? (
          <SidebarDrawerLink to="/" end label="Home" icon={iconHome} theme="operative" onNavigate={onNavigate} />
        ) : null}
        {showDashCentrale && manSeg ? (
          <SidebarDrawerLink
            to={`/manifestazione/${manSeg}`}
            end
            label="Dashboard centrale"
            icon={iconDashCentrale}
            theme="operative"
            onNavigate={onNavigate}
          />
        ) : showDashCentrale ? (
          <SidebarDrawerDisabled label="Dashboard centrale" icon={iconDashCentrale} />
        ) : null}
        {showElencoUtentiCentrale ? (
          <SidebarDrawerLink
            to="/admin/utenti"
            label="Elenco utenti"
            icon={iconUtenti}
            theme="operative"
            onNavigate={onNavigate}
          />
        ) : null}
        {showDashPma ? (
          <SidebarDrawerLink
            to={`/pma/${pmaSeg}`}
            end
            label="Dashboard PMA"
            icon={iconPma}
            theme="operative"
            onNavigate={onNavigate}
          />
        ) : RANKS_PMA_DASH.includes(rank) ? (
          <SidebarDrawerDisabled label="Dashboard PMA" icon={iconPma} />
        ) : null}
        {showImpEvento ? (
          <SidebarDrawerLink
            to={`/manifestazione/${manSeg}/rubrica`}
            label="Rubrica"
            icon={iconRubrica}
            theme="operative"
            onNavigate={onNavigate}
          />
        ) : RANKS_WITH_MANIFEST_EVENTO_SETTINGS.includes(rank) ? (
          <SidebarDrawerDisabled label="Rubrica" icon={iconRubrica} />
        ) : null}
        {showImpEvento ? (
          <SidebarDrawerLink
            to={`/manifestazione/${manSeg}/file-utili`}
            label="File utili"
            icon={iconFileUtili}
            theme="operative"
            onNavigate={onNavigate}
          />
        ) : RANKS_WITH_MANIFEST_EVENTO_SETTINGS.includes(rank) ? (
          <SidebarDrawerDisabled label="File utili" icon={iconFileUtili} />
        ) : null}
        {showImpEvento ? (
          <SidebarDrawerLink
            to={`/manifestazione/${manSeg}/impostazioni`}
            label="Impostazioni evento"
            icon={iconImpostazioni}
            theme="operative"
            onNavigate={onNavigate}
          />
        ) : RANKS_WITH_MANIFEST_EVENTO_SETTINGS.includes(rank) ? (
          <SidebarDrawerDisabled label="Impostazioni evento" icon={iconImpostazioni} />
        ) : null}
      </nav>
    </aside>
  )
}
