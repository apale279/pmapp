import { useState, type ReactNode } from 'react'
import type { UserProfile } from '../../types/userProfile'
import { OperativeShellHeader } from '../layout/OperativeShellHeader'
import { UnifiedEmojiSidebar } from '../layout/UnifiedEmojiSidebar'
import { MobileEmojiNavOverlay, MobileNavHamburgerButton } from '../layout/MobileEmojiNav'
import { FONT_UI } from '../layout/operativeTokens'

export type SchedaPazienteShellProps = {
  user: UserProfile
  pmaId: string
  manifestazioneId: string
  pazienteIdVisibile: string
  logout: () => Promise<void>
  children: ReactNode
}

export function SchedaPazienteShell({
  user,
  pmaId: _pmaId,
  manifestazioneId: _manifestazioneId,
  pazienteIdVisibile,
  logout,
  children,
}: SchedaPazienteShellProps) {
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
          hamburger={<MobileNavHamburgerButton onOpen={() => setMobileNavOpen(true)} />}
          title={
            <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-[15px]">
              PMA Manager - Scheda Paziente - {pazienteIdVisibile}
            </h1>
          }
        />

        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>

      <MobileEmojiNavOverlay
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        user={user}
      />
    </div>
  )
}
