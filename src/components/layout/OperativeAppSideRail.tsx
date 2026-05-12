import { type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { UserProfile, UserRank } from '../../types/userProfile'
import { useManifestazioneDoc } from '../../hooks/useManifestazioneDoc'
import { usePmaDocSnapshot } from '../../hooks/usePmaDocNome'
import { usePmaListForManifestazione } from '../../hooks/usePmaListForManifestazione'
import { parseManifestazioneIdFromPath, parsePmaIdFromPath } from '../../lib/routeScopeFromPath'
import {
  IconChevronPma,
  IconHome,
  IconLayout,
  IconSliders,
  IconUsers,
  IconWrench,
} from './ManagerSvgIcons'
import { opNavBtn, opNavBtnActive } from './operativeTokens'

function NavRowRail({
  to,
  end,
  title,
  label,
  children,
}: {
  to: string
  end?: boolean
  title: string
  label: string
  children: ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={title}
      aria-label={label}
      className={({ isActive }) => (isActive ? opNavBtnActive : opNavBtn)}
    >
      {children}
    </NavLink>
  )
}

function NavRowDrawer({
  to,
  end,
  label,
  icon,
  onNavigate,
}: {
  to: string
  end?: boolean
  label: string
  icon: ReactNode
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
          isActive ? 'bg-slate-100 font-semibold text-[#2563eb]' : 'text-[#111827] hover:bg-slate-50',
        ].join(' ')
      }
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-600">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </NavLink>
  )
}

function BlockTitle({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 first:pt-0">
      {children}
    </p>
  )
}

export type OperativeAppSideRailProps = {
  user: UserProfile
  variant: 'rail' | 'drawer'
  onNavigate?: () => void
}

export function OperativeAppSideRail({ user, variant, onNavigate }: OperativeAppSideRailProps) {
  const { pathname } = useLocation()
  const rank: UserRank = user.rank
  const isSuperadmin = rank === 'Superadmin'
  const isCentrale = rank === 'Centrale'
  const mini = variant === 'rail'

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

  if (mini) {
    return (
      <aside
        className="sticky top-0 z-20 flex h-screen w-16 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-[#f8fafc] py-3"
        aria-label="Navigazione principale"
      >
        <div
          className="mb-1 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-600"
          title={`${user.nome} · ${rank}`}
        >
          {operatoreInitial}
        </div>

        <NavRowRail to="/" end title="Home" label="Home">
          <IconHome className="h-[22px] w-[22px]" />
        </NavRowRail>
        {isSuperadmin ? (
          <NavRowRail to="/utenti" end title="Gestione utenti" label="Gestione utenti">
            <IconUsers className="h-[22px] w-[22px]" />
          </NavRowRail>
        ) : null}

        {hasManifestazione ? (
          <>
            <div className="my-1 h-px w-8 bg-slate-200" aria-hidden />
            {showManifestDashboard ? (
              <NavRowRail
                to={`/manifestazione/${manSeg}`}
                end
                title="Dashboard manifestazione"
                label="Dashboard manifestazione"
              >
                <IconLayout className="h-[22px] w-[22px]" />
              </NavRowRail>
            ) : null}
            <NavRowRail
              to={`/manifestazione/${manSeg}/impostazioni`}
              title="Impostazioni manifestazione"
              label="Impostazioni manifestazione"
            >
              <IconSliders className="h-[22px] w-[22px]" />
            </NavRowRail>
          </>
        ) : null}

        {hasPma ? (
          <>
            <div className="my-1 h-px w-8 bg-slate-200" aria-hidden />
            <NavRowRail to={`/pma/${pmaSeg}`} end title="Dashboard PMA" label="Dashboard PMA">
              <IconLayout className="h-[22px] w-[22px]" />
            </NavRowRail>
            <NavRowRail to={`/pma/${pmaSeg}/impostazioni`} title="Impostazioni PMA" label="Impostazioni PMA">
              <IconWrench className="h-[22px] w-[22px]" />
            </NavRowRail>
          </>
        ) : null}

        {isCentrale && quickPmas.length > 0 ? (
          <>
            <div className="my-1 h-px w-8 bg-slate-200" aria-hidden />
            {quickPmas.map((p) => (
              <NavRowRail
                key={p.id}
                to={`/pma/${encodeURIComponent(p.id)}`}
                end
                title={p.nome}
                label={p.nome}
              >
                <IconChevronPma className="h-[18px] w-[18px] text-slate-500" />
              </NavRowRail>
            ))}
          </>
        ) : null}
      </aside>
    )
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-slate-200 bg-white" aria-label="Navigazione">
      <div className="border-b border-slate-200 px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Contesto</p>
        <p className="mt-1 truncate text-sm font-semibold text-[#111827]" title={manifestazioneNome ?? undefined}>
          {manifestazioneNome ?? '—'}
        </p>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">PMA</p>
        <p className="mt-1 truncate text-sm font-semibold text-[#111827]" title={pmaNome ?? undefined}>
          {pmaNome ?? '—'}
        </p>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <BlockTitle>Generale</BlockTitle>
        <NavRowDrawer to="/" end label="Home" icon={<IconHome className="h-5 w-5" />} onNavigate={onNavigate} />
        {isSuperadmin ? (
          <NavRowDrawer
            to="/utenti"
            end
            label="Gestione utenti"
            icon={<IconUsers className="h-5 w-5" />}
            onNavigate={onNavigate}
          />
        ) : null}

        {hasManifestazione ? (
          <>
            <BlockTitle>Manifestazione</BlockTitle>
            {showManifestDashboard ? (
              <NavRowDrawer
                to={`/manifestazione/${manSeg}`}
                end
                label="Dashboard manifestazione"
                icon={<IconLayout className="h-5 w-5" />}
                onNavigate={onNavigate}
              />
            ) : null}
            <NavRowDrawer
              to={`/manifestazione/${manSeg}/impostazioni`}
              label="Impostazioni manifestazione"
              icon={<IconSliders className="h-5 w-5" />}
              onNavigate={onNavigate}
            />
          </>
        ) : null}

        {hasPma ? (
          <>
            <BlockTitle>PMA</BlockTitle>
            <NavRowDrawer
              to={`/pma/${pmaSeg}`}
              end
              label="Dashboard PMA"
              icon={<IconLayout className="h-5 w-5" />}
              onNavigate={onNavigate}
            />
            <NavRowDrawer
              to={`/pma/${pmaSeg}/impostazioni`}
              label="Impostazioni PMA"
              icon={<IconWrench className="h-5 w-5" />}
              onNavigate={onNavigate}
            />
          </>
        ) : null}

        {isCentrale && quickPmas.length > 0 ? (
          <>
            <BlockTitle>Navigazione rapida PMA</BlockTitle>
            {quickPmas.map((p) => (
              <NavRowDrawer
                key={p.id}
                to={`/pma/${encodeURIComponent(p.id)}`}
                end
                label={p.nome}
                icon={<IconChevronPma className="h-5 w-5 text-slate-500" />}
                onNavigate={onNavigate}
              />
            ))}
          </>
        ) : null}
      </nav>
    </aside>
  )
}
