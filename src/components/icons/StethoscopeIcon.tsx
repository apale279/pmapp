/**
 * Stetoscopio per identità visiva ruolo Medico (Unicode U+1FA7A).
 */
export function StethoscopeIcon({ className }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 select-none text-[1.05rem] leading-none ${className ?? ''}`} role="img" aria-label="Medico">
      🩺
    </span>
  )
}
