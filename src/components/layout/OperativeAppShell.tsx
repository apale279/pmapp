import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { FONT_UI } from './operativeTokens'
import { OperativeShellHeader } from './OperativeShellHeader'
import { UnifiedEmojiSidebar } from './UnifiedEmojiSidebar'
import { AdminEmojiSidebar } from '../admin/AdminEmojiSidebar'
import { MobileEmojiNavOverlay, MobileNavHamburgerButton } from './MobileEmojiNav'
import type { UserProfile } from '../../types/userProfile'
import { useAppShellTitle } from '../../hooks/useAppShellTitle'
import { useInfermiereSmartphone } from '../../hooks/useInfermiereSmartphone'
import { useIsSmartphone } from '../../hooks/useIsSmartphone'
import { OperativeChromeProvider } from '../../context/OperativeChromeContext'
import type { OperativeChromeSlots } from '../../context/OperativeChromeTypes'

export type OperativeAppShellProps = {
  user: UserProfile
  logout: () => Promise<void>
  children: ReactNode
}

export function OperativeAppShell({ user, logout, children }: OperativeAppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [slots, setSlotsState] = useState<OperativeChromeSlots>({})

  const setSlots = useCallback((patch: Partial<OperativeChromeSlots>) => {
    setSlotsState((prev) => ({ ...prev, ...patch }))
  }, [])
  const clearSlots = useCallback(() => setSlotsState({}), [])

  const chromeApi = useMemo(() => ({ setSlots, clearSlots }), [setSlots, clearSlots])

  const defaultTitle = useAppShellTitle()
  const titleNode =
    slots.titleOverride ?? (
      <h1 className="truncate text-xs font-bold uppercase tracking-wider text-[#e8e8f8] sm:text-sm">
        {defaultTitle}
      </h1>
    )

  const defaultMainClass = 'min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-8 sm:py-8'
  const mainClass = slots.mainClassName ?? defaultMainClass
  const hasFooter = slots.footer != null

  const isSuperadmin = user.rank === 'Superadmin'
  const Sidebar = isSuperadmin ? AdminEmojiSidebar : UnifiedEmojiSidebar
  const infermiereSmartphoneNav = useInfermiereSmartphone(user)
  const chromeCompact = useIsSmartphone()

  return (
    <OperativeChromeProvider value={chromeApi}>
      <div className={`flex min-h-screen bg-[#f8fafc] text-slate-900 ${FONT_UI}`}>
        <div className="hidden shrink-0 md:block">
          <Sidebar user={user} variant="rail" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <OperativeShellHeader
            user={user}
            logout={logout}
            prepend={slots.headerPrepend ?? undefined}
            title={titleNode}
            headerActions={slots.headerActions ?? undefined}
            afterTitle={slots.headerAfterTitle ?? undefined}
            hamburger={<MobileNavHamburgerButton onOpen={() => setMobileNavOpen(true)} />}
            chromeCompact={chromeCompact}
          />

          {slots.toolbar ? (
            <div className="border-b border-[#e2e8f0] bg-white px-4 py-2">{slots.toolbar}</div>
          ) : null}

          <main className={mainClass}>{children}</main>

          {hasFooter ? (
            <div
              className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#e2e8f0] bg-white md:left-14"
            >
              <div className="mx-auto flex max-w-[1920px] items-center justify-center gap-4 px-4 py-3 sm:gap-10">
                {slots.footer}
              </div>
            </div>
          ) : null}
        </div>

        <MobileEmojiNavOverlay
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          user={user}
          narrowDrawer={infermiereSmartphoneNav}
        />
      </div>
    </OperativeChromeProvider>
  )
}
