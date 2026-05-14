import { useMemo, useState, useLayoutEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRankTheme } from '../../hooks/useRankTheme'
import { useAllPmaGlobal } from '../../hooks/useAllPmaGlobal'
import { useManifestazioniAdminList } from '../../hooks/useManifestazioniAdminList'
import { deletePmaCascade } from '../../lib/deletePmaCascade'
import { db } from '../../lib/firebase'
import { AdminTableToolbar } from '../../components/admin/AdminTableToolbar'
import { AdminRowActions } from '../../components/admin/AdminRowActions'
import { opPrimaryBtn } from '../../components/layout/operativeTokens'
import { useOperativeChrome } from '../../context/OperativeChromeContext'

export function AdminPmaGlobalPage() {
  const navigate = useNavigate()
  const theme = useRankTheme()
  const { items, loading, error } = useAllPmaGlobal()
  const { items: manifestazioni } = useManifestazioniAdminList()
  const [q, setQ] = useState('')
  const [del, setDel] = useState<{ id: string; nome: string } | null>(null)
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState<string | null>(null)

  const manNome = useMemo(() => {
    const m: Record<string, string> = {}
    for (const x of manifestazioni) {
      m[x.nome] = x.nome
    }
    return m
  }, [manifestazioni])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(
      (r) =>
        r.id.toLowerCase().includes(s) ||
        r.nome.toLowerCase().includes(s) ||
        r.idManifestazione.toLowerCase().includes(s),
    )
  }, [items, q])

  const { setSlots, clearSlots } = useOperativeChrome()
  useLayoutEffect(() => {
    setSlots({
      titleOverride: (
        <h1 className="truncate text-xs font-bold uppercase tracking-wider text-[#e8e8f8] sm:text-sm">
          PMA GLOBALI
        </h1>
      ),
      toolbar: (
        <AdminTableToolbar
          variant="filtersOnly"
          searchPlaceholder="Filtra per ID, nome o manifestazione…"
          searchValue={q}
          onSearchChange={setQ}
        />
      ),
    })
    return () => clearSlots()
  }, [q, setSlots, clearSlots])

  async function confirmDelete() {
    if (!del || !db) return
    setDelBusy(true)
    setDelErr(null)
    try {
      await deletePmaCascade(db, del.id)
      setDel(null)
    } catch (e) {
      setDelErr(e instanceof Error ? e.message : 'Eliminazione non riuscita.')
    } finally {
      setDelBusy(false)
    }
  }

  return (
    <div className="pma-dashboard w-full max-w-[min(100%,1800px)] space-y-6">
      <p className="text-xs leading-snug text-slate-600">
        Tutti i posti medici avanzati (snapshot <code className="rounded bg-slate-100 px-1">pma</code>). Usa «Apri vista
        operativa» per debug sul PMA; elimina rimuove anche le schede paziente collegate a quel PMA.
      </p>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 sm:px-5">PMA</th>
                <th className="px-4 py-3 sm:px-5">Manifestazione</th>
                <th className="px-4 py-3 text-right sm:px-5">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center text-slate-500">
                    <span className={`inline-flex items-center gap-2`}>
                      <span className={`h-5 w-5 animate-spin rounded-full border-2 ${theme.spinnerAccent}`} />
                      Caricamento…
                    </span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-slate-500">
                    Nessun PMA corrisponde al filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const manLabel = r.idManifestazione
                    ? manNome[r.idManifestazione] ?? r.idManifestazione
                    : '—'
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 sm:px-5">
                        <div className="font-medium text-slate-900">{r.nome}</div>
                        <div className="font-mono text-xs text-slate-500">{r.id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-800 sm:px-5">{manLabel}</td>
                      <td className="px-4 py-3 text-right sm:px-5">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            to={`/pma/${encodeURIComponent(r.id)}`}
                            className={`${opPrimaryBtn} inline-flex items-center px-3 py-1.5 text-xs no-underline`}
                          >
                            Apri vista operativa
                          </Link>
                          <AdminRowActions
                            onEdit={() => {
                              const man = r.idManifestazione?.trim()
                              if (man) {
                                void navigate(`/manifestazione/${encodeURIComponent(man)}/impostazioni`)
                              } else {
                                void navigate(`/pma/${encodeURIComponent(r.id)}`)
                              }
                            }}
                            onDelete={() => {
                              setDelErr(null)
                              setDel({ id: r.id, nome: r.nome })
                            }}
                          />
                        </div>
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
            <h2 className="text-lg font-semibold text-slate-900">Elimina PMA</h2>
            <p className="mt-2 text-sm text-slate-600">
              Verranno eliminati tutti i pazienti con <code className="rounded bg-slate-100 px-1">id_pma</code> ={' '}
              <strong>{del.id}</strong>, poi il documento PMA <strong>{del.nome}</strong>.
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
