import { useState, type ReactNode } from 'react'
import { FONT_UI } from './operativeTokens'
import { OperativeShellHeader } from './OperativeShellHeader'
import { UnifiedEmojiSidebar } from './UnifiedEmojiSidebar'
import { MobileEmojiNavOverlay, MobileNavHamburgerButton } from './MobileEmojiNav'
import type { UserProfile } from '../../types/userProfile'

export type OperativeAppShellProps = {
  user: UserProfile
  logout: () => Promise<void>
  title: string
  children: ReactNode
}

export function OperativeAppShell({ user, logout, title, children }: OperativeAppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className={`flex min-h-screen bg-[#f8fafc] text-slate-900 ${FONT_UI}`}>
      <div className="hidden shrink-0 md:block">
        <UnifiedEmojiSidebar user={user} variant="rail" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <OperativeShellHeader
          user={user}
          logout={logout}
          title={
            <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-[15px]">{title}</h1>
          }
          hamburger={<MobileNavHamburgerButton onOpen={() => setMobileNavOpen(true)} />}
        />

        <main className="min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>

      <MobileEmojiNavOverlay
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        user={user}
      />
    </div>
  )
}
