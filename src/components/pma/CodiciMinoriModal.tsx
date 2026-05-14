import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { datetimeLocalToTimestamp, toDatetimeLocal } from '../../lib/schedaDatetimeLocal'
import { createCodiceMinore, updateCodiceMinore } from '../../lib/codiciMinoriFirestore'
import { useCodiciMinoriForPma } from '../../hooks/useCodiciMinoriForPma'
import { useIsSmartphone } from '../../hooks/useIsSmartphone'
import type { CodiceMinore } from '../../types/codiceMinore'

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7v6l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

type Draft = {
  ora_accesso: string
  numero_pettorale: string
  motivo_accesso: string
  prestazioni: string
}

function emptyDraft(): Draft {
  return {
    ora_accesso: toDatetimeLocal(Timestamp.now()),
    numero_pettorale: '',
    motivo_accesso: '',
    prestazioni: '',
  }
}

function parsePettorale(s: string): number | null {
  const t = s.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function CodiceMinoreRow({ row, spinnerClass }: { row: CodiceMinore; spinnerClass: string }) {
  const [oraAcc, setOraAcc] = useState(() => toDatetimeLocal(row.ora_accesso))
  const [pett, setPett] = useState(
    () => (row.numero_pettorale !== null && row.numero_pettorale !== undefined ? String(row.numero_pettorale) : ''),
  )
  const [motivo, setMotivo] = useState(row.motivo_accesso)
  const [prest, setPrest] = useState(row.prestazioni)
  const [oraDim, setOraDim] = useState(() => toDatetimeLocal(row.ora_dimissione))

  useEffect(() => {
    setOraAcc(toDatetimeLocal(row.ora_accesso))
    setPett(row.numero_pettorale !== null && row.numero_pettorale !== undefined ? String(row.numero_pettorale) : '')
    setMotivo(row.motivo_accesso)
    setPrest(row.prestazioni)
    setOraDim(toDatetimeLocal(row.ora_dimissione))
  }, [
    row.id,
    row.ora_accesso?.toMillis?.(),
    row.numero_pettorale,
    row.motivo_accesso,
    row.prestazioni,
    row.ora_dimissione?.toMillis?.(),
  ])

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const flushOraAccesso = useCallback(async () => {
    const ts = datetimeLocalToTimestamp(oraAcc)
    if (!ts) return
    if (ts.toMillis() === row.ora_accesso.toMillis()) return
    setBusy(true)
    setErr(null)
    try {
      await updateCodiceMinore(row.id, { ora_accesso: ts })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setBusy(false)
    }
  }, [oraAcc, row.id, row.ora_accesso])

  const flushPettorale = useCallback(async () => {
    const next = parsePettorale(pett)
    const prev = row.numero_pettorale
    if (next === prev) return
    setBusy(true)
    setErr(null)
    try {
      await updateCodiceMinore(row.id, { numero_pettorale: next })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setBusy(false)
    }
  }, [pett, row.id, row.numero_pettorale])

  const flushMotivo = useCallback(async () => {
    const t = motivo.trim()
    if (t === row.motivo_accesso) return
    setBusy(true)
    setErr(null)
    try {
      await updateCodiceMinore(row.id, { motivo_accesso: t })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setBusy(false)
    }
  }, [motivo, row.id, row.motivo_accesso])

  const flushPrest = useCallback(async () => {
    const t = prest.trim()
    if (t === row.prestazioni) return
    setBusy(true)
    setErr(null)
    try {
      await updateCodiceMinore(row.id, { prestazioni: t })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setBusy(false)
    }
  }, [prest, row.id, row.prestazioni])

  const flushOraDim = useCallback(async () => {
    const ts = datetimeLocalToTimestamp(oraDim)
    const prevMs = row.ora_dimissione?.toMillis?.() ?? null
    const nextMs = ts?.toMillis() ?? null
    if (nextMs === prevMs) return
    setBusy(true)
    setErr(null)
    try {
      await updateCodiceMinore(row.id, { ora_dimissione: ts })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setBusy(false)
    }
  }, [oraDim, row.id, row.ora_dimissione])

  const setDimissioneNow = useCallback(async () => {
    const now = Timestamp.now()
    setOraDim(toDatetimeLocal(now))
    setBusy(true)
    setErr(null)
    try {
      await updateCodiceMinore(row.id, { ora_dimissione: now })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setBusy(false)
    }
  }, [row.id])

  const cell = 'border-b border-slate-100 px-1 py-0.5 align-middle'
  const inputCls =
    'w-full min-w-0 rounded border border-slate-200 bg-white px-1.5 py-1 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30'

  return (
    <Fragment>
      <tr className={busy ? 'opacity-70' : ''}>
        <td className={cell}>
          <input
            type="datetime-local"
            value={oraAcc}
            onChange={(e) => setOraAcc(e.target.value)}
            onBlur={() => void flushOraAccesso()}
            className={inputCls}
            step={60}
          />
        </td>
        <td className={`${cell} w-[4.25rem]`}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={pett}
            onChange={(e) => setPett(e.target.value)}
            onBlur={() => void flushPettorale()}
            className={inputCls}
            placeholder="—"
          />
        </td>
        <td className={cell}>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            onBlur={() => void flushMotivo()}
            className={inputCls}
            maxLength={200}
          />
        </td>
        <td className={cell}>
          <input
            type="text"
            value={prest}
            onChange={(e) => setPrest(e.target.value)}
            onBlur={() => void flushPrest()}
            className={inputCls}
            maxLength={200}
          />
        </td>
        <td className={cell}>
          <div className="flex min-w-0 items-center gap-0.5">
            <input
              type="datetime-local"
              value={oraDim}
              onChange={(e) => setOraDim(e.target.value)}
              onBlur={() => void flushOraDim()}
              className={`${inputCls} min-w-0 flex-1`}
              step={60}
            />
            <button
              type="button"
              title="Imposta ora dimissione adesso"
              onClick={() => void setDimissioneNow()}
              className="pma-theme-skip flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <IconClock className="shrink-0" />
            </button>
          </div>
        </td>
        <td className={`${cell} w-7 text-center`}>
          {busy ? (
            <span className={`inline-block h-3 w-3 animate-spin rounded-full border ${spinnerClass}`} aria-hidden />
          ) : null}
        </td>
      </tr>
      {err ? (
        <tr>
          <td colSpan={6} className="border-b border-red-100 bg-red-50/90 px-2 py-0.5 text-xs text-red-800">
            {err}
          </td>
        </tr>
      ) : null}
    </Fragment>
  )
}

function CodiceMinoreMobileDetailSheet({
  row,
  spinnerClass,
  th,
  onClose,
}: {
  row: CodiceMinore
  spinnerClass: string
  th: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/45 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="codice-minore-detail-title"
        className="max-h-[min(90vh,34rem)] w-full max-w-lg overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="min-w-0">
            <h3 id="codice-minore-detail-title" className="truncate text-sm font-bold text-slate-900">
              Dettaglio · pett. {row.numero_pettorale ?? '—'}
            </h3>
            <p className="truncate text-xs text-slate-500">{row.motivo_accesso?.trim() || '—'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pma-theme-skip shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold uppercase text-slate-800 hover:bg-slate-50"
          >
            Chiudi
          </button>
        </div>
        <div className="max-h-[calc(min(90vh,34rem)-4rem)] overflow-auto p-2 sm:max-h-[calc(85vh-4rem)]">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className={th}>Ora accesso</th>
                <th className={th}>Pett.</th>
                <th className={th}>Motivo</th>
                <th className={th}>Prestazioni</th>
                <th className={th}>Ora dimissione</th>
                <th className={`${th} w-7`} aria-hidden />
              </tr>
            </thead>
            <tbody>
              <CodiceMinoreRow row={row} spinnerClass={spinnerClass} />
            </tbody>
          </table>
          <p className="mt-2 px-1 text-center text-[11px] leading-snug text-slate-500">
            Scorri orizzontalmente per modificare tutti i campi.
          </p>
        </div>
      </div>
    </div>
  )
}

export type CodiciMinoriModalProps = {
  open: boolean
  onClose: () => void
  idManifestazione: string
  pmaId: string
  spinnerClass: string
}

export function CodiciMinoriModal({
  open,
  onClose,
  idManifestazione,
  pmaId,
  spinnerClass,
}: CodiciMinoriModalProps) {
  const activePma = open && pmaId.trim() ? pmaId.trim() : undefined
  const { items, loading, error } = useCodiciMinoriForPma(activePma)

  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [draftBusy, setDraftBusy] = useState(false)
  const [draftErr, setDraftErr] = useState<string | null>(null)

  useEffect(() => {
    if (open) setDraft(emptyDraft())
  }, [open])

  const addFromDraft = useCallback(async () => {
    if (!idManifestazione.trim() || !pmaId.trim()) return
    const ora = datetimeLocalToTimestamp(draft.ora_accesso)
    if (!ora) {
      setDraftErr('Imposta un’ora di accesso valida.')
      return
    }
    setDraftBusy(true)
    setDraftErr(null)
    try {
      await createCodiceMinore({
        id_manifestazione: idManifestazione.trim(),
        id_pma: pmaId.trim(),
        ora_accesso: ora,
        numero_pettorale: parsePettorale(draft.numero_pettorale),
        motivo_accesso: draft.motivo_accesso,
        prestazioni: draft.prestazioni,
        ora_dimissione: null,
      })
      setDraft(emptyDraft())
    } catch (e) {
      setDraftErr(e instanceof Error ? e.message : 'Inserimento non riuscito.')
    } finally {
      setDraftBusy(false)
    }
  }, [draft, idManifestazione, pmaId])

  const addBlankRow = useCallback(async () => {
    if (!idManifestazione.trim() || !pmaId.trim()) return
    setDraftBusy(true)
    setDraftErr(null)
    try {
      await createCodiceMinore({
        id_manifestazione: idManifestazione.trim(),
        id_pma: pmaId.trim(),
        ora_accesso: Timestamp.now(),
        numero_pettorale: null,
        motivo_accesso: '',
        prestazioni: '',
        ora_dimissione: null,
      })
    } catch (e) {
      setDraftErr(e instanceof Error ? e.message : 'Inserimento non riuscito.')
    } finally {
      setDraftBusy(false)
    }
  }, [idManifestazione, pmaId])

  const smartphone = useIsSmartphone()
  const [detailRowId, setDetailRowId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) setDetailRowId(null)
  }, [open])

  useEffect(() => {
    if (!smartphone) setDetailRowId(null)
  }, [smartphone])

  useEffect(() => {
    if (detailRowId && !items.some((r) => r.id === detailRowId)) setDetailRowId(null)
  }, [detailRowId, items])

  const detailRow = useMemo((): CodiceMinore | null => {
    if (!detailRowId) return null
    return items.find((r) => r.id === detailRowId) ?? null
  }, [detailRowId, items])

  if (!open) return null

  const inputCls =
    'w-full min-w-0 rounded border border-blue-200 bg-white px-1.5 py-1 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500/30'
  const th = 'sticky top-0 z-[1] border-b border-slate-200 bg-slate-100 px-1 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500'
  const draftCell = 'border-b border-blue-100 bg-blue-50/40 px-1 py-0.5 align-middle'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-2 pt-6 sm:p-4 sm:pt-10"
      role="dialog"
      aria-modal
      aria-labelledby="codici-minori-title"
      onClick={() => {
        if (detailRowId) setDetailRowId(null)
        else onClose()
      }}
    >
      <div
        className="mb-8 w-full max-w-6xl rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pma-bar flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1 flex-col">
            <h2 id="codici-minori-title" className="pma-bar__id text-base font-semibold">
              Codici minori
            </h2>
            <p className="text-xs text-[#a8a8c8]">
              {smartphone
                ? 'Elenco compatto: tocca una riga per aprire il dettaglio completo.'
                : 'Registrazione rapida · sincronizzazione in tempo reale · ID record nascosto'}
            </p>
          </div>
          <div className="pma-bar__right flex-wrap">
            <button
              type="button"
              disabled={draftBusy}
              title="Aggiungi riga vuota in elenco"
              onClick={() => void addBlankRow()}
              className="inline-flex h-10 items-center gap-1 rounded border border-slate-300 bg-white px-4 text-sm font-bold uppercase text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <IconPlus />
              Nuova riga
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded border border-slate-300 bg-white px-4 text-sm font-bold uppercase text-slate-800 hover:bg-slate-50"
            >
              Chiudi
            </button>
          </div>
        </div>

        <div className="max-h-[min(78vh,40rem)] overflow-auto px-1 pb-2 sm:px-2">
          {error ? (
            <p className="m-2 text-xs text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {draftErr ? (
            <p className="m-2 text-xs text-red-700" role="alert">
              {draftErr}
            </p>
          ) : null}

          {smartphone ? (
            <>
              <section className="space-y-3 border-b border-slate-200 bg-blue-50/60 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Nuova registrazione</p>
                <div className="space-y-2">
                  <label className="block">
                    <span className="mb-0.5 block text-xs font-medium text-slate-600">Ora accesso</span>
                    <input
                      type="datetime-local"
                      value={draft.ora_accesso}
                      onChange={(e) => setDraft((d) => ({ ...d, ora_accesso: e.target.value }))}
                      className={inputCls}
                      step={60}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-0.5 block text-xs font-medium text-slate-600">N. pettorale</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={draft.numero_pettorale}
                      onChange={(e) => setDraft((d) => ({ ...d, numero_pettorale: e.target.value }))}
                      className={inputCls}
                      placeholder="—"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-0.5 block text-xs font-medium text-slate-600">Motivo ingresso</span>
                    <input
                      type="text"
                      value={draft.motivo_accesso}
                      onChange={(e) => setDraft((d) => ({ ...d, motivo_accesso: e.target.value }))}
                      className={inputCls}
                      maxLength={200}
                      placeholder="Motivo…"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-0.5 block text-xs font-medium text-slate-600">Prestazioni</span>
                    <input
                      type="text"
                      value={draft.prestazioni}
                      onChange={(e) => setDraft((d) => ({ ...d, prestazioni: e.target.value }))}
                      className={inputCls}
                      maxLength={200}
                      placeholder="Prestazioni…"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={draftBusy}
                    onClick={() => void addFromDraft()}
                    className="w-full rounded bg-blue-700 py-2.5 text-sm font-bold uppercase text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    Registra
                  </button>
                </div>
              </section>
              <ul className="min-h-[120px] divide-y divide-slate-200">
                {loading ? (
                  <li className="px-3 py-6 text-center text-xs text-slate-500">
                    <span className={`mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 ${spinnerClass}`} />
                    Caricamento…
                  </li>
                ) : null}
                {!loading && items.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-slate-500">Nessun codice minore registrato.</li>
                ) : null}
                {!loading
                  ? items.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          className="flex w-full items-start gap-3 px-3 py-3.5 text-left hover:bg-slate-50 active:bg-slate-100"
                          onClick={() => setDetailRowId(row.id)}
                        >
                          <span className="flex h-11 min-w-[2.85rem] shrink-0 items-center justify-center rounded-lg bg-slate-200 px-1 text-base font-bold tabular-nums text-slate-900">
                            {row.numero_pettorale != null ? row.numero_pettorale : '—'}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Motivo ingresso
                            </span>
                            <span className="line-clamp-3 text-sm leading-snug text-slate-800">
                              {row.motivo_accesso?.trim() ? row.motivo_accesso : '—'}
                            </span>
                          </span>
                          <span className="shrink-0 self-center text-lg font-light text-slate-400" aria-hidden>
                            ›
                          </span>
                        </button>
                      </li>
                    ))
                  : null}
              </ul>
            </>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className={th}>Ora accesso</th>
                  <th className={th}>Pett.</th>
                  <th className={th}>Motivo</th>
                  <th className={th}>Prestazioni</th>
                  <th className={th}>Ora dimissione</th>
                  <th className={`${th} w-7`} aria-hidden />
                </tr>
              </thead>
              <tbody>
                <tr className="bg-blue-50/50">
                  <td className={draftCell}>
                    <input
                      type="datetime-local"
                      value={draft.ora_accesso}
                      onChange={(e) => setDraft((d) => ({ ...d, ora_accesso: e.target.value }))}
                      className={inputCls}
                      step={60}
                    />
                  </td>
                  <td className={`${draftCell} w-[4.25rem]`}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={draft.numero_pettorale}
                      onChange={(e) => setDraft((d) => ({ ...d, numero_pettorale: e.target.value }))}
                      className={inputCls}
                      placeholder="—"
                    />
                  </td>
                  <td className={draftCell}>
                    <input
                      type="text"
                      value={draft.motivo_accesso}
                      onChange={(e) => setDraft((d) => ({ ...d, motivo_accesso: e.target.value }))}
                      className={inputCls}
                      maxLength={200}
                      placeholder="Motivo…"
                    />
                  </td>
                  <td className={draftCell}>
                    <input
                      type="text"
                      value={draft.prestazioni}
                      onChange={(e) => setDraft((d) => ({ ...d, prestazioni: e.target.value }))}
                      className={inputCls}
                      maxLength={200}
                      placeholder="Prestazioni…"
                    />
                  </td>
                  <td className={draftCell}>
                    <span className="text-xs text-slate-400">—</span>
                  </td>
                  <td className={`${draftCell} w-7 text-center`}>
                    <button
                      type="button"
                      disabled={draftBusy}
                      title="Registra (invia riga)"
                      onClick={() => void addFromDraft()}
                      className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded bg-blue-700 px-2 text-sm font-bold uppercase text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      OK
                    </button>
                  </td>
                </tr>

                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-center text-xs text-slate-500">
                      <span className={`mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 ${spinnerClass}`} />
                      Caricamento…
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? items.map((row) => <CodiceMinoreRow key={row.id} row={row} spinnerClass={spinnerClass} />)
                  : null}
              </tbody>
            </table>
          )}
        </div>
        {smartphone && detailRow ? (
          <CodiceMinoreMobileDetailSheet
            row={detailRow}
            spinnerClass={spinnerClass}
            th={th}
            onClose={() => setDetailRowId(null)}
          />
        ) : null}
      </div>
    </div>
  )
}
