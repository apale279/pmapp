import { useState, type ReactNode } from 'react'
import type { UserProfile } from '../../types/userProfile'
import { OperativeShellHeader } from '../layout/OperativeShellHeader'
import { UnifiedEmojiSidebar } from '../layout/UnifiedEmojiSidebar'
import { MobileEmojiNavOverlay, MobileNavHamburgerButton } from '../layout/MobileEmojiNav'
import { FONT_UI } from '../layout/operativeTokens'

export type PmaManagerShellProps = {
  user: UserProfile
  pmaId: string
  manifestazioneId: string
  pmaDisplayTitle: string
  logout: () => Promise<void>
  topToolbar?: ReactNode
  triageStrip?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function PmaManagerShell({
  user,
  pmaId: _pmaId,
  manifestazioneId: _manifestazioneId,
  pmaDisplayTitle,
  logout,
  topToolbar,
  triageStrip,
  children,
  footer,
}: PmaManagerShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const hasFooter = footer != null
  const hasToolbar = topToolbar != null

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
          prepend={
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#e2e8f0] bg-[#f8fafc] text-[10px] font-bold text-slate-600"
              aria-hidden
            >
              PMA
            </div>
          }
          title={
            <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-[15px]">
              PMA Manager - {pmaDisplayTitle}
            </h1>
          }
          afterTitle={triageStrip ?? undefined}
        />

        {hasToolbar ? (
          <div className="border-b border-[#e2e8f0] bg-white px-4 py-2">{topToolbar}</div>
        ) : null}

        <main
          className={`min-h-0 flex-1 overflow-auto px-4 pt-4 ${hasFooter ? 'pb-24' : 'pb-10'}`}
        >
          {children}
        </main>

        {hasFooter ? (
          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#e2e8f0] bg-white md:left-20">
            <div className="mx-auto flex max-w-[1920px] items-center justify-center gap-4 px-4 py-3 sm:gap-10">
              {footer}
            </div>
          </div>
        ) : null}
      </div>

      <MobileEmojiNavOverlay
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        user={user}
      />
    </div>
  )
}
