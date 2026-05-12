import { useState, type ReactNode } from 'react'
import { FONT_UI } from './operativeTokens'
import { OperativeUserTray } from './OperativeUserTray'
import type { UserProfile } from '../../types/userProfile'

function IconMenuHamburger() {
  return (
    <svg className="shrink-0" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export type OperativeAppShellProps = {
  user: UserProfile
  logout: () => Promise<void>
  title: string
  renderRail: (variant: 'rail' | 'drawer', closeMobile?: () => void) => ReactNode
  children: ReactNode
}

export function OperativeAppShell({ user, logout, title, renderRail, children }: OperativeAppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className={`flex min-h-screen bg-white text-[#111827] ${FONT_UI}`}>
      <div className="hidden shrink-0 md:block">{renderRail('rail')}</div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:px-4">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-[#111827] transition hover:bg-slate-50 md:hidden"
            aria-label="Apri menu di navigazione"
            aria-expanded={mobileNavOpen}
            aria-controls="operative-mobile-nav"
            onClick={() => setMobileNavOpen(true)}
          >
            <IconMenuHamburger />
          </button>
          <h1 className="min-w-0 flex-1 truncate pr-2 text-sm font-semibold text-[#111827] sm:text-[15px]">
            {title}
          </h1>
          <OperativeUserTray user={user} logout={logout} />
        </header>

        <main className="min-h-0 flex-1 overflow-auto bg-white px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
            aria-label="Chiudi menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            id="operative-mobile-nav"
            className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,90vw)] flex-col bg-white shadow-xl md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigazione"
          >
            <div className="flex shrink-0 items-center justify-end border-b border-slate-200 px-2 py-2">
              <button
                type="button"
                className="min-h-10 rounded-md px-3 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
                onClick={() => setMobileNavOpen(false)}
              >
                Chiudi
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {renderRail('drawer', () => setMobileNavOpen(false))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
