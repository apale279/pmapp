import { useId, type ReactNode } from 'react'

export const NAV_ICON_CLASS = 'h-9 w-9 shrink-0'

type NavLogoProps = { className?: string }

function LogoFrame({
  className,
  bgId,
  stops,
  children,
}: {
  className?: string
  bgId: string
  stops: [string, string]
  children: ReactNode
}) {
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor={stops[0]} />
          <stop offset="1" stopColor={stops[1]} />
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="20" fill={`url(#${bgId})`} />
      {children}
    </svg>
  )
}

/** `Loghi/superadmin.svg.txt` */
export function NavLogoSuperadmin({ className = NAV_ICON_CLASS }: NavLogoProps) {
  const bgId = `nav-superadmin-${useId().replace(/:/g, '')}`
  return (
    <LogoFrame className={className} bgId={bgId} stops={['#6366f1', '#8b5cf6']}>
      <circle cx="40" cy="26" r="12" fill="white" />
      <path
        d="M16 72c0-13.2 10.8-24 24-24s24 10.8 24 24"
        stroke="white"
        strokeWidth="4.4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="62" cy="20" r="14" fill="#8b5cf6" />
      <polygon
        points="62,10 64.8,16.2 71.6,17 66.8,21.6 68,28.2 62,25 56,28.2 57.2,21.6 52.4,17 59.2,16.2"
        fill="white"
      />
    </LogoFrame>
  )
}

/** `Loghi/dashboard-evento.svg.txt` — dashboard manifestazione / centrale */
export function NavLogoDashboardEvento({ className = NAV_ICON_CLASS }: NavLogoProps) {
  const bgId = `nav-dash-evento-${useId().replace(/:/g, '')}`
  return (
    <LogoFrame className={className} bgId={bgId} stops={['#3b82f6', '#06b6d4']}>
      <rect x="16" y="12" width="48" height="34" rx="5" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="3" />
      <polyline
        points="20,32 26,32 30,22 34,40 38,26 42,32 48,32 52,32 60,32"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="36" y="46" width="8" height="6" rx="2" fill="white" fillOpacity="0.7" />
      <rect x="28" y="52" width="24" height="5" rx="2.5" fill="white" fillOpacity="0.7" />
      <rect x="4" y="20" width="14" height="20" rx="3" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="2.5" />
      <rect x="7" y="34" width="3" height="4" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="12" y="30" width="3" height="8" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="62" y="20" width="14" height="20" rx="3" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="2.5" />
      <polyline
        points="65,34 68,28 71,32 74,26"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="2" y="58" width="76" height="4" rx="2" fill="white" fillOpacity="0.25" />
    </LogoFrame>
  )
}

/** `Loghi/vista-pma.svg.txt` — dashboard PMA */
export function NavLogoVistaPma({ className = NAV_ICON_CLASS }: NavLogoProps) {
  const bgId = `nav-vista-pma-${useId().replace(/:/g, '')}`
  return (
    <LogoFrame className={className} bgId={bgId} stops={['#ef4444', '#f97316']}>
      <line x1="40" y1="6" x2="40" y2="2" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <polygon points="40,2 48,5 40,8" fill="white" fillOpacity="0.95" />
      <path
        d="M40 8 L76 52 L4 52 Z"
        fill="white"
        fillOpacity="0.2"
        stroke="white"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect x="8" y="52" width="64" height="20" rx="2" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="3.5" />
      <path
        d="M30 72 L30 60 Q40 50 50 60 L50 72"
        fill="white"
        fillOpacity="0.25"
        stroke="white"
        strokeWidth="3"
      />
      <rect x="37" y="55" width="6" height="14" rx="2" fill="white" />
      <rect x="31" y="60" width="18" height="6" rx="2" fill="white" />
    </LogoFrame>
  )
}

/** `Loghi/lista-utenti.svg.txt` — gestione utenti */
export function NavLogoListaUtenti({ className = NAV_ICON_CLASS }: NavLogoProps) {
  const bgId = `nav-lista-utenti-${useId().replace(/:/g, '')}`
  return (
    <LogoFrame className={className} bgId={bgId} stops={['#f59e0b', '#f97316']}>
      <circle cx="20" cy="24" r="7" fill="white" />
      <rect x="34" y="21" width="32" height="6" rx="3" fill="white" fillOpacity="0.95" />
      <line x1="10" y1="36" x2="70" y2="36" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" />
      <circle cx="20" cy="48" r="7" fill="white" fillOpacity="0.75" />
      <rect x="34" y="45" width="32" height="6" rx="3" fill="white" fillOpacity="0.65" />
      <line x1="10" y1="60" x2="70" y2="60" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" />
      <circle cx="20" cy="72" r="7" fill="white" fillOpacity="0.45" />
      <rect x="34" y="69" width="24" height="6" rx="3" fill="white" fillOpacity="0.4" />
    </LogoFrame>
  )
}

