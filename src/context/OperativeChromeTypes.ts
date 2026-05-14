import type { ReactNode } from 'react'

export type OperativeChromeSlots = {
  titleOverride?: ReactNode | null
  headerPrepend?: ReactNode | null
  /** CTA della pagina (es. «Nuovo»), area centrale dell’header tra titolo e sync. */
  headerActions?: ReactNode | null
  headerAfterTitle?: ReactNode | null
  toolbar?: ReactNode | null
  mainClassName?: string | null
  footer?: ReactNode | null
}
