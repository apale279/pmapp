import { useLayoutEffect, type ReactNode } from 'react'
import { useOperativeChrome } from '../../context/OperativeChromeContext'
import { useInfermiereSmartphone } from '../../hooks/useInfermiereSmartphone'
import type { UserProfile } from '../../types/userProfile'

export type SchedaPazienteShellProps = {
  user: UserProfile | null
  pmaId: string
  manifestazioneId: string
  pazienteIdVisibile: string
  logout: unknown
  children: ReactNode
}

/**
 * Imposta titolo e area main per la scheda paziente nel chrome globale (nessun layout duplicato).
 */
export function SchedaPazienteShell({ user, pazienteIdVisibile, children }: SchedaPazienteShellProps) {
  const { setSlots, clearSlots } = useOperativeChrome()
  const infermiereSm = useInfermiereSmartphone(user)

  useLayoutEffect(() => {
    setSlots({
      titleOverride: infermiereSm ? (
        <h1 className="truncate font-mono text-xs font-bold uppercase tracking-wider text-[#e8e8f8] sm:text-sm">
          {pazienteIdVisibile}
        </h1>
      ) : (
        <h1 className="truncate text-xs font-bold uppercase tracking-wider text-[#e8e8f8] sm:text-sm">
          SCHEDA · {pazienteIdVisibile}
        </h1>
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
  }, [pazienteIdVisibile, infermiereSm, setSlots, clearSlots])

  return <>{children}</>
}
