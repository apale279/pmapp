import { type ReactNode } from 'react'
import type { UserProfile } from '../../types/userProfile'
import { OperativeUserTray } from './OperativeUserTray'
import { SyncLiveIndicator } from './SyncLiveIndicator'

export type OperativeShellHeaderProps = {
  user: UserProfile
  logout: () => Promise<void>
  title: ReactNode
  prepend?: ReactNode
  afterTitle?: ReactNode
  mobileBelow?: ReactNode
  hamburger?: ReactNode
}

export function OperativeShellHeader({
  user,
  logout,
  title,
  prepend,
  afterTitle,
  mobileBelow,
  hamburger,
}: OperativeShellHeaderProps) {
  return (
    <>
      <header className="pma-bar sticky top-0 z-10 flex min-h-14 shrink-0 items-center gap-2 px-3 py-2 sm:px-4">
        {hamburger ? <div className="flex shrink-0 items-center md:hidden">{hamburger}</div> : null}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {prepend ? <div className="flex shrink-0 items-center">{prepend}</div> : null}
          <div className="flex min-w-0 flex-1 items-center">{title}</div>
          {afterTitle ? (
            <div className="hidden min-w-0 shrink-0 items-center gap-2 lg:flex">{afterTitle}</div>
          ) : null}
        </div>
        <div className="pma-bar__right ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="pma-bar__badge pma-bar__badge--role hidden uppercase sm:inline">
            {user.rank}
          </span>
          <SyncLiveIndicator variant="dark" />
          <OperativeUserTray user={user} logout={logout} variant="dark" />
        </div>
      </header>
      {afterTitle ? (
        <div className="border-b border-[#2a2a42] bg-[#1a1a2e] px-4 py-1.5 text-[#e8e8f8] lg:hidden">
          {afterTitle}
        </div>
      ) : null}
      {mobileBelow ? (
        <div className="border-b border-[#e2e8f0] bg-white px-4 py-1.5 sm:hidden">{mobileBelow}</div>
      ) : null}
    </>
  )
}
