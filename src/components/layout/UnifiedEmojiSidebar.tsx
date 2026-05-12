import { NavLink, useLocation } from 'react-router-dom'
import type { UserProfile } from '../../types/userProfile'
import { useManifestazioneDoc } from '../../hooks/useManifestazioneDoc'
import { usePmaDocSnapshot } from '../../hooks/usePmaDocNome'
import { parseManifestazioneIdFromPath, parsePmaIdFromPath } from '../../lib/routeScopeFromPath'

const RAIL_CLASS =
  'sticky top-0 z-20 flex h-screen w-20 shrink-0 flex-col items-center gap-1 border-r border-[#e2e8f0] bg-[#f8fafc] py-3'

const EMOJI_BTN =
  'flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-[1.45rem] leading-none text-slate-600 transition-colors hover:bg-white hover:text-[#2563eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]'

const EMOJI_BTN_ACTIVE =
  'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white text-[#2563eb] shadow-[inset_3px_0_0_0_#2563eb]'

function RailLink({
  to,
  end,
  title,
  emoji,
  onNavigate,
}: {
  to: string
  end?: boolean
  title: string
  emoji: string
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={title}
      aria-label={title}
      onClick={() => onNavigate?.()}
      className={({ isActive }) => (isActive ? EMOJI_BTN_ACTIVE : EMOJI_BTN)}
    >
      <span aria-hidden>{emoji}</span>
    </NavLink>
  )
}

function RailDisabled({ title, emoji }: { title: string; emoji: string }) {
  return (
    <span className={`${EMOJI_BTN} cursor-not-allowed opacity-35`} title={title} aria-hidden>
      {emoji}
    </span>
  )
}

function DrawerLink({
  to,
  end,
  label,
  emoji,
  onNavigate,
}: {
  to: string
  end?: boolean
  label: string
  emoji: string
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors',
          isActive ? 'bg-slate-100 text-[#2563eb]' : 'text-slate-900 hover:bg-slate-50',
        ].join(' ')
      }
    >
      <span className="text-xl leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </NavLink>
  )
}

function DrawerDisabled({ label, emoji }: { label: string; emoji: string }) {
  return (
    <div className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-400 opacity-50">
      <span className="text-xl leading-none" aria-hidden>
        {emoji}
      </span>
      <span>{label}</span>
    </div>
  )
}

export type UnifiedEmojiSidebarProps = {
  user: UserProfile
  variant: 'rail' | 'drawer'
  onNavigate?: () => void
}

export function UnifiedEmojiSidebar({ user, variant, onNavigate }: UnifiedEmojiSidebarProps) {
  const { pathname } = useLocation()
  const rank = user.rank

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

  const showDashCentrale = rank === 'Superadmin' || rank === 'Centrale'
  const showDashPma =
    (rank === 'Superadmin' || rank === 'Medico' || rank === 'Infermiere' || rank === 'Triage') &&
    Boolean(pmaSeg)
  const showImpPma =
    (rank === 'Superadmin' ||
      rank === 'Centrale' ||
      rank === 'Medico' ||
      rank === 'Infermiere' ||
      rank === 'Triage') &&
    Boolean(pmaSeg)
  const showImpEvento = rank === 'Superadmin' && Boolean(manSeg)

  const operatoreInitial = (user.nome?.trim()?.charAt(0) || user.email?.trim()?.charAt(0) || '?').toUpperCase()

  if (variant === 'rail') {
    return (
      <aside className={RAIL_CLASS} aria-label="Navigazione principale">
        <div
          className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-[10px] font-bold text-slate-600"
          title={`${user.nome} · ${rank}`}
        >
          {operatoreInitial}
        </div>

        <RailLink to="/" end title="Home" emoji="🏠" onNavigate={onNavigate} />

        {showDashCentrale && manSeg ? (
          <RailLink
            to={`/manifestazione/${manSeg}`}
            end
            title="Dashboard centrale"
            emoji="🖥️"
            onNavigate={onNavigate}
          />
        ) : showDashCentrale ? (
          <RailDisabled title="Dashboard centrale (manifestazione non disponibile)" emoji="🖥️" />
        ) : null}

        {showDashPma ? (
          <RailLink to={`/pma/${pmaSeg}`} end title="Dashboard PMA" emoji="🏥" onNavigate={onNavigate} />
        ) : rank === 'Superadmin' || rank === 'Medico' || rank === 'Infermiere' || rank === 'Triage' ? (
          <RailDisabled title="Dashboard PMA (PMA non disponibile)" emoji="🏥" />
        ) : null}

        {showImpPma ? (
          <RailLink
            to={`/pma/${pmaSeg}/impostazioni`}
            title="Impostazioni PMA"
            emoji="⛺"
            onNavigate={onNavigate}
          />
        ) : rank === 'Superadmin' ||
          rank === 'Centrale' ||
          rank === 'Medico' ||
          rank === 'Infermiere' ||
          rank === 'Triage' ? (
          <RailDisabled title="Impostazioni PMA (PMA non disponibile)" emoji="⛺" />
        ) : null}

        {showImpEvento ? (
          <RailLink
            to={`/manifestazione/${manSeg}/impostazioni`}
            title="Impostazioni evento"
            emoji="🏟️"
            onNavigate={onNavigate}
          />
        ) : rank === 'Superadmin' ? (
          <RailDisabled title="Impostazioni evento (manifestazione non disponibile)" emoji="🏟️" />
        ) : null}
      </aside>
    )
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-[#e2e8f0] bg-white" aria-label="Navigazione">
      <div className="border-b border-[#e2e8f0] px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Operatore</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user.nome}</p>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Manifestazione</p>
        <p className="mt-1 truncate text-sm text-slate-900" title={manifestazioneNome ?? undefined}>
          {manifestazioneNome ?? '—'}
        </p>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
        <DrawerLink to="/" end label="Home" emoji="🏠" onNavigate={onNavigate} />
        {showDashCentrale && manSeg ? (
          <DrawerLink
            to={`/manifestazione/${manSeg}`}
            end
            label="Dashboard centrale"
            emoji="🖥️"
            onNavigate={onNavigate}
          />
        ) : showDashCentrale ? (
          <DrawerDisabled label="Dashboard centrale" emoji="🖥️" />
        ) : null}
        {showDashPma ? (
          <DrawerLink to={`/pma/${pmaSeg}`} end label="Dashboard PMA" emoji="🏥" onNavigate={onNavigate} />
        ) : rank === 'Superadmin' || rank === 'Medico' || rank === 'Infermiere' || rank === 'Triage' ? (
          <DrawerDisabled label="Dashboard PMA" emoji="🏥" />
        ) : null}
        {showImpPma ? (
          <DrawerLink
            to={`/pma/${pmaSeg}/impostazioni`}
            label="Impostazioni PMA"
            emoji="⛺"
            onNavigate={onNavigate}
          />
        ) : rank === 'Superadmin' ||
          rank === 'Centrale' ||
          rank === 'Medico' ||
          rank === 'Infermiere' ||
          rank === 'Triage' ? (
          <DrawerDisabled label="Impostazioni PMA" emoji="⛺" />
        ) : null}
        {showImpEvento ? (
          <DrawerLink
            to={`/manifestazione/${manSeg}/impostazioni`}
            label="Impostazioni evento"
            emoji="🏟️"
            onNavigate={onNavigate}
          />
        ) : rank === 'Superadmin' ? (
          <DrawerDisabled label="Impostazioni evento" emoji="🏟️" />
        ) : null}
      </nav>
    </aside>
  )
}
