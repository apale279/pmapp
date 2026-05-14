import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { UserProfile, UserRank } from '../../types/userProfile'
import { useManifestazioneDoc } from '../../hooks/useManifestazioneDoc'
import { usePmaDocSnapshot } from '../../hooks/usePmaDocNome'

const RAIL_CLASS =
  'sticky top-0 z-20 flex h-screen w-14 shrink-0 flex-col items-center gap-1 border-r border-[#e2e8f0] bg-[#f8fafc] py-3'

const EMOJI_BTN =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl leading-none text-slate-600 transition-colors hover:bg-white hover:text-[#2563eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]'

const EMOJI_BTN_ACTIVE =
  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-[#2563eb] shadow-[inset_3px_0_0_0_#2563eb]'

function parsePathIds(pathname: string): { manFromUrl: string; pmaFromUrl: string } {
  const man = pathname.match(/^\/manifestazione\/([^/]+)/)
  const pma = pathname.match(/^\/pma\/([^/]+)/)
  return {
    manFromUrl: man ? decodeURIComponent(man[1]) : '',
    pmaFromUrl: pma ? decodeURIComponent(pma[1]) : '',
  }
}

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

const RANKS_WITH_MANIFEST_EVENTO_SETTINGS: readonly UserRank[] = [
  'Superadmin',
  'Centrale',
  'Medico',
  'Infermiere',
  'Soccorritore',
  'Triage',
]

const RANKS_PMA_DASH: readonly UserRank[] = [
  'Medico',
  'Infermiere',
  'Soccorritore',
  'Triage',
]

/** Staff su singolo PMA: niente voce Home (evita confusione; login → dashboard PMA). */
const RANKS_HIDE_HOME_IN_NAV: readonly UserRank[] = [...RANKS_PMA_DASH]

/**
 * Navigazione globale: contesto da **profilo** (`id_pma`, `id_manifestazione`) integrato con la **URL**
 * corrente (`/manifestazione/...`, `/pma/...`). Il Superadmin usa `AdminEmojiSidebar` nell'app shell.
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

  const operatoreInitial = (user.nome?.trim()?.charAt(0) || user.email?.trim()?.charAt(0) || '?').toUpperCase()

  if (variant === 'rail') {
    return (
      <aside className={RAIL_CLASS} aria-label="Navigazione principale">
        <div
          className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-xs font-bold text-slate-600"
          title={`${user.nome} · ${rank}`}
        >
          {operatoreInitial}
        </div>

        {showHomeNav ? <RailLink to="/" end title="Home" emoji="🏠" onNavigate={onNavigate} /> : null}

        {showDashCentrale && manSeg ? (
          <RailLink
            to={`/manifestazione/${manSeg}`}
            end
            title="Dashboard centrale"
            emoji="🖥️"
            onNavigate={onNavigate}
          />
        ) : showDashCentrale ? (
          <RailDisabled title="Dashboard centrale (apri una manifestazione dalla Home)" emoji="🖥️" />
        ) : null}

        {showElencoUtentiCentrale ? (
          <RailLink to="/admin/utenti" title="Elenco utenti" emoji="👥" onNavigate={onNavigate} />
        ) : null}

        {showDashPma ? (
          <RailLink to={`/pma/${pmaSeg}`} end title="Dashboard PMA" emoji="🏥" onNavigate={onNavigate} />
        ) : RANKS_PMA_DASH.includes(rank) ? (
          <RailDisabled title="Dashboard PMA (nessun PMA nel contesto: profilo o URL /pma/…)" emoji="🏥" />
        ) : null}

        {showImpEvento ? (
          <RailLink
            to={`/manifestazione/${manSeg}/rubrica`}
            title="Rubrica"
            emoji="📞"
            onNavigate={onNavigate}
          />
        ) : RANKS_WITH_MANIFEST_EVENTO_SETTINGS.includes(rank) ? (
          <RailDisabled title="Rubrica (nessuna manifestazione nel contesto)" emoji="📞" />
        ) : null}

        {showImpEvento ? (
          <RailLink
            to={`/manifestazione/${manSeg}/file-utili`}
            title="File utili"
            emoji="📎"
            onNavigate={onNavigate}
          />
        ) : RANKS_WITH_MANIFEST_EVENTO_SETTINGS.includes(rank) ? (
          <RailDisabled title="File utili (nessuna manifestazione nel contesto)" emoji="📎" />
        ) : null}

        {showImpEvento ? (
          <RailLink
            to={`/manifestazione/${manSeg}/impostazioni`}
            title="Impostazioni evento"
            emoji="🏟️"
            onNavigate={onNavigate}
          />
        ) : RANKS_WITH_MANIFEST_EVENTO_SETTINGS.includes(rank) ? (
          <RailDisabled title="Impostazioni evento (nessuna manifestazione nel contesto)" emoji="🏟️" />
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
        {showHomeNav ? <DrawerLink to="/" end label="Home" emoji="🏠" onNavigate={onNavigate} /> : null}
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
        {showElencoUtentiCentrale ? (
          <DrawerLink to="/admin/utenti" label="Elenco utenti" emoji="👥" onNavigate={onNavigate} />
        ) : null}
        {showDashPma ? (
          <DrawerLink to={`/pma/${pmaSeg}`} end label="Dashboard PMA" emoji="🏥" onNavigate={onNavigate} />
        ) : RANKS_PMA_DASH.includes(rank) ? (
          <DrawerDisabled label="Dashboard PMA" emoji="🏥" />
        ) : null}
        {showImpEvento ? (
          <DrawerLink
            to={`/manifestazione/${manSeg}/rubrica`}
            label="Rubrica"
            emoji="📞"
            onNavigate={onNavigate}
          />
        ) : RANKS_WITH_MANIFEST_EVENTO_SETTINGS.includes(rank) ? (
          <DrawerDisabled label="Rubrica" emoji="📞" />
        ) : null}
        {showImpEvento ? (
          <DrawerLink
            to={`/manifestazione/${manSeg}/file-utili`}
            label="File utili"
            emoji="📎"
            onNavigate={onNavigate}
          />
        ) : RANKS_WITH_MANIFEST_EVENTO_SETTINGS.includes(rank) ? (
          <DrawerDisabled label="File utili" emoji="📎" />
        ) : null}
        {showImpEvento ? (
          <DrawerLink
            to={`/manifestazione/${manSeg}/impostazioni`}
            label="Impostazioni evento"
            emoji="🏟️"
            onNavigate={onNavigate}
          />
        ) : RANKS_WITH_MANIFEST_EVENTO_SETTINGS.includes(rank) ? (
          <DrawerDisabled label="Impostazioni evento" emoji="🏟️" />
        ) : null}
      </nav>
    </aside>
  )
}
