import { useState } from 'react'

type Props = {
  tags: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  disabled?: boolean
  /** Suggerimento sotto il campo */
  hint?: string
}

/**
 * Input testuale: Invio aggiunge un tag (chip eliminabile).
 */
export function ChipTagField({ tags, onChange, placeholder, disabled, hint }: Props) {
  const [draft, setDraft] = useState('')

  function commit() {
    if (disabled) return
    const t = draft.trim()
    if (!t || tags.includes(t)) {
      setDraft('')
      return
    }
    onChange([...tags, t])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-[2.5rem] flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2">
        {tags.length === 0 ? (
          <span className="self-center text-xs text-slate-400">Nessun elemento — aggiungi con Invio.</span>
        ) : null}
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-white"
          >
            {t}
            {!disabled ? (
              <button
                type="button"
                className="pma-theme-skip inline-flex h-5 w-5 min-h-0 shrink-0 items-center justify-center rounded-full p-0 text-xs font-bold leading-none text-white hover:bg-white/25"
                aria-label={`Rimuovi ${t}`}
                onClick={() => onChange(tags.filter((x) => x !== t))}
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
      </div>
      <input
        type="text"
        value={draft}
        disabled={disabled}
        placeholder={placeholder ?? 'Scrivi e premi Invio…'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        className="w-full max-w-xl rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
      />
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}
