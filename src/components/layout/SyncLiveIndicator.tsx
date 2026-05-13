import { useSyncLive } from '../../context/SyncLiveContext'

function formatTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(ms))
  } catch {
    return new Date(ms).toLocaleTimeString('it-IT')
  }
}

export function SyncLiveIndicator({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { lastSyncAt, audioMuted, toggleAudioMuted } = useSyncLive()
  const isDark = variant === 'dark'
  const box = isDark
    ? 'border-white/15 bg-white/10 text-[#e8e8f8]'
    : 'border-[#e2e8f0] bg-[#f8fafc] text-slate-700'
  const btnHover = isDark ? 'hover:border-white/25 hover:bg-white/15' : 'hover:border-[#e2e8f0] hover:bg-white'
  const labelMuted = isDark ? 'text-[#b4b4d4]' : 'text-slate-500'
  const time = isDark ? 'text-[#f0f0ff]' : 'text-slate-900'

  return (
    <div className={`flex min-w-0 shrink-0 items-center gap-2 rounded-md border px-2 py-1 text-sm font-medium ${box}`}>
      <button
        type="button"
        onClick={() => toggleAudioMuted()}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border border-transparent text-lg leading-none ${btnHover}`}
        title={audioMuted ? 'Audio disattivato' : 'Audio attivo'}
        aria-pressed={audioMuted}
        aria-label={audioMuted ? 'Riattiva indicatore audio' : 'Disattiva indicatore audio'}
      >
        <span aria-hidden>{audioMuted ? '🔇' : '🔊'}</span>
      </button>
      <span className="min-w-0 truncate" title="Ultimo aggiornamento dati da Firestore">
        <span className={`font-semibold uppercase tracking-wide ${labelMuted}`}>Sync</span>{' '}
        <span className={`font-mono text-xs ${time}`}>
          {lastSyncAt != null ? formatTime(lastSyncAt) : '—'}
        </span>
      </span>
    </div>
  )
}
