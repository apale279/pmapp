import { useLayoutEffect, type ReactNode } from 'react'
import { useOperativeChrome } from '../../context/OperativeChromeContext'

export type PmaManagerShellProps = {
  user: unknown
  pmaId: string
  manifestazioneId: string
  pmaDisplayTitle: string
  logout: unknown
  topToolbar?: ReactNode
  triageStrip?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

const PMA_BADGE = (
  <div
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#e2e8f0] bg-[#f8fafc] text-xs font-bold uppercase tracking-wide text-slate-600"
    aria-hidden
  >
    PMA
  </div>
)

/**
 * Collega toolbar, strip triage e footer al chrome globale (`OperativeAppShell`).
 * Non renderizza più sidebar/header duplicati (evita “pagina nella pagina”).
 */
export function PmaManagerShell({
  pmaDisplayTitle,
  triageStrip,
  topToolbar,
  children,
  footer,
}: PmaManagerShellProps) {
  const { setSlots, clearSlots } = useOperativeChrome()
  const hasFooter = footer != null
  const hasToolbar = topToolbar != null

  useLayoutEffect(() => {
    setSlots({
      headerPrepend: PMA_BADGE,
      titleOverride: (
        <h1 className="pma-bar__id truncate">PMA Manager - {pmaDisplayTitle}</h1>
      ),
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
  }, [pmaDisplayTitle, triageStrip, topToolbar, footer, hasToolbar, hasFooter, setSlots, clearSlots])

  return <>{children}</>
}
