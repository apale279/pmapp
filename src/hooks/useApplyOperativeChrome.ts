import { useLayoutEffect, type DependencyList } from 'react'
import { useOperativeChrome } from '../context/OperativeChromeContext'
import type { OperativeChromeSlots } from '../context/OperativeChromeTypes'

/**
 * Registra slot chrome da una factory; ripulisce allo smontaggio o quando `enabled` è false.
 */
export function useApplyOperativeChrome(
  enabled: boolean,
  factory: () => OperativeChromeSlots,
  deps: DependencyList,
) {
  const { setSlots, clearSlots } = useOperativeChrome()
  useLayoutEffect(() => {
    if (!enabled) {
      clearSlots()
      return
    }
    setSlots(factory())
    return () => {
      clearSlots()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, clearSlots, setSlots, ...deps])
}
