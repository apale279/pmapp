import { useEffect, useMemo, useRef } from 'react'
import { EO_OPZIONI_RAPIDE } from '../../types/cartellaClinica'

export type EoQuickGroup = { title: string; labels: readonly string[] }

type Props = {
  selected: string[]
  note: string
  disabled?: boolean
  /** Opzioni piatte (retrocompat). */
  opzioniRapide?: readonly string[]
  /** Raggruppamento per categoria (v4); ha priorità su `opzioniRapide`. */
  gruppiRapidi?: readonly EoQuickGroup[]
  /**
   * Se `selected` è vuoto e questa etichetta è presente tra le opzioni (flat o gruppi), viene applicata una sola
   * volta (persistenza tramite `onSelectionChange`).
   */
  defaultQuickSelection?: string | null
  onSelectionChange: (next: string[]) => void
  onNoteBlur: (text: string) => void
}

function flatFromGroups(groups: readonly EoQuickGroup[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const g of groups) {
    for (const x of g.labels) {
      if (!seen.has(x)) {
        seen.add(x)
        out.push(x)
      }
    }
  }
  return out
}

/**
 * Esame obiettivo: chip per opzioni rapide + note testuali (Sez. 4.1).
 */
export function QuickExamField({
  selected,
  note,
  disabled,
  opzioniRapide,
  gruppiRapidi,
  defaultQuickSelection,
  onSelectionChange,
  onNoteBlur,
}: Props) {
  const flatLabels = useMemo(() => {
    if (gruppiRapidi?.length) return flatFromGroups(gruppiRapidi)
    return opzioniRapide?.length ? [...opzioniRapide] : [...EO_OPZIONI_RAPIDE]
  }, [gruppiRapidi, opzioniRapide])

  const labelsKey = flatLabels.join('\0')
  const set = new Set(selected)
  const appliedDefaultRef = useRef(false)

  useEffect(() => {
    if (disabled || appliedDefaultRef.current) return
    if (selected.length > 0) return
    const d = defaultQuickSelection?.trim()
    if (!d) return
    if (!flatLabels.includes(d)) return
    appliedDefaultRef.current = true
    onSelectionChange([d])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, selected.length, defaultQuickSelection, labelsKey])

  const chipFlat = (on: boolean) =>
    on
      ? 'rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white ring-1 ring-slate-900/10 disabled:opacity-50'
      : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800 ring-1 ring-slate-600/15 hover:bg-slate-200 disabled:opacity-50'

  const chipColumn = (on: boolean) =>
    on
      ? 'w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-left text-[11px] font-medium leading-snug text-white shadow-sm disabled:opacity-50'
      : 'w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-[11px] font-medium leading-snug text-slate-800 hover:border-slate-300 hover:bg-white disabled:opacity-50'

  return (
    <div className="space-y-2">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Opzioni rapide</span>
        {gruppiRapidi?.length ? (
          <div
            className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] md:grid md:snap-none md:grid-cols-3 md:overflow-x-visible md:pb-0 xl:grid-cols-6"
            role="group"
            aria-label="Opzioni rapide esame obiettivo per categoria"
          >
            {gruppiRapidi.map((g) => (
              <div
                key={g.title}
                className="flex min-w-[10.25rem] shrink-0 snap-start flex-col rounded-md border border-slate-200 bg-slate-100/80 shadow-sm md:min-w-0"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-600">{g.title}</div>
                </div>
                <div className="flex max-h-[min(40vh,16rem)] flex-col gap-1 overflow-y-auto overscroll-y-contain p-1.5 md:max-h-[min(50vh,22rem)]">
                  {g.labels.length === 0 ? (
                    <span className="px-1 py-2 text-center text-[11px] text-slate-400">Nessuna voce</span>
                  ) : null}
                  {g.labels.map((label) => {
                    const on = set.has(label)
                    return (
                      <button
                        key={`${g.title}-${label}`}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          const next = new Set(selected)
                          if (next.has(label)) next.delete(label)
                          else next.add(label)
                          onSelectionChange([...next])
                        }}
                        className={chipColumn(on)}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {flatLabels.map((label) => {
              const on = set.has(label)
              return (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const next = new Set(selected)
                    if (next.has(label)) next.delete(label)
                    else next.add(label)
                    onSelectionChange([...next])
                  }}
                  className={chipFlat(on)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <label className="block text-[13px]">
        <span className="font-medium text-slate-700">Note esame obiettivo</span>
        <textarea
          disabled={disabled}
          rows={3}
          defaultValue={note}
          onBlur={(e) => onNoteBlur(e.target.value)}
          placeholder="Dettagli aggiuntivi…"
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-[13px] leading-snug disabled:bg-slate-50"
        />
      </label>
    </div>
  )
}
