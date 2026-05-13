import { createContext, useContext, type ReactNode } from 'react'
import type { OperativeChromeSlots } from './OperativeChromeTypes'

export type { OperativeChromeSlots } from './OperativeChromeTypes'

export type OperativeChromeApi = {
  setSlots: (patch: Partial<OperativeChromeSlots>) => void
  clearSlots: () => void
}

export const OperativeChromeContext = createContext<OperativeChromeApi | null>(null)

export function useOperativeChrome(): OperativeChromeApi {
  const c = useContext(OperativeChromeContext)
  if (!c) {
    throw new Error('useOperativeChrome must be used within OperativeAppShell')
  }
  return c
}

export function OperativeChromeProvider({ value, children }: { value: OperativeChromeApi; children: ReactNode }) {
  return <OperativeChromeContext.Provider value={value}>{children}</OperativeChromeContext.Provider>
}
