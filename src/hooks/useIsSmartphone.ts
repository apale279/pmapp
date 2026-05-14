import { useEffect, useState } from 'react'

/** Allineato al breakpoint Tailwind `md` (tablet+ da 768px). */
const SMARTPHONE_MAX = '(max-width: 767px)'

export function useIsSmartphone(): boolean {
  const [v, setV] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(SMARTPHONE_MAX).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(SMARTPHONE_MAX)
    const on = () => setV(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return v
}
