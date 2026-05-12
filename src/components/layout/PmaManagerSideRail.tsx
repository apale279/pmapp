import { NavLink } from 'react-router-dom'
import type { UserProfile } from '../../types/userProfile'
import { IconHome, IconReport, IconSettings, IconTriage, IconUsers } from './ManagerSvgIcons'
import { opNavBtn, opNavBtnActive } from './operativeTokens'

export type PmaManagerSideRailProps = {
  user: UserProfile
  pmaId: string
  manifestazioneId: string
}

export function PmaManagerSideRail({ user, pmaId, manifestazioneId }: PmaManagerSideRailProps) {
  const pmaSeg = encodeURIComponent(pmaId)
  const manSeg = manifestazioneId.trim() ? encodeURIComponent(manifestazioneId.trim()) : ''
  const reportTo = user.rank === 'Superadmin' ? '/utenti' : manSeg ? `/manifestazione/${manSeg}` : '/'

  return (
    <aside
      className="sticky top-0 z-20 flex h-screen w-16 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-[#f8fafc] py-3"
      aria-label="Navigazione PMA Manager"
    >
      <NavLink
        to={`/pma/${pmaSeg}`}
        end
        title="Home"
        aria-label="Home"
        className={({ isActive }) => (isActive ? opNavBtnActive : opNavBtn)}
      >
        <IconHome className="h-[22px] w-[22px]" />
      </NavLink>
      <NavLink
        to={manSeg ? `/manifestazione/${manSeg}` : '/'}
        title="Pazienti"
        aria-label="Pazienti"
        className={({ isActive }) => (isActive ? opNavBtnActive : opNavBtn)}
      >
        <IconUsers className="h-[22px] w-[22px]" />
      </NavLink>
      {manSeg ? (
        <NavLink
          to={`/manifestazione/${manSeg}`}
          title="Triage"
          aria-label="Triage"
          className={({ isActive }) => (isActive ? opNavBtnActive : opNavBtn)}
        >
          <IconTriage className="h-[22px] w-[22px]" />
        </NavLink>
      ) : (
        <span className={opNavBtn} title="Triage (manifestazione non disponibile)" aria-disabled>
          <IconTriage className="h-[22px] w-[22px] opacity-30" />
        </span>
      )}
      <NavLink
        to={reportTo}
        title="Report"
        aria-label="Report"
        className={({ isActive }) => (isActive ? opNavBtnActive : opNavBtn)}
      >
        <IconReport className="h-[22px] w-[22px]" />
      </NavLink>
      <NavLink
        to={`/pma/${pmaSeg}/impostazioni`}
        title="Impostazioni"
        aria-label="Impostazioni"
        className={({ isActive }) => (isActive ? opNavBtnActive : opNavBtn)}
      >
        <IconSettings className="h-[22px] w-[22px]" />
      </NavLink>
    </aside>
  )
}