/** `Loghi/impostazioni.svg.txt` — impostazioni manifestazione */
export function NavLogoImpostazioni({ className = NAV_ICON_CLASS }: NavLogoProps) {
  const bgId = `nav-impostazioni-${useId().replace(/:/g, '')}`
  return (
    <LogoFrame className={className} bgId={bgId} stops={['#64748b', '#94a3b8']}>
      <path
        d="M45 8.4 L49.6 17 L59 14.4 L64 23.6 L56.4 30 L59 40 L71.6 43 L70 53 L59.6 53 L55 62 L62 69 L54.4 76 L47 69 L40 72 L38 71.6 L35 69 L27.6 76 L20 69 L27 62 L22.4 53 L12 53 L10.4 43 L23 40 L25.6 30 L18 23.6 L23 14.4 L32.4 17 L35 8.4 Z"
        fill="white"
        fillOpacity="0.92"
      />
      <circle cx="40" cy="40" r="14" fill={`url(#${bgId})`} />
      <circle cx="40" cy="40" r="8" fill="white" fillOpacity="0.2" />
    </LogoFrame>
  )
}

/** `Loghi/impostazioni-pma.svg.txt` — archivio pazienti globali (lista clinica PMA) */
export function NavLogoImpostazioniPma({ className = NAV_ICON_CLASS }: NavLogoProps) {
  const bgId = `nav-imp-pma-${useId().replace(/:/g, '')}`
  const gearId = `nav-gear-${useId().replace(/:/g, '')}`
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient id={gearId} x1="44" y1="44" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#059669" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="20" fill={`url(#${bgId})`} />
      <path
        d="M40 6 L76 50 L4 50 Z"
        fill="white"
        fillOpacity="0.2"
        stroke="white"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect x="8" y="50" width="64" height="20" rx="2" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="3.5" />
      <path
        d="M30 70 L30 58 Q40 48 50 58 L50 70"
        fill="white"
        fillOpacity="0.25"
        stroke="white"
        strokeWidth="3"
      />
      <rect x="37" y="53" width="6" height="14" rx="2" fill="white" />
      <rect x="31" y="58" width="18" height="6" rx="2" fill="white" />
      <circle cx="60" cy="60" r="22" fill={`url(#${gearId})`} />
      <path
        d="M62 40.5 L65 46.5 L71 44.8 L74.5 50.5 L69.8 54.5 L71.2 60 L78 61.5 L77.2 67.5 L71.2 67.5 L68.8 73 L73 77.5 L68.5 81.5 L64 77.5 L60 79.5 L58.5 79.2 L56 77.5 L51.5 81.5 L47 77.5 L51.2 73 L48.8 67.5 L42.8 67.5 L42 61.5 L48.8 60 L50.2 54.5 L45.5 50.5 L49 44.8 L55 46.5 L58 40.5 Z"
        fill="white"
        fillOpacity="0.95"
      />
      <circle cx="60" cy="60" r="9" fill={`url(#${gearId})`} />
    </svg>
  )
}

/** Home — stile coerente (nessun file in Loghi). */
export function NavLogoHome({ className = NAV_ICON_CLASS }: NavLogoProps) {
  const bgId = `nav-home-${useId().replace(/:/g, '')}`
  return (
    <LogoFrame className={className} bgId={bgId} stops={['#334155', '#475569']}>
      <path
        d="M40 14 L62 32 V64 H50 V44 H30 V64 H18 V32 Z"
        fill="white"
        fillOpacity="0.9"
        stroke="white"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </LogoFrame>
  )
}

/** Rubrica contatti — stile coerente. */
export function NavLogoRubrica({ className = NAV_ICON_CLASS }: NavLogoProps) {
  const bgId = `nav-rubrica-${useId().replace(/:/g, '')}`
  return (
    <LogoFrame className={className} bgId={bgId} stops={['#0ea5e9', '#0284c7']}>
      <path
        d="M28 22 H52 A8 8 0 0 1 52 38 H28 V22 Z"
        fill="white"
        fillOpacity="0.2"
        stroke="white"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M28 38 H52 V58 H28 Z" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="3" />
      <circle cx="40" cy="48" r="4" fill="white" />
      <path d="M34 56 H46" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </LogoFrame>
  )
}

/** File utili manifestazione — stile coerente. */
export function NavLogoFileUtili({ className = NAV_ICON_CLASS }: NavLogoProps) {
  const bgId = `nav-file-${useId().replace(/:/g, '')}`
  return (
    <LogoFrame className={className} bgId={bgId} stops={['#a855f7', '#7c3aed']}>
      <path
        d="M24 18 H44 L56 30 V62 H24 Z"
        fill="white"
        fillOpacity="0.15"
        stroke="white"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M44 18 V30 H56" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 40 H48 M32 50 H48 M32 60 H42" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </LogoFrame>
  )
}

/** Stesse icone condivise tra sidebar (export oggetto). */
export const SidebarNavIcons = {
  superadmin: NavLogoSuperadmin,
  dashboardEvento: NavLogoDashboardEvento,
  vistaPma: NavLogoVistaPma,
  listaUtenti: NavLogoListaUtenti,
  impostazioni: NavLogoImpostazioni,
  pazientiArchivio: NavLogoImpostazioniPma,
  home: NavLogoHome,
  rubrica: NavLogoRubrica,
  fileUtili: NavLogoFileUtili,
} as const

export function SidebarNavIcon({
  name,
  className = NAV_ICON_CLASS,
}: {
  name: keyof typeof SidebarNavIcons
  className?: string
}) {
  const Icon = SidebarNavIcons[name]
  return <Icon className={className} />
}
