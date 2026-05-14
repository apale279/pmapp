import { useLayoutEffect, type ReactNode } from 'react'
import { useOperativeChrome } from '../../context/OperativeChromeContext'
import { useIsSmartphone } from '../../hooks/useIsSmartphone'
import type { UserProfile } from '../../types/userProfile'

export type PmaManagerShellProps = {
  user: UserProfile | null
  pmaId: string
  manifestazioneId: string
  pmaDisplayTitle: string
  logout: unknown
  /** Pulsanti azione nel chrome globale (es. Nuovo paziente). */
  headerActions?: ReactNode
  topToolbar?: ReactNode
  triageStrip?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/**
 * Collega toolbar, strip triage e footer al chrome globale (`OperativeAppShell`).
 * Non renderizza più sidebar/header duplicati (evita “pagina nella pagina”).
 */
export function PmaManagerShell({
  user: _user,
  pmaDisplayTitle,
  triageStrip,
  headerActions,
  topToolbar,
  children,
  footer,
}: PmaManagerShellProps) {
  const { setSlots, clearSlots } = useOperativeChrome()
  const smartphone = useIsSmartphone()
  const hasFooter = footer != null
  const hasToolbar = topToolbar != null

  useLayoutEffect(() => {
    const titleUpper = pmaDisplayTitle.trim().toUpperCase()
    setSlots({
      headerPrepend: null,
      titleOverride: smartphone ? (
        <h1 className="sr-only">{titleUpper}</h1>
      ) : (
        <h1 className="truncate text-xs font-bold uppercase tracking-wider text-[#e8e8f8] sm:text-sm">
          {titleUpper}
        </h1>
      ),
      headerCompactOmitTitle: smartphone,
      headerActions: headerActions ?? null,
      headerAfterTitle: triageStrip ?? null,
      toolbar: hasToolbar ? topToolbar : null,
      footer: hasFooter ? footer : null,
      mainClassName: hasFooter
        ? 'min-h-0 flex-1 overflow-auto px-4 pt-4 pb-28 sm:px-6'
        : 'min-h-0 flex-1 overflow-auto px-4 pt-4 pb-10 sm:px-6',
    })
    return () => {
      clearSlots()
    }
  }, [
    pmaDisplayTitle,
    smartphone,
    triageStrip,
    headerActions,
    topToolbar,
    footer,
    hasToolbar,
    hasFooter,
    setSlots,
    clearSlots,
  ])

  return <>{children}</>
}
