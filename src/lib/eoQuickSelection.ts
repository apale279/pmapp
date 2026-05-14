/** Opzione “nessuna” negli elenchi EO rapido (manifestazione / cartella). */
export function isNessunaEoOptionLabel(label: string): boolean {
  const t = label.trim()
  if (!t) return false
  return t.toUpperCase() === 'NESSUNA' || t.toUpperCase() === 'NESSUNO'
}

/** Garantisce «NESSUNO» come prima voce (mutuamente esclusiva gestita in `toggleEoQuickSelection`). */
export function ensureEoNessunoFirstLabels(labels: string[]): string[] {
  const nonNessuno = labels
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !isNessunaEoOptionLabel(x))
  return ['NESSUNO', ...nonNessuno]
}

/**
 * Toggle chip in selezione multipla EO: “NESSUNA” è mutuamente esclusiva con le altre voci.
 */
export function toggleEoQuickSelection(prev: string[], label: string): string[] {
  const set = new Set(prev)
  const had = set.has(label)
  if (had) {
    set.delete(label)
    return [...set]
  }
  if (isNessunaEoOptionLabel(label)) {
    return [label]
  }
  for (const x of [...set]) {
    if (isNessunaEoOptionLabel(x)) set.delete(x)
  }
  set.add(label)
  return [...set]
}

export function nessunaEoOptionDisabled(
  disabled: boolean | undefined,
  _colSelected: string[],
  _label: string,
): boolean {
  if (disabled) return true
  return false
}

/** Primo valore della colonna = default (“normale”). Lista già ordinata dalla manifestazione. */
export function firstEoDefaultLabelFromLabels(labels: readonly string[]): string {
  const first = labels.map((x) => x.trim()).find(Boolean)
  return first ?? 'NESSUNO'
}

/**
 * Il **primo valore** della lista è il default (normale), sempre compatibile con le altre voci:
 * - click sul primo → solo `[primo]` (deseleziona tutto il resto);
 * - click su un altro valore → il primo viene tolto; si fa toggle su quella voce tra le rimanenti;
 * - se non resta nessuna voce selezionata → torna al solo default `[primo]`.
 */
export function toggleEoQuickFirstDefaultExclusive(
  prev: string[],
  label: string,
  firstLabel: string,
): string[] {
  const fKey = firstLabel.trim()
  const lKey = label.trim()
  if (!fKey) return toggleEoQuickSelection(prev, label)

  if (lKey === fKey) {
    return [firstLabel]
  }

  const withoutFirst = prev.filter((x) => x.trim() !== fKey)
  const pool = [...withoutFirst, label]
  const keySet = new Set(withoutFirst.map((x) => x.trim()))
  if (keySet.has(lKey)) {
    keySet.delete(lKey)
  } else {
    keySet.add(lKey)
  }

  const out: string[] = []
  for (const k of keySet) {
    const found = pool.find((p) => p.trim() === k)
    if (found && !out.some((o) => o.trim() === k)) out.push(found)
  }
  if (out.length === 0) return [firstLabel]
  return out
}
