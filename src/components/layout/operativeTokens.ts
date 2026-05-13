/** UI base: scala tipografica operativa (sm ≈ 14px). */
export const FONT_UI =
  'font-[Inter,ui-sans-serif,system-ui,sans-serif] text-sm leading-normal antialiased'

/**
 * Esclude il pulsante dallo stile chip globale (`pma-theme.css`):
 * menu app, overlay, pulsanti solo simbolo / icona.
 */
export const opNavBtn =
  'pma-theme-skip flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#374151] transition-colors hover:bg-white hover:text-[#2563eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

export const opNavBtnActive =
  'pma-theme-skip relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-[#2563eb] shadow-[inset_3px_0_0_0_#2563eb] hover:text-[#2563eb]'

/** Stessa scala di `.pma-pill` (variabili tema); il CSS globale in index.css completa il look. */
const opChipCore =
  'pma-action-chip inline-flex min-h-[var(--pma-touch-min)] shrink-0 items-center justify-center gap-1.5 rounded-[30px] border border-[color:var(--pma-bianco-border)] bg-[color:var(--pma-bianco-bg)] px-[14px] py-[var(--pma-pill-pad-v)] text-[calc(var(--pma-value-size)_-_1px)] font-normal leading-normal tracking-normal text-[color:var(--pma-bianco-text)] shadow-sm transition-colors hover:border-slate-500 hover:bg-white hover:text-[color:var(--pma-bianco-text)] disabled:pointer-events-none disabled:opacity-40'

/** Pulsante primario / azioni principali — stesso chip neutro degli altri. */
export const opPrimaryBtn = opChipCore

export const opSecondaryBtn = opChipCore

/** Toolbar dashboard / azioni secondarie. */
export const opToolbarBtnSm = opChipCore
