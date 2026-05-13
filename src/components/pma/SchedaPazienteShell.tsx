import { useLayoutEffect, type ReactNode } from 'react'
import { useOperativeChrome } from '../../context/OperativeChromeContext'

export type SchedaPazienteShellProps = {
  user: unknown
  pmaId: string
  manifestazioneId: string
  pazienteIdVisibile: string
  logout: unknown
  children: ReactNode
}

/**
 * Imposta titolo e area main per la scheda paziente nel chrome globale (nessun layout duplicato).
 */
export function SchedaPazienteShell({ pazienteIdVisibile, children }: SchedaPazienteShellProps) {
  const { setSlots, clearSlots } = useOperativeChrome()

  useLayoutEffect(() => {
    setSlots({
      titleOverride: (
        <h1 className="pma-bar__id truncate">PMA Manager — Scheda paziente — {pazienteIdVisibile}</h1>
      ),
      headerPrepend: null,
      headerAfterTitle: null,
      toolbar: null,
      footer: null,
      mainClassName: 'min-h-0 flex-1 overflow-auto',
    })
    return () => {
      clearSlots()
    }
  }, [pazienteIdVisibile, setSlots, clearSlots])

  return <>{children}</>
}
