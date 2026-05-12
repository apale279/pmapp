import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { UserProfile } from '../../types/userProfile'

const FONT_UI = "font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]"

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5L12 3l8 7.5V20a1 1 0 01-1 1h-5v-8H10v8H5a1 1 0 01-1-1V10.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Triage: triangolo con punto esclamativo */
function IconTriage({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3L2 20h20L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
      <path d="M12 9v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconReport({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M7 19V11M12 19V7M17 19v-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

const navBtn =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[#374151] transition-colors hover:bg-white hover:text-[#2563eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

const navBtnActive =
  'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white text-[#2563eb] shadow-[inset_3px_0_0_0_#2563eb] hover:text-[#2563eb]'

export type PmaManagerShellProps = {
  user: UserProfile
  pmaId: string
  manifestazioneId: string
  pmaDisplayTitle: string
  logout: () => Promise<void>
  topToolbar: ReactNode
  triageStrip: ReactNode
  children: ReactNode
  footer: ReactNode
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
  const pmaSeg = encodeURIComponent(pmaId)
  const manSeg = manifestazioneId.trim() ? encodeURIComponent(manifestazioneId.trim()) : ''
  const initial = (user.nome?.trim()?.charAt(0) || user.email?.trim()?.charAt(0) || '?').toUpperCase()
  const reportTo = user.rank === 'Superadmin' ? '/utenti' : manSeg ? `/manifestazione/${manSeg}` : '/'

  return (
    <div className={`flex min-h-screen bg-white text-[#111827] ${FONT_UI}`}>
      <aside
        className="sticky top-0 z-20 flex h-screen w-16 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-[#f8fafc] py-3"
        aria-label="Navigazione PMA Manager"
      >
        <NavLink
          to={`/pma/${pmaSeg}`}
          end
          title="Home"
          aria-label="Home"
          className={({ isActive }) => (isActive ? navBtnActive : navBtn)}
        >
          <IconHome className="h-[22px] w-[22px]" />
        </NavLink>
        <NavLink
          to={manSeg ? `/manifestazione/${manSeg}` : '/'}
          title="Pazienti"
          aria-label="Pazienti"
          className={({ isActive }) => (isActive ? navBtnActive : navBtn)}
        >
          <IconUsers className="h-[22px] w-[22px]" />
        </NavLink>
        {manSeg ? (
          <NavLink
            to={`/manifestazione/${manSeg}`}
            title="Triage"
            aria-label="Triage"
            className={({ isActive }) => (isActive ? navBtnActive : navBtn)}
          >
            <IconTriage className="h-[22px] w-[22px]" />
          </NavLink>
        ) : (
          <span className={navBtn} title="Triage (manifestazione non disponibile)" aria-disabled>
            <IconTriage className="h-[22px] w-[22px] opacity-30" />
          </span>
        )}
        <NavLink
          to={reportTo}
          title="Report"
          aria-label="Report"
          className={({ isActive }) => (isActive ? navBtnActive : navBtn)}
        >
          <IconReport className="h-[22px] w-[22px]" />
        </NavLink>
        <NavLink
          to={`/pma/${pmaSeg}/impostazioni`}
          title="Impostazioni"
          aria-label="Impostazioni"
          className={({ isActive }) => (isActive ? navBtnActive : navBtn)}
        >
          <IconSettings className="h-[22px] w-[22px]" />
        </NavLink>
      </aside>

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
                PMA Manager — {pmaDisplayTitle}
              </h1>
            </div>
            <div className="ml-2 hidden min-w-0 sm:block">{triageStrip}</div>
          </div>
          <div className="flex shrink-0 items-center gap-3 pl-2">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700"
              title={user.nome}
              aria-hidden
            >
              {initial}
            </div>
            <div className="hidden min-w-0 text-right sm:block">
              <div className="truncate text-sm font-bold text-[#111827]">{user.nome}</div>
              <div className="mt-0.5">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
                    user.rank === 'Medico' ? 'bg-[#2563eb]' : 'bg-slate-600'
                  }`}
                >
                  {user.rank}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="shrink-0 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="border-b border-slate-100 bg-white px-4 py-1.5 sm:hidden">{triageStrip}</div>

        <div className="border-b border-slate-100 bg-white px-4 py-2">{topToolbar}</div>

        <main className="min-h-0 flex-1 overflow-auto px-4 pb-24 pt-4">{children}</main>

        <div className="fixed bottom-0 left-16 right-0 z-30 border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1920px] items-center justify-center gap-4 px-4 py-3 sm:gap-10">
            {footer}
          </div>
        </div>
      </div>
    </div>
  )
}
