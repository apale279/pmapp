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

export function SyncLiveIndicator() {
  const { lastSyncAt, audioMuted, toggleAudioMuted } = useSyncLive()

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1 text-[11px] text-slate-700">
      <button
        type="button"
        onClick={() => toggleAudioMuted()}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-transparent text-lg leading-none hover:border-[#e2e8f0] hover:bg-white"
        title={audioMuted ? 'Audio disattivato' : 'Audio attivo'}
        aria-pressed={audioMuted}
        aria-label={audioMuted ? 'Riattiva indicatore audio' : 'Disattiva indicatore audio'}
      >
        <span aria-hidden>{audioMuted ? '🔇' : '🔊'}</span>
      </button>
      <span className="min-w-0 truncate" title="Ultimo aggiornamento dati da Firestore">
        <span className="font-semibold uppercase tracking-wide text-slate-500">Sync</span>{' '}
        <span className="font-mono text-xs text-slate-900">
          {lastSyncAt != null ? formatTime(lastSyncAt) : '—'}
        </span>
      </span>
    </div>
  )
}
