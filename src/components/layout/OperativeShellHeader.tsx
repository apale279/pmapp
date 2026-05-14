import { type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { UserProfile } from '../../types/userProfile'
import { operativeRankDataValue, operativeRankHeaderStripClass } from '../../lib/rankOperativeHeaderClass'
import { useIsSmartphone } from '../../hooks/useIsSmartphone'
import { OperativeUserTray } from './OperativeUserTray'
import { SyncLiveIndicator } from './SyncLiveIndicator'

/** Smartphone: icona casetta → `/pma/{id_pma}` (stesso stile del pulsante menu hamburger). */
function OperativePmaHomeButton({ user }: { user: UserProfile }) {
  const sm = useIsSmartphone()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const myPmaId = user.id_pma?.trim() ?? ''
  if (!sm || !myPmaId) return null

  const parts = pathname.split('/').filter(Boolean)
  const onMyPmaDashboard =
    parts[0] === 'pma' &&
    parts.length === 2 &&
    decodeURIComponent(parts[1] ?? '') === myPmaId

  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        disabled={onMyPmaDashboard}
        title={onMyPmaDashboard ? 'Sei già nella dashboard del tuo PMA' : 'Dashboard del mio PMA'}
        aria-label="Vai alla dashboard del mio PMA"
        onClick={() => void navigate(`/pma/${encodeURIComponent(myPmaId)}`)}
        className="pma-theme-skip flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#e2e8f0] bg-white text-slate-900 transition hover:bg-slate-50"
      >
        <span className="sr-only">Vai alla dashboard del mio PMA</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
          aria-hidden
        >
          <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
          <path d="M9 21V12h6v9" />
        </svg>
      </button>
    </div>
  )
}

export type OperativeShellHeaderProps = {
  user: UserProfile
  logout: () => Promise<void>
  title: ReactNode
  prepend?: ReactNode
  headerActions?: ReactNode
  afterTitle?: ReactNode
  mobileBelow?: ReactNode
  hamburger?: ReactNode
  /** Smartphone: una sola riga principale, logout compatto, scroll orizzontale se serve. */
  chromeCompact?: boolean
}

export function OperativeShellHeader({
  user,
  logout,
  title,
  prepend,
  headerActions,
  afterTitle,
  mobileBelow,
  hamburger,
  chromeCompact = false,
}: OperativeShellHeaderProps) {
  const rankStrip = operativeRankHeaderStripClass
  const rankData = operativeRankDataValue(user.rank)
  return (
    <>
      <header
        data-operative-rank={rankData}
        className={`pma-bar ${rankStrip} sticky top-0 z-10 flex shrink-0 items-center px-2 py-1.5 sm:px-3 ${
          chromeCompact
            ? 'min-h-12 flex-nowrap gap-1 overflow-hidden'
            : 'min-h-14 flex-wrap gap-x-2 gap-y-1.5'
        }`}
      >
        {hamburger ? <div className="flex shrink-0 items-center md:hidden">{hamburger}</div> : null}
        <OperativePmaHomeButton user={user} />
        {prepend ? <div className="flex shrink-0 items-center">{prepend}</div> : null}
        {chromeCompact ? (
          <div className="relative isolate flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            <div className="min-w-0 max-w-[min(11rem,36vw)] shrink-0 overflow-hidden border-r border-white/10 pr-1.5">
              {title}
            </div>
            {headerActions ? (
              <div className="pma-shell-header-actions flex min-h-[2.75rem] min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] pr-0.5">
                {headerActions}
              </div>
            ) : (
              <div className="min-w-0 flex-1" aria-hidden />
            )}
          </div>
        ) : (
          <>
            <div className="flex min-w-0 max-w-full flex-[1_1_auto] items-center gap-2 sm:min-w-[8rem] sm:max-w-[min(100%,28rem)]">
              <div className="min-w-0 shrink">{title}</div>
            </div>
            {headerActions ? (
              <div className="pma-shell-header-actions flex min-w-0 max-w-full flex-[1000_1_12rem] flex-wrap items-center justify-end gap-1 sm:max-w-[min(100%,36rem)]">
                {headerActions}
              </div>
            ) : null}
          </>
        )}
        {afterTitle ? (
          <div className="hidden min-w-0 max-w-full flex-[1_1_100%] items-center gap-2 overflow-x-auto lg:flex lg:max-w-none lg:flex-[1_1_8rem] lg:justify-end">
            {afterTitle}
          </div>
        ) : null}
        <div
          className={
            chromeCompact
              ? 'ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-1'
              : 'ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2'
          }
        >
          <SyncLiveIndicator variant="dark" compact={chromeCompact} />
          <OperativeUserTray user={user} logout={logout} variant="dark" compact={chromeCompact} />
        </div>
      </header>
      {afterTitle ? (
        <div
          data-operative-rank={rankData}
          className={`${rankStrip} max-w-full overflow-x-auto border-b border-black/20 px-3 py-1.5 text-[#e8e8f8] [-webkit-overflow-scrolling:touch] lg:hidden`}
        >
          {afterTitle}
        </div>
      ) : null}
      {mobileBelow ? (
        <div className="border-b border-[#e2e8f0] bg-white px-4 py-1.5 sm:hidden">{mobileBelow}</div>
      ) : null}
    </>
  )
}
