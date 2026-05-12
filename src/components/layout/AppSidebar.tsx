import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { RankTheme } from '../../theme/rankTheme'
import type { UserProfile, UserRank } from '../../types/userProfile'
import { useManifestazioneDoc } from '../../hooks/useManifestazioneDoc'
import { usePmaDocSnapshot } from '../../hooks/usePmaDocNome'
import { usePmaListForManifestazione } from '../../hooks/usePmaListForManifestazione'
import { parseManifestazioneIdFromPath, parsePmaIdFromPath } from '../../lib/routeScopeFromPath'
import { StethoscopeIcon } from '../icons/StethoscopeIcon'

const SIDEBAR_EXPANDED_KEY = 'pmaapp.sidebar.expanded'

const RANK_NAV_ACTIVE: Record<UserRank, string> = {
  Superadmin:
    'border-l-4 border-l-slate-900 bg-slate-100 font-medium text-slate-900 shadow-sm ring-1 ring-slate-900/10',
  Centrale:
    'border-l-4 border-l-blue-700 bg-blue-50 font-medium text-blue-950 shadow-sm ring-1 ring-blue-700/10',
  Medico:
    'border-l-4 border-l-red-700 bg-red-50 font-medium text-red-950 shadow-sm ring-1 ring-red-700/10',
  Infermiere:
    'border-l-4 border-l-emerald-600 bg-emerald-50 font-medium text-emerald-950 shadow-sm ring-1 ring-emerald-600/10',
  Soccorritore:
    'border-l-4 border-l-amber-500 bg-amber-50 font-medium text-amber-950 shadow-sm ring-1 ring-amber-500/15',
  Triage:
    'border-l-4 border-l-purple-600 bg-purple-50 font-medium text-purple-950 shadow-sm ring-1 ring-purple-600/10',
}

/** Stato attivo — solo icona (mini). */
const RANK_NAV_ACTIVE_MINI: Record<UserRank, string> = {
  Superadmin: 'bg-slate-200 text-slate-900 shadow-inner ring-1 ring-slate-400/40',
  Centrale: 'bg-blue-100 text-blue-950 ring-1 ring-blue-500/45',
  Medico: 'bg-red-100 text-red-950 ring-1 ring-red-500/45',
  Infermiere: 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-500/45',
  Soccorritore: 'bg-amber-100 text-amber-950 ring-1 ring-amber-500/45',
  Triage: 'bg-purple-100 text-purple-950 ring-1 ring-purple-500/45',
}

const RANK_HEADER_ICON: Record<UserRank, string> = {
  Superadmin: 'text-slate-700',
  Centrale: 'text-blue-700',
  Medico: 'text-red-700',
  Infermiere: 'text-emerald-600',
  Soccorritore: 'text-amber-600',
  Triage: 'text-purple-600',
}

const NAV_INACTIVE =
  'flex items-center gap-2.5 rounded-md border-l-4 border-transparent py-2 pl-2 pr-2 text-sm text-slate-700 transition-colors hover:bg-slate-50'

