import { type ReactNode } from 'react'
import type { UserProfile } from '../../types/userProfile'
import { rankOperativeHeaderClass } from '../../lib/rankOperativeHeaderClass'
import { OperativeUserTray } from './OperativeUserTray'
import { SyncLiveIndicator } from './SyncLiveIndicator'

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
  const rankBar = rankOperativeHeaderClass(user.rank)
  return (
    <>
      <header
        className={`pma-bar sticky top-0 z-10 flex shrink-0 items-center px-2 py-1.5 sm:px-3 ${rankBar} ${
          chromeCompact
            ? 'min-h-12 flex-nowrap gap-1 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]'
            : 'min-h-14 flex-wrap gap-x-2 gap-y-1.5'
        }`}
      >
        {hamburger ? <div className="flex shrink-0 items-center md:hidden">{hamburger}</div> : null}
        {prepend ? <div className="flex shrink-0 items-center">{prepend}</div> : null}
        <div
          className={
            chromeCompact
              ? 'flex min-w-0 max-w-[38%] shrink items-center gap-1 sm:max-w-[min(100%,12rem)]'
              : 'flex min-w-0 max-w-full flex-[1_1_auto] items-center gap-2 sm:min-w-[8rem] sm:max-w-[min(100%,28rem)]'
          }
        >
          <div className="min-w-0 shrink">{title}</div>
        </div>
        {headerActions ? (
          <div
            className={
              chromeCompact
                ? 'pma-shell-header-actions flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-1 overflow-x-auto'
                : 'pma-shell-header-actions flex min-w-0 max-w-full flex-[1000_1_12rem] flex-wrap items-center justify-end gap-1 sm:max-w-[min(100%,36rem)]'
            }
          >
            {headerActions}
          </div>
        ) : null}
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
          className={`border-b border-black/20 px-3 py-1.5 text-[#e8e8f8] lg:hidden ${rankBar}`}
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
