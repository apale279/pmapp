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

export function SyncLiveIndicator({
  variant = 'light',
  compact = false,
}: {
  variant?: 'light' | 'dark'
  compact?: boolean
}) {
  const { lastSyncAt, audioMuted, toggleAudioMuted } = useSyncLive()
  const isDark = variant === 'dark'
  const box = isDark
    ? 'border-white/15 bg-white/10 text-[#e8e8f8]'
    : 'border-[#e2e8f0] bg-[#f8fafc] text-slate-700'
  const btnHover = isDark ? 'hover:border-white/25 hover:bg-white/15' : 'hover:border-[#e2e8f0] hover:bg-white'
  const timeCls = isDark ? 'text-[#f0f0ff]' : 'text-slate-900'

  return (
    <div
      className={`flex h-10 min-h-10 shrink-0 items-center rounded-md border font-medium ${box} ${
        compact ? 'gap-0 px-0.5 py-0 text-[10px]' : 'gap-2 px-2 py-1 text-sm'
      }`}
    >
      <button
        type="button"
        onClick={() => toggleAudioMuted()}
        className={`pma-theme-skip flex shrink-0 items-center justify-center rounded border border-transparent leading-none ${btnHover} ${
          compact ? 'h-9 w-9 text-sm' : 'h-8 w-8 text-lg'
        }`}
        title={audioMuted ? 'Audio disattivato' : 'Audio attivo'}
        aria-pressed={audioMuted}
        aria-label={audioMuted ? 'Riattiva indicatore audio' : 'Disattiva indicatore audio'}
      >
        <span aria-hidden>{audioMuted ? '🔇' : '🔊'}</span>
      </button>
      {compact ? (
        <span className="sr-only">
          {lastSyncAt != null
            ? `Ultimo aggiornamento dati da Firestore: ${formatTime(lastSyncAt)}`
            : 'Ultimo aggiornamento dati: non disponibile'}
        </span>
      ) : (
        <span
          className={`min-w-0 truncate font-mono font-semibold leading-none ${timeCls} text-[11px] sm:text-xs`}
          title="Ultimo aggiornamento dati da Firestore"
        >
          {lastSyncAt != null ? formatTime(lastSyncAt) : '—'}
        </span>
      )}
    </div>
  )
}
