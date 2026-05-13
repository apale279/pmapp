/** UI base: scala tipografica operativa (sm ≈ 14px). */
export const FONT_UI =
  'font-[Inter,ui-sans-serif,system-ui,sans-serif] text-sm leading-normal antialiased'

export const opNavBtn =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#374151] transition-colors hover:bg-white hover:text-[#2563eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

export const opNavBtnActive =
  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-[#2563eb] shadow-[inset_3px_0_0_0_#2563eb] hover:text-[#2563eb]'

/** Pulsante primario standard: h-40, scala testo sm. */
export const opPrimaryBtn =
  'inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-[#2563eb] px-4 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-40'

export const opSecondaryBtn =
  'inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-4 text-sm font-bold uppercase tracking-wide text-slate-900 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40'

/** Toolbar dashboard / azioni secondarie: stessa altezza dei primari. */
export const opToolbarBtnSm =
  'inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-[#e2e8f0] bg-white px-4 text-sm font-bold uppercase tracking-wide text-slate-900 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40'
