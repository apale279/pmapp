import { Timestamp } from 'firebase/firestore'
import { datetimeLocalToTimestamp, toDatetimeLocal } from '../../lib/schedaDatetimeLocal'
import type { Paziente } from '../../types/paziente'

const CODICI_TRASPORTO = ['verde', 'giallo', 'rosso'] as const

type Props = {
  p: Paziente
  /** Eccezione lock: non dipende da `aperto`. */
  writeInvio: (patch: Record<string, unknown>) => Promise<void>
}

/**
 * Sezione 5 — Dati invio ospedale (solo esito dimissione = Invio in PS).
 * Resta editabile anche con scheda chiusa (`aperto === false`).
 */
export function InvioOspedaleSection({ p, writeInvio }: Props) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Sezione 5 — Dati invio ospedale
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Compilabile anche con scheda chiusa, per completare i dati AREU / trasporto dopo la
          dimissione con esito <strong>Invio in PS</strong>.
        </p>
      </div>

      <div className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">N° missione AREU</span>
          <input
            key={`areu-${p.id}-${p.invio_ps_missione_areu ?? 'x'}`}
            type="number"
            min={0}
            step={1}
            defaultValue={p.invio_ps_missione_areu ?? ''}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v === '') {
                void writeInvio({ invio_ps_missione_areu: null })
                return
              }
              const n = Number(v)
              if (Number.isFinite(n)) void writeInvio({ invio_ps_missione_areu: Math.floor(n) })
            }}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Data e ora</span>
          <input
            key={`dto-${p.id}-${p.invio_ps_data_ora?.toMillis?.() ?? 'empty'}`}
            type="datetime-local"
            defaultValue={p.invio_ps_data_ora ? toDatetimeLocal(p.invio_ps_data_ora) : ''}
            onBlur={(e) => {
              const ts = datetimeLocalToTimestamp(e.target.value)
              if (ts) void writeInvio({ invio_ps_data_ora: ts })
            }}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            className="mt-2 text-xs font-medium text-slate-600 underline hover:text-slate-900"
            onClick={() => void writeInvio({ invio_ps_data_ora: Timestamp.now() })}
          >
            Imposta a ora corrente
          </button>
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Mezzo</span>
          <input
            key={`mezzo-${p.id}-${p.invio_ps_mezzo}`}
            type="text"
            defaultValue={p.invio_ps_mezzo}
            onBlur={(e) => void writeInvio({ invio_ps_mezzo: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Ospedale di destinazione</span>
          <input
            key={`osp-${p.id}-${p.invio_ps_ospedale}`}
            type="text"
            defaultValue={p.invio_ps_ospedale}
            onBlur={(e) => void writeInvio({ invio_ps_ospedale: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Codice trasporto</span>
          <select
            value={p.invio_ps_codice_trasporto ?? ''}
            onChange={(e) => {
              const v = e.target.value
              void writeInvio({
                invio_ps_codice_trasporto:
                  v === '' ? null : (v as (typeof CODICI_TRASPORTO)[number]),
              })
            }}
            className="mt-1 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Seleziona —</option>
            {CODICI_TRASPORTO.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Note trasporto</span>
          <textarea
            key={`note-${p.id}-${p.invio_ps_note}`}
            rows={4}
            defaultValue={p.invio_ps_note}
            onBlur={(e) => void writeInvio({ invio_ps_note: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
    </section>
  )
}
