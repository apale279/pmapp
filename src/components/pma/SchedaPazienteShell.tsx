import { type ReactNode } from 'react'
import type { UserProfile } from '../../types/userProfile'
import { PmaManagerSideRail } from '../layout/PmaManagerSideRail'
import { OperativeUserTray } from '../layout/OperativeUserTray'
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
  pmaId,
  manifestazioneId,
  pazienteIdVisibile,
  logout,
  children,
}: SchedaPazienteShellProps) {
  return (
    <div className={`flex min-h-screen bg-white text-[#111827] ${FONT_UI}`}>
      <PmaManagerSideRail user={user} pmaId={pmaId} manifestazioneId={manifestazioneId} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
          <h1 className="min-w-0 truncate text-sm font-semibold text-[#111827] sm:text-[15px]">
            PMA Manager - Scheda Paziente - {pazienteIdVisibile}
          </h1>
          <OperativeUserTray user={user} logout={logout} />
        </header>

        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
