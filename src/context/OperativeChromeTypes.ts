import type { ReactNode } from 'react'

export type OperativeChromeSlots = {
  titleOverride?: ReactNode | null
  headerPrepend?: ReactNode | null
  headerAfterTitle?: ReactNode | null
  toolbar?: ReactNode | null
  mainClassName?: string | null
  footer?: ReactNode | null
}
