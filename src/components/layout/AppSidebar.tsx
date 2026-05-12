import { type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { RankTheme } from '../../theme/rankTheme'
import type { UserProfile, UserRank } from '../../types/userProfile'
import { useManifestazioneDoc } from '../../hooks/useManifestazioneDoc'
import { usePmaDocSnapshot } from '../../hooks/usePmaDocNome'
import { usePmaListForManifestazione } from '../../hooks/usePmaListForManifestazione'
import { parseManifestazioneIdFromPath, parsePmaIdFromPath } from '../../lib/routeScopeFromPath'
import { StethoscopeIcon } from '../icons/StethoscopeIcon'

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

/** Stato attivo — solo icona (rail compatto). */
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
  'flex items-center gap-2.5 rounded-md border-l-4 border-transparent py-2 pl-2 pr-2 text-xs text-slate-700 transition-colors hover:bg-slate-50'

/** Rail: target touch ~40px, barra ~72–80px. */
const NAV_MINI_INACTIVE =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900'

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5L12 3l8 7.5V20a1 1 0 01-1 1h-4.5v-7H9.5v7H5a1 1 0 01-1-1V10.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 21V12.5h6V21"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Impostazioni manifestazione (generali) — sliders, distinto dal PMA. */
function IconSliders({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2.25" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="15" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="3" y1="17" x2="21" y2="17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="11" cy="17" r="2.25" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

/** Dashboard PMA — grafico, distinto da edificio / dashboard manifestazione. */
function IconPmaDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M7 19V11M12 19V7M17 19v-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Impostazioni PMA — chiave, distinto dalle impostazioni manifestazione. */
function IconWrench({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.7 6.3a4 4 0 010 5.65l-7.07 7.07a2.5 2.5 0 01-3.54-3.54l7.07-7.07"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.24 8.76L19 6l2 2-2.76 2.76"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconLayout({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4h7v7H4V4zm9 0h7v4h-7V4zm0 6h7v10h-7V10zM4 13h7v7H4v-7z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function NavItem({
  to,
  end,
  icon,
  label,
  rank,
  indent,
  mini,
  onNavigate,
}: {
  to: string
  end?: boolean
  icon: ReactNode
  label: string
  rank: UserRank
  indent?: boolean
  mini?: boolean
  onNavigate?: () => void
}) {
  if (mini) {
    return (
      <NavLink
        to={to}
        end={end}
        title={label}
        aria-label={label}
        onClick={() => onNavigate?.()}
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
      onClick={() => onNavigate?.()}
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
      <span className="min-w-0 truncate text-xs">{label}</span>
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

export type AppSidebarLayout = 'rail' | 'drawer'

export type AppSidebarProps = {
  user: UserProfile
  theme: RankTheme
  /** `rail`: icone + tooltip (desktop). `drawer`: etichette leggibili (mobile/tablet). */
  layout?: AppSidebarLayout
  onNavigate?: () => void
}

/**
 * Mini-sidebar fissa (~80px): solo icone, tooltip nativi; i dati clinici restano protagonisti.
 * Su viewport piccole usare `layout="drawer"` dentro un pannello a scomparsa.
 */
export function AppSidebar({ user, theme, layout = 'rail', onNavigate }: AppSidebarProps) {
  const { pathname } = useLocation()
  const rank = user.rank
  const isSuperadmin = rank === 'Superadmin'
  const isCentrale = rank === 'Centrale'
  const mini = layout === 'rail'

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
    manifestazioneIdResolved && manActive?.nome ? manActive.nome : manifestazioneIdResolved || null

  const manSeg = manifestazioneIdResolved ? encodeURIComponent(manifestazioneIdResolved) : ''
  const pmaSeg = pmaIdResolved ? encodeURIComponent(pmaIdResolved) : ''
  const pmaNome = pmaSnap.nome ?? pmaIdResolved ?? null

  const showManifestDashboard = isSuperadmin || isCentrale
  const hasManifestazione = Boolean(manifestazioneIdResolved)
  const hasPma = Boolean(pmaIdResolved)

  const { items: pmaList } = usePmaListForManifestazione(
    isCentrale && manifestazioneIdResolved ? manifestazioneIdResolved : undefined,
  )

  const quickPmas = isCentrale ? pmaList.filter((p) => (pmaIdResolved ? p.id !== pmaIdResolved : true)) : []

  const operatoreInitial = (user.nome?.trim()?.charAt(0) || user.email?.trim()?.charAt(0) || '?').toUpperCase()

  const asideWidth = mini ? 'w-20 min-w-[4.5rem] max-w-[5rem]' : 'w-full min-w-0'

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-slate-200 bg-slate-50/90 shadow-sm ${asideWidth}`}
      aria-label="Navigazione principale"
    >
      {mini ? (
        <div className="flex flex-col items-center border-b border-slate-200 py-2">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5 ${RANK_HEADER_ICON[rank]}`}
            title={[manifestazioneNome, pmaNome].filter(Boolean).join(' · ') || 'Contesto operativo'}
          >
            <IconCalendar className="h-3.5 w-3.5" />
          </div>
          <div
            className="mt-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 ring-1 ring-slate-300/80"
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
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto bg-white ${mini ? 'items-center gap-0.5 py-2' : 'gap-0.5 px-2 py-2'}`}
        aria-label="Pagine"
      >
        <NavBlock title="Generale" expanded={!mini}>
          <NavItem
            to="/"
            end
            rank={rank}
            icon={<IconHome />}
            label="Homepage"
            mini={mini}
            onNavigate={onNavigate}
          />
          {isSuperadmin ? (
            <NavItem
              to="/utenti"
              end
              rank={rank}
              icon={<IconUsers className="shrink-0" />}
              label="Gestione utenti"
              mini={mini}
              onNavigate={onNavigate}
            />
          ) : null}
        </NavBlock>

        {hasManifestazione ? (
          <NavBlock
            title="Manifestazione"
            subtitle={manifestazioneNome}
            expanded={!mini}
            showTopDivider={mini}
          >
            {showManifestDashboard ? (
              <NavItem
                to={`/manifestazione/${manSeg}`}
                end
                rank={rank}
                icon={<IconLayout />}
                label="Dashboard manifestazione"
                mini={mini}
                onNavigate={onNavigate}
              />
            ) : null}
            <NavItem
              to={`/manifestazione/${manSeg}/impostazioni`}
              rank={rank}
              icon={<IconSliders />}
              label={rank === 'Triage' ? 'Impostazioni manifestazione (sola lettura)' : 'Impostazioni manifestazione'}
              mini={mini}
              onNavigate={onNavigate}
            />
          </NavBlock>
        ) : null}

        {hasPma ? (
          <NavBlock title="PMA" subtitle={pmaNome ?? pmaIdResolved ?? undefined} expanded={!mini} showTopDivider={mini}>
            <NavItem
              to={`/pma/${pmaSeg}`}
              end
              rank={rank}
              icon={<IconPmaDashboard />}
              label="Dashboard PMA"
              mini={mini}
              onNavigate={onNavigate}
            />
            <NavItem
              to={`/pma/${pmaSeg}/impostazioni`}
              rank={rank}
              icon={<IconWrench />}
              label="Impostazioni PMA"
              mini={mini}
              onNavigate={onNavigate}
            />
          </NavBlock>
        ) : null}

        {isCentrale && quickPmas.length > 0 ? (
          <NavBlock title="Navigazione rapida PMA" subtitle="Stessa manifestazione" expanded={!mini} showTopDivider={mini}>
            {quickPmas.map((p) => (
              <NavItem
                key={p.id}
                to={`/pma/${encodeURIComponent(p.id)}`}
                end
                rank={rank}
                indent={!mini}
                icon={<IconChevronPma className="text-slate-400" />}
                label={p.nome}
                mini={mini}
                onNavigate={onNavigate}
              />
            ))}
          </NavBlock>
        ) : null}
      </nav>
    </aside>
  )
}
