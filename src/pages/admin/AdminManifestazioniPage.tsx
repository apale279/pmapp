import { useMemo, useState, useLayoutEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRankTheme } from '../../hooks/useRankTheme'
import { useManifestazioniAdminList } from '../../hooks/useManifestazioniAdminList'
import { deleteManifestazioneCascade } from '../../lib/deleteManifestazioneCascade'
import { db } from '../../lib/firebase'
import { NewManifestazioneModal } from '../../components/home/NewManifestazioneModal'
import { AdminTableToolbar } from '../../components/admin/AdminTableToolbar'
import { AdminRowActions } from '../../components/admin/AdminRowActions'
import { opPrimaryBtn } from '../../components/layout/operativeTokens'
import type { Manifestazione } from '../../types/manifestazione'
import { useOperativeChrome } from '../../context/OperativeChromeContext'

function formatData(m: Manifestazione): string {
  try {
    if (!m.data?.toDate) return '—'
    return m.data.toDate().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function AdminManifestazioniPage() {
  const navigate = useNavigate()
  const theme = useRankTheme()
  const { items, loading, error } = useManifestazioniAdminList()
  const [q, setQ] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalKey, setModalKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<Manifestazione | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteErr, setDeleteErr] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter((m) => m.nome.toLowerCase().includes(s))
  }, [items, q])

  const { setSlots, clearSlots } = useOperativeChrome()
  useLayoutEffect(() => {
    setSlots({
      titleOverride: (
        <h1 className="truncate text-xs font-bold uppercase tracking-wider text-[#e8e8f8] sm:text-sm">
          MANIFESTAZIONI
        </h1>
      ),
      headerActions: (
        <button
          type="button"
          onClick={() => {
            setModalKey((k) => k + 1)
            setModalOpen(true)
          }}
          className={`${opPrimaryBtn} shrink-0 whitespace-nowrap`}
        >
          Nuova manifestazione
        </button>
      ),
      toolbar: (
        <AdminTableToolbar
          variant="filtersOnly"
          searchPlaceholder="Filtra per nome manifestazione…"
          searchValue={q}
          onSearchChange={setQ}
        />
      ),
    })
    return () => clearSlots()
  }, [q, setSlots, clearSlots])

  async function confirmDelete() {
    if (!deleteTarget || !db) return
    setDeleteBusy(true)
    setDeleteErr(null)
    try {
      await deleteManifestazioneCascade(db, deleteTarget.nome)
      setDeleteTarget(null)
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : 'Eliminazione non riuscita.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="pma-dashboard w-full max-w-[min(100%,1800px)] space-y-6">
      <p className="text-xs leading-snug text-slate-600">
        Elenco globale con snapshot Firestore. Eliminando una manifestazione vengono rimossi anche tutti i PMA collegati,
        i pazienti associati e i contatori.
      </p>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 sm:px-5">Nome (ID)</th>
                <th className="px-4 py-3 sm:px-5">Data</th>
                <th className="px-4 py-3 sm:px-5">Stato</th>
                <th className="w-px whitespace-nowrap px-4 py-3 text-right sm:px-5">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
                    <span className={`inline-flex items-center gap-2`}>
                      <span className={`h-5 w-5 animate-spin rounded-full border-2 ${theme.spinnerAccent}`} />
                      Caricamento…
                    </span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                    Nessuna manifestazione corrisponde al filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.nome} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900 sm:px-5">{m.nome}</td>
                    <td className="px-4 py-3 text-slate-700 sm:px-5">{formatData(m)}</td>
                    <td className="px-4 py-3 sm:px-5">
                      <span
                        className={
                          m.stato === 'APERTA'
                            ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-600/20'
                            : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-500/15'
                        }
                      >
                        {m.stato}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Link
                          to={`/manifestazione/${encodeURIComponent(m.nome)}`}
                          className={`${opPrimaryBtn} shrink-0 px-3 py-1.5 text-xs`}
                        >
                          Dashboard
                        </Link>
                        <AdminRowActions
                          onEdit={() => {
                            void navigate(
                              `/manifestazione/${encodeURIComponent(m.nome)}/impostazioni`,
                            )
                          }}
                          editTitle="Impostazioni manifestazione"
                          onDelete={() => {
                            setDeleteErr(null)
                            setDeleteTarget(m)
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewManifestazioneModal key={modalKey} open={modalOpen} onClose={() => setModalOpen(false)} />

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
          role="presentation"
          onMouseDown={(ev) => {
            if (!deleteBusy && ev.target === ev.currentTarget) setDeleteTarget(null)
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl" role="alertdialog">
            <h2 className="text-lg font-semibold text-slate-900">Elimina manifestazione</h2>
            <p className="mt-2 text-sm text-slate-600">
              Verranno eliminati in cascata tutti i <strong>pazienti</strong>, i <strong>PMA</strong> e i{' '}
              <strong>contatori</strong> collegati a <strong>{deleteTarget.nome}</strong>, poi il documento
              manifestazione.
            </p>
            {deleteErr ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {deleteErr}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => void confirmDelete()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteBusy ? 'Eliminazione…' : 'Elimina definitivamente'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
