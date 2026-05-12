import { type ReactNode } from 'react'
import type { UserProfile } from '../../types/userProfile'
import { PmaManagerSideRail } from '../layout/PmaManagerSideRail'
import { OperativeUserTray } from '../layout/OperativeUserTray'
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
  pmaId,
  manifestazioneId,
  pmaDisplayTitle,
  logout,
  topToolbar,
  triageStrip,
  children,
  footer,
}: PmaManagerShellProps) {
  const hasFooter = footer != null
  const hasToolbar = topToolbar != null

  return (
    <div className={`flex min-h-screen bg-white text-[#111827] ${FONT_UI}`}>
      <PmaManagerSideRail user={user} pmaId={pmaId} manifestazioneId={manifestazioneId} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600"
              aria-hidden
            >
              PMA
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-[#111827] sm:text-[15px]">
                PMA Manager - {pmaDisplayTitle}
              </h1>
            </div>
            {triageStrip ? (
              <div className="ml-2 hidden min-w-0 sm:block">{triageStrip}</div>
            ) : null}
          </div>
          <OperativeUserTray user={user} logout={logout} />
        </header>

        {triageStrip ? (
          <div className="border-b border-slate-100 bg-white px-4 py-1.5 sm:hidden">{triageStrip}</div>
        ) : null}

        {hasToolbar ? (
          <div className="border-b border-slate-100 bg-white px-4 py-2">{topToolbar}</div>
        ) : null}

        <main
          className={`min-h-0 flex-1 overflow-auto px-4 pt-4 ${hasFooter ? 'pb-24' : 'pb-10'}`}
        >
          {children}
        </main>

        {hasFooter ? (
          <div className="fixed bottom-0 left-16 right-0 z-30 border-t border-slate-200 bg-white">
            <div className="mx-auto flex max-w-[1920px] items-center justify-center gap-4 px-4 py-3 sm:gap-10">
              {footer}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
