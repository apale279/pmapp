import type { UserRank } from '../types/userProfile'

/**
 * Palette operativa per rank (Tailwind — classi letterali per la JIT).
 * Superadmin: autorità · Centrale: coordinamento · Medico/Infermiere: clinica · ecc.
 */
export type RankTheme = {
  /** Sfondo topbar / fascia sidebar brand */
  headerBg: string
  headerBorder: string
  headerText: string
  headerTextMuted: string
  /** Badge ruolo (MAIUSCOLO) su sfondo rank */
  rankBadge: string
  /** Pulsante secondario (es. Logout) su barra colorata */
  headerButton: string
  /** Voce nav attiva (sidebar chiara) */
  navActive: string
  /** Separatore interno fascia brand / operatore */
  bannerDivider: string
  /** Bordo sinistro “accent” su card dashboard */
  cardAccentLeft: string
  /** Shell card: bordo grigio + accento */
  cardShell: string
  /** CTA primaria (pulsanti principali in pagina) */
  primaryCta: string
  primaryCtaHover: string
  /** Spinner: bordo superiore su cerchio */
  spinnerAccent: string
}

const FALLBACK: RankTheme = {
  headerBg: 'bg-slate-800',
  headerBorder: 'border-slate-700',
  headerText: 'text-white',
  headerTextMuted: 'text-white/75',
  bannerDivider: 'border-white/10',
  rankBadge: 'bg-white/15 text-white ring-1 ring-white/25',
  headerButton:
    'border border-white/30 bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
  navActive: 'bg-slate-900 text-white',
  cardAccentLeft: 'border-l-slate-700',
  cardShell: 'rounded-xl border border-slate-200 border-l-4 border-l-slate-700 bg-white p-5 shadow-sm',
  primaryCta: 'bg-slate-900 text-white shadow-sm',
  primaryCtaHover: 'hover:bg-slate-800',
  spinnerAccent: 'border-slate-200 border-t-slate-800',
}

const SUPERADMIN: RankTheme = {
  headerBg: 'bg-slate-900',
  headerBorder: 'border-slate-800',
  headerText: 'text-white',
  headerTextMuted: 'text-white/70',
  bannerDivider: 'border-white/10',
  rankBadge: 'bg-white/10 text-white ring-1 ring-white/20',
  headerButton:
    'border border-white/25 bg-white/10 text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
  navActive: 'bg-slate-900 text-white',
  cardAccentLeft: 'border-l-slate-900',
  cardShell: 'rounded-xl border border-slate-200 border-l-4 border-l-slate-900 bg-white p-5 shadow-sm',
  primaryCta: 'bg-slate-900 text-white shadow-sm',
  primaryCtaHover: 'hover:bg-slate-800',
  spinnerAccent: 'border-slate-200 border-t-slate-900',
}

const CENTRALE: RankTheme = {
  headerBg: 'bg-blue-700',
  headerBorder: 'border-blue-800',
  headerText: 'text-white',
  headerTextMuted: 'text-white/80',
  bannerDivider: 'border-white/10',
  rankBadge: 'bg-white/15 text-white ring-1 ring-white/30',
  headerButton:
    'border border-white/30 bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
  navActive: 'bg-blue-100 text-blue-950 font-medium ring-1 ring-blue-700/15',
  cardAccentLeft: 'border-l-blue-700',
  cardShell: 'rounded-xl border border-slate-200 border-l-4 border-l-blue-700 bg-white p-5 shadow-sm',
  primaryCta: 'bg-blue-700 text-white shadow-sm',
  primaryCtaHover: 'hover:bg-blue-800',
  spinnerAccent: 'border-slate-200 border-t-blue-700',
}