const NAV_MINI_INACTIVE =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900'

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconLayout({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4h7v7H4V4zm9 0h7v4h-7V4zm0 6h7v10h-7V10zM4 13h7v7H4v-7z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82 1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 21V8l8-4 8 4v13M9 21v-6h6v6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm12 1v6m-3-3h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconChevronPma({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 18l6-6-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPanelToggle({ expanded, className }: { expanded: boolean; className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      {expanded ? (
        <path
          d="M11 19l-7-7 7-7M18 19l-7-7 7-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M13 5l7 7-7 7M6 5l7 7-7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

function NavItem({
  to,
  end,
  icon,
  label,
  rank,
  indent,
  mini,
}: {
  to: string
  end?: boolean
  icon: ReactNode
  label: string
  rank: UserRank
  indent?: boolean
  mini?: boolean
}) {
  if (mini) {
    return (
      <NavLink
        to={to}
        end={end}
        title={label}
        aria-label={label}
        className={({ isActive }) =>
          [NAV_MINI_INACTIVE, isActive ? RANK_NAV_ACTIVE_MINI[rank] : ''].filter(Boolean).join(' ')
        }
      >
        {icon}
      </NavLink>
    )
  }

  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) =>
        [
          NAV_INACTIVE,
          indent ? 'ml-2 border-l border-slate-200 pl-3' : '',
          isActive ? RANK_NAV_ACTIVE[rank] : '',
        ]
          .filter(Boolean)
          .join(' ')
      }
    >
      <span className="shrink-0 opacity-90">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </NavLink>
  )
}

function NavBlock({
  title,
  subtitle,
  children,
  expanded,
  showTopDivider,
}: {
  title: string
  subtitle?: string | null
  children: ReactNode
  expanded: boolean
  /** Separatore visivo tra gruppi in modalità mini. */
  showTopDivider?: boolean
}) {
  if (!expanded) {
    return (
      <div className="flex flex-col items-center gap-0.5 py-0.5" role="group" aria-label={title}>
        {showTopDivider ? <div className="my-1 h-px w-8 bg-slate-200" aria-hidden /> : null}
        <span className="sr-only">{title}</span>
        {children}
      </div>
    )
  }

  return (
    <div className="mt-1 border-t border-slate-100 pt-2 first:mt-0 first:border-t-0 first:pt-0">
      <p className="px-2 pb-0.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</p>
      {subtitle ? (
        <p className="mb-1 truncate px-2 text-[11px] font-medium text-slate-500" title={subtitle ?? undefined}>
          {subtitle}
        </p>
      ) : null}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

export type AppSidebarProps = {
  user: UserProfile
  theme: RankTheme
}

/**
 * Sidebar gerarchica con modalità **mini** (icone + tooltip) di default per massimizzare l’area dati.
 * Espansione opzionale (persistita in `localStorage`).
 */
export function AppSidebar({ user, theme }: AppSidebarProps) {
  const { pathname } = useLocation()
  const rank = user.rank
  const isSuperadmin = rank === 'Superadmin'
  const isCentrale = rank === 'Centrale'

  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_EXPANDED_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_EXPANDED_KEY, expanded ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [expanded])

  const pmaIdFromPath = parsePmaIdFromPath(pathname)
  const pmaIdResolved = pmaIdFromPath ?? user.id_pma?.trim() ?? undefined
  const pmaSnap = usePmaDocSnapshot(pmaIdResolved)

  const manifestazioneIdResolved =
    parseManifestazioneIdFromPath(pathname) ??
    user.id_manifestazione?.trim() ??
    pmaSnap.idManifestazione?.trim() ??
    undefined

  const { data: manActive } = useManifestazioneDoc(manifestazioneIdResolved)
  const manifestazioneNome =
    manifestazioneIdResolved && manActive?.nome
      ? manActive.nome
      : manifestazioneIdResolved || null

  const manSeg = manifestazioneIdResolved ? encodeURIComponent(manifestazioneIdResolved) : ''
  const pmaSeg = pmaIdResolved ? encodeURIComponent(pmaIdResolved) : ''
  const pmaNome = pmaSnap.nome ?? pmaIdResolved ?? null

  const showManifestDashboard = isSuperadmin || isCentrale
  const hasManifestazione = Boolean(manifestazioneIdResolved)
  const hasPma = Boolean(pmaIdResolved)

  const { items: pmaList } = usePmaListForManifestazione(
    isCentrale && manifestazioneIdResolved ? manifestazioneIdResolved : undefined,
  )

  const quickPmas = isCentrale
    ? pmaList.filter((p) => (pmaIdResolved ? p.id !== pmaIdResolved : true))
    : []

  const operatoreInitial = (user.nome?.trim()?.charAt(0) || user.email?.trim()?.charAt(0) || '?').toUpperCase()

  const asideWidth = expanded ? 'w-[17rem]' : 'w-14'

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-slate-200 bg-slate-50/90 shadow-sm transition-[width] duration-200 ease-out ${asideWidth}`}
      aria-label="Navigazione principale"
    >
      {!expanded ? (
        <div className="flex flex-col items-center border-b border-slate-200 py-2">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5 ${RANK_HEADER_ICON[rank]}`}
            title={[manifestazioneNome, pmaNome].filter(Boolean).join(' · ') || 'Contesto operativo'}
          >
            <IconCalendar className="h-4 w-4" />
          </div>
          <div
            className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 ring-1 ring-slate-300/80"
            title={`${user.nome} · ${rank}`}
          >
            {operatoreInitial}
          </div>
        </div>
      ) : (
        <div className={`border-b ${theme.headerBorder} ${theme.headerBg} px-3 py-3`}>
          <div className="flex items-start gap-2">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/90 shadow-sm ring-1 ring-black/5 ${RANK_HEADER_ICON[rank]}`}
            >
              <IconCalendar className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-400`}>
                Manifestazione
              </div>
              <div className={`mt-0.5 truncate text-xs font-semibold leading-snug ${theme.headerText}`}>
                {manifestazioneNome ?? '—'}
              </div>
            </div>
          </div>
          <div className={`mt-3 border-t pt-2 ${theme.bannerDivider}`}>
            <div className={`text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-400`}>Operatore</div>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              {rank === 'Medico' ? <StethoscopeIcon /> : null}
              <span className={`min-w-0 truncate text-xs font-medium ${theme.headerText}`}>{user.nome}</span>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${theme.rankBadge}`}
              >
                {rank}
              </span>
            </div>
          </div>
        </div>
      )}

      <nav
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto bg-white ${expanded ? 'gap-0.5 px-2 py-2' : 'items-center gap-0.5 py-2'}`}
        aria-label="Pagine"
      >
        <NavBlock title="Generale" expanded={expanded}>
          <NavItem to="/" end rank={rank} icon={<IconHome />} label="Homepage" mini={!expanded} />
          {isSuperadmin ? (
            <NavItem
              to="/utenti"
              end
              rank={rank}
              icon={<IconUsers className="shrink-0" />}
              label="Gestione utenti"
              mini={!expanded}
            />
          ) : null}
        </NavBlock>

        {hasManifestazione ? (
          <NavBlock
            title="Manifestazione"
            subtitle={manifestazioneNome}
            expanded={expanded}
            showTopDivider={!expanded}
          >
            {showManifestDashboard ? (
              <NavItem
                to={`/manifestazione/${manSeg}`}
                end
                rank={rank}
                icon={<IconLayout />}
                label="Dashboard manifestazione"
                mini={!expanded}
              />
            ) : null}
            <NavItem
              to={`/manifestazione/${manSeg}/impostazioni`}
              rank={rank}
              icon={<IconSettings />}
              label={rank === 'Triage' ? 'Impostazioni manifestazione (sola lettura)' : 'Impostazioni manifestazione'}
              mini={!expanded}
            />
          </NavBlock>
        ) : null}

        {hasPma ? (
          <NavBlock title="PMA" subtitle={pmaNome ?? pmaIdResolved ?? undefined} expanded={expanded} showTopDivider={!expanded}>
            <NavItem
              to={`/pma/${pmaSeg}`}
              end
              rank={rank}
              icon={<IconBuilding />}
              label="Dashboard PMA"
              mini={!expanded}
            />
            <NavItem
              to={`/pma/${pmaSeg}/impostazioni`}
              rank={rank}
              icon={<IconSettings />}
              label="Impostazioni PMA"
              mini={!expanded}
            />
          </NavBlock>
        ) : null}

        {isCentrale && quickPmas.length > 0 ? (
          <NavBlock title="Navigazione rapida PMA" subtitle="Stessa manifestazione" expanded={expanded} showTopDivider={!expanded}>
            {quickPmas.map((p) => (
              <NavItem
                key={p.id}
                to={`/pma/${encodeURIComponent(p.id)}`}
                end
                rank={rank}
                indent={expanded}
                icon={<IconChevronPma className="text-slate-400" />}
                label={p.nome}
                mini={!expanded}
              />
            ))}
          </NavBlock>
        ) : null}
      </nav>

      <div className="border-t border-slate-200 bg-slate-50 p-1.5">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-800"
          title={expanded ? 'Comprimi menu (icone)' : 'Espandi menu (etichette)'}
          aria-expanded={expanded}
        >
          <IconPanelToggle expanded={expanded} className="shrink-0" />
          {expanded ? <span className="text-[10px] font-semibold uppercase tracking-wide">Comprimi</span> : null}
        </button>
      </div>
    </aside>
  )
}
