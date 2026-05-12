import { createContext, useMemo, type ReactNode } from 'react'
import { getRankTheme, type RankTheme } from '../theme/rankTheme'
import type { UserRank } from '../types/userProfile'

/* eslint-disable react-refresh/only-export-components -- Context + Provider pattern */
export const RankThemeContext = createContext<RankTheme | null>(null)

export function RankThemeProvider({
  rank,
  children,
}: {
  rank: UserRank | undefined | null
  children: ReactNode
}) {
  const value = useMemo(() => getRankTheme(rank), [rank])
  return <RankThemeContext.Provider value={value}>{children}</RankThemeContext.Provider>
}
/* eslint-enable react-refresh/only-export-components */
