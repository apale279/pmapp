import { useCallback, useState } from 'react'
import type { Pma } from '../../types/pma'

function CopyableMonoValue({ label, value, emptyLabel }: { label: string; value: string; emptyLabel?: string }) {
  const [copied, setCopied] = useState(false)
  const [copyErr, setCopyErr] = useState<string | null>(null)
  const display = value.trim() || emptyLabel || '—'
  const canCopy = value.trim() !== ''

  const handleCopy = useCallback(async () => {
    if (!canCopy) return
    setCopyErr(null)
    try {
      await navigator.clipboard.writeText(value.trim())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyErr('Copia negli appunti non riuscita.')
    }
  }, [canCopy, value])

  return (
    <div className="space-y-1">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="flex flex-wrap items-center gap-2">
        <code
          className={`block max-w-full break-all rounded border px-2.5 py-1.5 font-mono text-xs ${
            canCopy ? 'border-slate-200 bg-white text-slate-800' : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {display}
        </code>
        {canCopy ? (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
          >
            {copied ? 'Copiato' : 'Copia'}
          </button>
        ) : null}
      </dd>
      {copyErr ? (
        <p className="text-xs text-red-600" role="alert">
          {copyErr}
        </p>
      ) : null}
    </div>
  )
}

type Props = {
  manifestazioneId: string
  pmaList: Pma[]
  loading?: boolean
}

export function CentraleZonaTecnicaPanel({ manifestazioneId, pmaList, loading }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <section
      aria-labelledby="centrale-tecnica-heading"
      className="mt-10 rounded-xl border border-dashed border-slate-300 bg-slate-50/90 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="centrale-tecnica-heading" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Zona tecnica
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            ID manifestazione e token CROSS dei PMA collegati (solo consultazione).
          </p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="centrale-tecnica-panel"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-[var(--pma-touch-min)] items-center justify-center rounded-full border border-slate-400 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-800 shadow-sm hover:bg-slate-100"
        >
          {open ? 'Nascondi dati tecnici' : 'Mostra dati tecnici'}
        </button>
      </div>

      {open ? (
        <div id="centrale-tecnica-panel" className="mt-5 space-y-6 border-t border-slate-200 pt-5">
          <dl>
            <CopyableMonoValue label="ID manifestazione" value={manifestazioneId} />
          </dl>

          {loading ? <p className="text-sm text-slate-600">Caricamento PMA…</p> : null}

          {!loading && pmaList.length === 0 ? (
            <p className="text-sm text-slate-600">Nessun PMA collegato a questa manifestazione.</p>
          ) : null}

          {!loading && pmaList.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Token PMA (CROSS)</h3>
              <ul className="space-y-4">
                {pmaList.map((pma) => (
                  <li
                    key={pma.id}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-slate-900">{pma.nome}</p>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-1">
                      <CopyableMonoValue label="ID PMA" value={pma.id} />
                      <CopyableMonoValue
                        label="Token CROSS"
                        value={pma.token ?? ''}
                        emptyLabel="Token non presente"
                      />
                    </dl>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
