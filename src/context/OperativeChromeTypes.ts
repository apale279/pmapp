import type { ReactNode } from 'react'

export type OperativeChromeSlots = {
  titleOverride?: ReactNode | null
  headerPrepend?: ReactNode | null
  /** Smartphone PMA: nasconde il titolo visibile nell’header (resta solo sr-only per accessibilità). */
  headerCompactOmitTitle?: boolean
  /** CTA della pagina (es. «Nuovo»), area centrale dell’header tra titolo e sync. */
  headerActions?: ReactNode | null
  headerAfterTitle?: ReactNode | null
  toolbar?: ReactNode | null
  mainClassName?: string | null
  footer?: ReactNode | null
}
