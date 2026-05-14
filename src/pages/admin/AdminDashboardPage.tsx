import { Link } from 'react-router-dom'
import { useLayoutEffect } from 'react'
import { useRankTheme } from '../../hooks/useRankTheme'
import { useSuperadminStats } from '../../hooks/useSuperadminStats'
import { useOperativeChrome } from '../../context/OperativeChromeContext'

export function AdminDashboardPage() {
  const theme = useRankTheme()
  const { totaleUtenti, eventiAttivi, loading, error } = useSuperadminStats()
  const { setSlots, clearSlots } = useOperativeChrome()

  useLayoutEffect(() => {
    setSlots({
      titleOverride: (
        <h1 className="truncate text-xs font-bold uppercase tracking-wider text-[#e8e8f8] sm:text-sm">
          DASHBOARD ADMIN
        </h1>
      ),
    })
    return () => clearSlots()
  }, [setSlots, clearSlots])

  return (
    <div className="pma-dashboard mx-auto w-full max-w-[min(100%,1800px)] space-y-8 pb-10">
      <p className="max-w-3xl text-xs leading-snug text-slate-600">
        Panoramica globale in tempo reale (snapshot Firestore). Le viste operative PMA / manifestazione si aprono solo da
        debug o da link dedicati nelle tabelle.
      </p>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 py-16 text-slate-600">
          <span
            className={`h-8 w-8 animate-spin rounded-full border-2 ${theme.spinnerAccent}`}
            aria-hidden
          />
          Caricamento statistiche…
        </div>
      ) : (
        <div className="pma-metrics-grid">
          <section className="pma-card">
            <div className="pma-card__hdr">Utenti totali</div>
            <p className="pma-big-num">{totaleUtenti}</p>
            <p className="pma-big-num__sub">
              Collection <code className="rounded bg-slate-100 px-1 text-xs">utenti</code>
            </p>
            <Link to="/admin/utenti" className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline">
              Apri gestione utenti →
            </Link>
          </section>
          <section className="pma-card">
            <div className="pma-card__hdr">Eventi attivi</div>
            <p className="pma-big-num text-emerald-800">{eventiAttivi}</p>
            <p className="pma-big-num__sub">Manifestazioni con stato diverso da CHIUSA</p>
            <Link
              to="/admin/manifestazioni"
              className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline"
            >
              Apri manifestazioni →
            </Link>
          </section>
          <section className="pma-card sm:col-span-2 lg:col-span-1">
            <div className="pma-card__hdr">Accesso rapido</div>
            <ul className="mt-1 space-y-2 text-sm">
              <li>
                <Link to="/admin/pma" className="font-medium text-blue-700 hover:underline">
                  Gestione PMA globale
                </Link>
              </li>
              <li>
                <Link to="/admin/pazienti" className="font-medium text-blue-700 hover:underline">
                  Archivio pazienti globale
                </Link>
              </li>
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
