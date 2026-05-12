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
      <header className="sticky top-0 z-10 flex min-h-14 shrink-0 items-center gap-2 border-b border-[#e2e8f0] bg-white px-3 py-2 sm:px-4">
        {hamburger ? <div className="shrink-0 md:hidden">{hamburger}</div> : null}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {prepend ? <div className="shrink-0">{prepend}</div> : null}
          <div className="min-w-0 flex-1">{title}</div>
          {afterTitle ? (
            <div className="hidden min-w-0 shrink-0 items-center lg:flex">{afterTitle}</div>
          ) : null}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <SyncLiveIndicator />
          <OperativeUserTray user={user} logout={logout} />
        </div>
      </header>
      {afterTitle ? (
        <div className="border-b border-[#e2e8f0] bg-white px-4 py-1.5 lg:hidden">{afterTitle}</div>
      ) : null}
      {mobileBelow ? (
        <div className="border-b border-[#e2e8f0] bg-white px-4 py-1.5 sm:hidden">{mobileBelow}</div>
      ) : null}
    </>
  )
}
