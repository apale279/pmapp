import type { UserProfile } from '../../types/userProfile'
import { UnifiedEmojiSidebar } from './UnifiedEmojiSidebar'
import { AdminEmojiSidebar } from '../admin/AdminEmojiSidebar'

export function MobileEmojiNavOverlay({
  open,
  onClose,
  user,
}: {
  open: boolean
  onClose: () => void
  user: UserProfile
}) {
  if (!open) return null
  const Sidebar = user.rank === 'Superadmin' ? AdminEmojiSidebar : UnifiedEmojiSidebar
  return (
    <>
      <button
        type="button"
        className="pma-theme-skip fixed inset-0 z-40 bg-slate-900/40 md:hidden"
        aria-label="Chiudi menu"
        onClick={onClose}
      />
      <div
        id="emoji-mobile-nav"
        className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,90vw)] flex-col bg-white shadow-xl md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Navigazione"
      >
        <div className="flex shrink-0 items-center justify-end border-b border-[#e2e8f0] px-2 py-2">
          <button
            type="button"
            className="pma-theme-skip min-h-10 rounded-md px-3 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
            onClick={onClose}
          >
            Chiudi
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Sidebar user={user} variant="drawer" onNavigate={onClose} />
        </div>
      </div>
    </>
  )
}

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

export function MobileNavHamburgerButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="pma-theme-skip flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#e2e8f0] bg-white text-slate-900 transition hover:bg-slate-50 md:hidden"
      aria-label="Apri menu di navigazione"
      aria-controls="emoji-mobile-nav"
      onClick={onOpen}
    >
      <IconMenuHamburger />
    </button>
  )
}
