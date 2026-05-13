import { useMemo, useState } from 'react'
import { deleteDoc, doc } from 'firebase/firestore'
import { useRankTheme } from '../../hooks/useRankTheme'
import { useAllPazientiGlobal } from '../../hooks/useAllPazientiGlobal'
import { db } from '../../lib/firebase'
import { AdminTableToolbar } from '../../components/admin/AdminTableToolbar'
import { AdminRowActions } from '../../components/admin/AdminRowActions'

export function AdminPazientiGlobalPage() {
  const theme = useRankTheme()
  const { items, loading, error } = useAllPazientiGlobal()
  const [q, setQ] = useState('')
  const [del, setDel] = useState<{ id: string; label: string } | null>(null)
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(
      (r) =>
        r.idVisibile.toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s) ||
        r.nome.toLowerCase().includes(s) ||
        r.cognome.toLowerCase().includes(s) ||
        r.stato.toLowerCase().includes(s) ||
        r.idPma.toLowerCase().includes(s) ||
        r.idManifestazione.toLowerCase().includes(s),
    )
  }, [items, q])

  async function confirmDelete() {
    if (!del || !db) return
    setDelBusy(true)
    setDelErr(null)
    try {
      await deleteDoc(doc(db, 'pazienti', del.id))
      setDel(null)
    } catch (e) {
      setDelErr(e instanceof Error ? e.message : 'Eliminazione non riuscita.')
    } finally {
      setDelBusy(false)
    }
  }

  return (
    <div className="pma-dashboard w-full max-w-[min(100%,1800px)] space-y-6">
      <AdminTableToolbar
        title="Pazienti — archivio globale"
        subtitle="Elenco in tempo reale della collection `pazienti`. Modifica apre la scheda nel contesto PMA se disponibile."
        searchPlaceholder="Filtra per ID, nome, stato, PMA…"
        searchValue={q}
        onSearchChange={setQ}
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 sm:px-5">ID visibile</th>
                <th className="px-4 py-3 sm:px-5">Nome</th>
                <th className="px-4 py-3 sm:px-5">Stato</th>
                <th className="px-4 py-3 sm:px-5">PMA</th>
                <th className="px-4 py-3 text-right sm:px-5">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    <span className={`inline-flex items-center gap-2`}>
                      <span className={`h-5 w-5 animate-spin rounded-full border-2 ${theme.spinnerAccent}`} />
                      Caricamento…
                    </span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                    Nessun paziente corrisponde al filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const schedaTo =
                    r.idPma.trim() !== ''
                      ? `/pma/${encodeURIComponent(r.idPma)}/paziente/${encodeURIComponent(r.id)}`
                      : null
                  const label = `${r.nome} ${r.cognome}`.trim() || r.idVisibile
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-800 sm:px-5">{r.idVisibile}</td>
                      <td className="px-4 py-3 text-slate-900 sm:px-5">{label}</td>
                      <td className="px-4 py-3 sm:px-5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                          {r.stato}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 sm:px-5">
                        {r.idPma || '—'}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-5">
                        <AdminRowActions
                          onEdit={() => {
                            if (schedaTo) window.location.href = schedaTo
                          }}
                          editDisabled={!schedaTo}
                          editTitle={
                            schedaTo
                              ? 'Modifica'
                              : 'Nessun PMA collegato: impossibile aprire la scheda operativa'
                          }
                          onDelete={() => {
                            setDelErr(null)
                            setDel({ id: r.id, label: r.idVisibile })
                          }}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {del ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
          role="presentation"
          onMouseDown={(ev) => {
            if (!delBusy && ev.target === ev.currentTarget) setDel(null)
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Elimina paziente</h2>
            <p className="mt-2 text-sm text-slate-600">
              Eliminare definitivamente la scheda <strong>{del.label}</strong>?
            </p>
            {delErr ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {delErr}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={delBusy}
                onClick={() => setDel(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={delBusy}
                onClick={() => void confirmDelete()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {delBusy ? 'Eliminazione…' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
