import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type SyncLiveValue = {
  lastSyncAt: number | null
  bumpSync: () => void
  audioMuted: boolean
  setAudioMuted: (muted: boolean) => void
  toggleAudioMuted: () => void
}

const SyncLiveContext = createContext<SyncLiveValue | null>(null)

const STORAGE_KEY = 'pmapp_audio_muted'

function readInitialMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function SyncLiveProvider({ children }: { children: ReactNode }) {
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [audioMuted, setAudioMutedState] = useState(readInitialMuted)

  const bumpSync = useCallback(() => {
    setLastSyncAt(Date.now())
  }, [])

  const setAudioMuted = useCallback((muted: boolean) => {
    setAudioMutedState(muted)
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const toggleAudioMuted = useCallback(() => {
    setAudioMutedState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      lastSyncAt,
      bumpSync,
      audioMuted,
      setAudioMuted,
      toggleAudioMuted,
    }),
    [lastSyncAt, bumpSync, audioMuted, setAudioMuted, toggleAudioMuted],
  )

  return <SyncLiveContext.Provider value={value}>{children}</SyncLiveContext.Provider>
}

export function useSyncLive(): SyncLiveValue {
  const ctx = useContext(SyncLiveContext)
  if (!ctx) {
    return {
      lastSyncAt: null,
      bumpSync: () => {},
      audioMuted: false,
      setAudioMuted: () => {},
      toggleAudioMuted: () => {},
    }
  }
  return ctx
}
