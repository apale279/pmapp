/** Segmento URL dopo `/manifestazione/` (id documento Firestore). */
export function parseManifestazioneIdFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/manifestazione\/([^/]+)/)
  return m ? decodeURIComponent(m[1]) : undefined
}

/** Segmento URL dopo `/pma/` (id documento PMA). */
export function parsePmaIdFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/pma\/([^/]+)/)
  return m ? decodeURIComponent(m[1]) : undefined
}
