import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useSyncLive } from '../../context/SyncLiveContext'
import {
  applyPmaImpostazioniImport,
  downloadPmaImpostazioniCsv,
  fetchPmaImpostazioniBundle,
  parsePmaImpostazioniCsv,
  type PmaImpostazioniExportBundle,
} from '../../lib/pmaImpostazioniCsv'

export type PmaCsvOption = { id: string; nome: string }

type Props = {
  manifestazioneId: string
  pmaOptions: PmaCsvOption[]
  canEdit: boolean
  /** PMA preselezionato (export sorgente / import destinazione fissa). */
  defaultPmaId?: string
  /** Se impostato, l'import aggiorna solo questo PMA (es. dashboard PMA). */
  fixedTargetPmaId?: string
  /** Export da draft pagina impostazioni; altrimenti lettura Firestore. */
  buildExportBundle?: (sourcePmaId: string) => Promise<PmaImpostazioniExportBundle>
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export function PmaImpostazioniCsvPanel({
  pmaOptions,
  canEdit,
  defaultPmaId,
  fixedTargetPmaId,
  buildExportBundle,
  onSuccess,
  onError,
}: Props) {
  const { bumpSync } = useSyncLive()
  const fileRef = useRef<HTMLInputElement>(null)

  const [exportPmaId, setExportPmaId] = useState(defaultPmaId ?? fixedTargetPmaId ?? '')
  const [importPmaId, setImportPmaId] = useState(fixedTargetPmaId ?? defaultPmaId ?? '')
  const [exportBusy, setExportBusy] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [localMsg, setLocalMsg] = useState<string | null>(null)
  const [localErr, setLocalErr] = useState<string | null>(null)

  useEffect(() => {
    const src = defaultPmaId ?? fixedTargetPmaId
    if (src) setExportPmaId(src)
  }, [defaultPmaId, fixedTargetPmaId])

  useEffect(() => {
    const target = fixedTargetPmaId ?? defaultPmaId ?? ''
    if (target) setImportPmaId(target)
  }, [fixedTargetPmaId, defaultPmaId])

  useEffect(() => {
    if (exportPmaId || pmaOptions.length === 0) return
    setExportPmaId(pmaOptions[0]!.id)
  }, [exportPmaId, pmaOptions])

  useEffect(() => {
    if (fixedTargetPmaId || importPmaId || pmaOptions.length === 0) return
    setImportPmaId(pmaOptions[0]!.id)
  }, [fixedTargetPmaId, importPmaId, pmaOptions])

  const reportSuccess = useCallback(
    (msg: string) => {
      setLocalErr(null)
      setLocalMsg(msg)
      onSuccess?.(msg)
      window.setTimeout(() => setLocalMsg(null), 6000)
    },
    [onSuccess],
  )

  const reportError = useCallback(
    (msg: string) => {
      setLocalMsg(null)
      setLocalErr(msg)
      onError?.(msg)
    },
    [onError],
  )

  const handleExport = useCallback(async () => {
    if (!exportPmaId.trim()) {
      reportError("Seleziona un PMA sorgente per l'export.")
      return
    }
    setExportBusy(true)
    setLocalErr(null)
    try {
      let bundle: PmaImpostazioniExportBundle
      if (buildExportBundle) {
        bundle = await buildExportBundle(exportPmaId.trim())
      } else {
        if (!db) throw new Error('Firestore non disponibile.')
        bundle = await fetchPmaImpostazioniBundle(db, exportPmaId.trim())
      }
      downloadPmaImpostazioniCsv(bundle)
      reportSuccess(`Impostazioni esportate dal PMA "${exportPmaId.trim()}".`)
    } catch (e) {
      reportError(e instanceof Error ? e.message : 'Export non riuscito.')
    } finally {
      setExportBusy(false)
    }
  }, [buildExportBundle, exportPmaId, reportError, reportSuccess])

  const handleImportFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file || !canEdit) return

      const targetId = (fixedTargetPmaId ?? importPmaId).trim()
      if (!targetId) {
        reportError("Seleziona un PMA destinazione per l'import.")
        return
      }
      if (!db) {
        reportError('Firestore non disponibile.')
        return
      }

      const srcLabel = file.name
      if (
        !window.confirm(
          `Importare le impostazioni da "${srcLabel}" nel PMA "${targetId}"?\n\n` +
            'Verranno aggiornati posti letto e farmaci usati del PMA, più la configurazione clinica ' +
            'della manifestazione collegata (prestazioni, farmaci, eventi, EO, consensi, preset).',
        )
      ) {
        return
      }

      setImportBusy(true)
      setLocalErr(null)
      try {
        const text = await file.text()
        const bundle = parsePmaImpostazioniCsv(text)
        await applyPmaImpostazioniImport(db, targetId, bundle)
        bumpSync()
        reportSuccess(`Impostazioni importate nel PMA "${targetId}".`)
      } catch (err) {
        reportError(err instanceof Error ? err.message : 'Import non riuscito.')
      } finally {
        setImportBusy(false)
      }
    },
    [bumpSync, canEdit, fixedTargetPmaId, importPmaId, reportError, reportSuccess],
  )

  if (pmaOptions.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Nessun PMA disponibile in questa manifestazione per export o import.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {localErr ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {localErr}
        </div>
      ) : null}
      {localMsg ? (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {localMsg}
        </div>
      ) : null}

      <p className="text-xs text-slate-500">
        Esporta in CSV le impostazioni del PMA (posti letto, farmaci usati) e la configurazione clinica della
        manifestazione collegata. Puoi reimportare il file su un altro PMA: verrà aggiornata la manifestazione di
        destinazione.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Export CSV</h4>
          {!fixedTargetPmaId ? (
            <label className="mt-3 block text-sm text-slate-700">
              PMA sorgente
              <select
                value={exportPmaId}
                disabled={!canEdit || exportBusy}
                onChange={(ev) => setExportPmaId(ev.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
              >
                {pmaOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.id})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-2 font-mono text-xs text-slate-600">{exportPmaId || fixedTargetPmaId}</p>
          )}
          <button
            type="button"
            disabled={!canEdit || exportBusy || !exportPmaId.trim()}
            onClick={() => void handleExport()}
            className="mt-3 inline-flex min-h-[var(--pma-touch-min)] items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {exportBusy ? 'Export…' : 'Scarica CSV'}
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Import CSV</h4>
          {!fixedTargetPmaId ? (
            <label className="mt-3 block text-sm text-slate-700">
              PMA destinazione
              <select
                value={importPmaId}
                disabled={!canEdit || importBusy}
                onChange={(ev) => setImportPmaId(ev.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
              >
                {pmaOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.id})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-2 font-mono text-xs text-slate-600">{fixedTargetPmaId}</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={!canEdit || importBusy}
            onChange={(e) => void handleImportFile(e)}
          />
          <button
            type="button"
            disabled={!canEdit || importBusy || !(fixedTargetPmaId ?? importPmaId).trim()}
            onClick={() => fileRef.current?.click()}
            className="mt-3 inline-flex min-h-[var(--pma-touch-min)] items-center rounded-full border border-indigo-600 bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {importBusy ? 'Import…' : 'Carica CSV'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Helper: aggiorna posti/farmaci PMA da Firestore prima di un export da draft. */
export async function refreshPmaSliceForExport(
  sourcePmaId: string,
  fallback: { posti_letto: number; elenco_farmaci_usati: string[] },
): Promise<{ posti_letto: number; elenco_farmaci_usati: string[] }> {
  if (!db) return fallback
  const snap = await getDoc(doc(db, 'pma', sourcePmaId.trim()))
  if (!snap.exists()) return fallback
  const d = snap.data() as Record<string, unknown>
  const imp = d.impostazioni_pma
  let posti = fallback.posti_letto
  if (imp && typeof imp === 'object' && imp !== null) {
    const n = Number((imp as { posti_letto?: unknown }).posti_letto)
    if (Number.isFinite(n)) posti = Math.floor(n)
  }
  const nested =
    imp && typeof imp === 'object' && imp !== null && 'elenco_farmaci_usati' in imp
      ? (imp as { elenco_farmaci_usati?: unknown }).elenco_farmaci_usati
      : null
  const fromNested = Array.isArray(nested)
    ? nested.filter((x): x is string => typeof x === 'string')
    : []
  const fromLegacy = Array.isArray(d.farmaci_usati)
    ? d.farmaci_usati.filter((x): x is string => typeof x === 'string')
    : []
  return {
    posti_letto: posti,
    elenco_farmaci_usati: [...new Set([...fromNested, ...fromLegacy])].sort((a, b) =>
      a.localeCompare(b, 'it'),
    ),
  }
}