const MEDICO: RankTheme = {
  headerBg: 'bg-red-700',
  headerBorder: 'border-red-800',
  headerText: 'text-white',
  headerTextMuted: 'text-white/85',
  bannerDivider: 'border-white/10',
  rankBadge: 'bg-white/15 text-white ring-1 ring-white/30',
  headerButton:
    'border border-white/30 bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
  navActive: 'bg-red-50 text-red-950 font-medium ring-1 ring-red-700/20',
  cardAccentLeft: 'border-l-red-700',
  cardShell: 'rounded-xl border border-slate-200 border-l-4 border-l-red-700 bg-white p-5 shadow-sm',
  primaryCta: 'bg-red-700 text-white shadow-sm',
  primaryCtaHover: 'hover:bg-red-800',
  spinnerAccent: 'border-slate-200 border-t-red-700',
}

const INFERMIERE: RankTheme = {
  headerBg: 'bg-emerald-600',
  headerBorder: 'border-emerald-700',
  headerText: 'text-white',
  headerTextMuted: 'text-white/85',
  bannerDivider: 'border-white/10',
  rankBadge: 'bg-white/15 text-white ring-1 ring-white/30',
  headerButton:
    'border border-white/30 bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
  navActive: 'bg-emerald-50 text-emerald-950 font-medium ring-1 ring-emerald-600/20',
  cardAccentLeft: 'border-l-emerald-600',
  cardShell: 'rounded-xl border border-slate-200 border-l-4 border-l-emerald-600 bg-white p-5 shadow-sm',
  primaryCta: 'bg-emerald-600 text-white shadow-sm',
  primaryCtaHover: 'hover:bg-emerald-700',
  spinnerAccent: 'border-slate-200 border-t-emerald-600',
}

/** Amber-500: testo scuro per contrasto WCAG su sfondo chiaro/medio */
const SOCCORRITORE: RankTheme = {
  headerBg: 'bg-amber-500',
  headerBorder: 'border-amber-600',
  headerText: 'text-slate-900',
  headerTextMuted: 'text-slate-800/90',
  bannerDivider: 'border-slate-900/10',
  rankBadge: 'bg-slate-900/10 text-slate-900 ring-1 ring-slate-900/15',
  headerButton:
    'border border-slate-900/20 bg-slate-900/5 text-slate-900 hover:bg-slate-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
  navActive: 'bg-amber-50 text-amber-950 font-medium ring-1 ring-amber-500/30',
  cardAccentLeft: 'border-l-amber-500',
  cardShell: 'rounded-xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-5 shadow-sm',
  primaryCta: 'bg-amber-500 text-slate-900 shadow-sm',
  primaryCtaHover: 'hover:bg-amber-400',
  spinnerAccent: 'border-slate-200 border-t-amber-500',
}

const TRIAGE: RankTheme = {
  headerBg: 'bg-purple-600',
  headerBorder: 'border-purple-700',
  headerText: 'text-white',
  headerTextMuted: 'text-white/85',
  bannerDivider: 'border-white/10',
  rankBadge: 'bg-white/15 text-white ring-1 ring-white/30',
  headerButton:
    'border border-white/30 bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
  navActive: 'bg-purple-50 text-purple-950 font-medium ring-1 ring-purple-600/20',
  cardAccentLeft: 'border-l-purple-600',
  cardShell: 'rounded-xl border border-slate-200 border-l-4 border-l-purple-600 bg-white p-5 shadow-sm',
  primaryCta: 'bg-purple-600 text-white shadow-sm',
  primaryCtaHover: 'hover:bg-purple-700',
  spinnerAccent: 'border-slate-200 border-t-purple-600',
}

const BY_RANK: Record<UserRank, RankTheme> = {
  Superadmin: SUPERADMIN,
  Centrale: CENTRALE,
  Medico: MEDICO,
  Infermiere: INFERMIERE,
  Soccorritore: SOCCORRITORE,
  Triage: TRIAGE,
}

export function getRankTheme(rank: UserRank | undefined | null): RankTheme {
  if (!rank) return FALLBACK
  return BY_RANK[rank] ?? FALLBACK
}
