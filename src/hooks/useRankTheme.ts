import { useContext } from 'react'
import { RankThemeContext } from '../context/RankThemeContext'
import { getRankTheme } from '../theme/rankTheme'

export function useRankTheme() {
  const ctx = useContext(RankThemeContext)
  if (!ctx) {
    return getRankTheme(undefined)
  }
  return ctx
}
