import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RankGuard } from './components/routes/RankGuard'
import { ManifestazioneScopeGuard } from './components/routes/ManifestazioneScopeGuard'
import { PmaScopeGuard } from './components/routes/PmaScopeGuard'
import { AppLayout } from './layouts/AppLayout'
import { Login } from './pages/Login'
import {
  gestioneUtentiRouteRanks,
  manifestazioneDashboardRouteRanks,
  manifestazioneImpostazioniRouteRanks,
  pmaDashboardRouteRanks,
  superadminAdminRouteRanks,
} from './lib/rankMatrix'

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const UnauthorizedPage = lazy(() =>
  import('./pages/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage })),
)
const ManifestazioneDashboardPage = lazy(() =>
  import('./pages/manifestazione/ManifestazioneDashboardPage').then((m) => ({
    default: m.ManifestazioneDashboardPage,
  })),
)
const ManifestazioneFileUtiliPage = lazy(() =>
  import('./pages/manifestazione/ManifestazioneFileUtiliPage').then((m) => ({
    default: m.ManifestazioneFileUtiliPage,
  })),
)
const ManifestazioneImpostazioniPage = lazy(() =>
  import('./pages/manifestazione/ManifestazioneImpostazioniPage').then((m) => ({
    default: m.ManifestazioneImpostazioniPage,
  })),
)
const ManifestazioneRubricaPage = lazy(() =>
  import('./pages/manifestazione/ManifestazioneRubricaPage').then((m) => ({
    default: m.ManifestazioneRubricaPage,
  })),
)
const PMADashboardPage = lazy(() =>
  import('./pages/pma/PMADashboardPage').then((m) => ({ default: m.PMADashboardPage })),
)
const SchedaPazientePage = lazy(() =>
  import('./pages/pma/SchedaPazientePage').then((m) => ({ default: m.SchedaPazientePage })),
)
const GestioneUtentiPage = lazy(() =>
  import('./pages/admin/GestioneUtentiPage').then((m) => ({ default: m.GestioneUtentiPage })),
)
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
const AdminManifestazioniPage = lazy(() =>
  import('./pages/admin/AdminManifestazioniPage').then((m) => ({ default: m.AdminManifestazioniPage })),
)
const AdminPmaGlobalPage = lazy(() =>
  import('./pages/admin/AdminPmaGlobalPage').then((m) => ({ default: m.AdminPmaGlobalPage })),
)
const AdminPazientiGlobalPage = lazy(() =>
  import('./pages/admin/AdminPazientiGlobalPage').then((m) => ({ default: m.AdminPazientiGlobalPage })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-[#f8fafc] px-4 text-sm font-medium text-slate-600">
      Caricamento…
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="unauthorized" element={<UnauthorizedPage />} />

            <Route element={<RankGuard allow={gestioneUtentiRouteRanks()} />}>
              <Route path="utenti" element={<Navigate to="/admin/utenti" replace />} />
              <Route path="admin/utenti" element={<GestioneUtentiPage />} />
            </Route>

            <Route path="admin" element={<RankGuard allow={superadminAdminRouteRanks()} />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="manifestazioni" element={<AdminManifestazioniPage />} />
              <Route path="pma" element={<AdminPmaGlobalPage />} />
              <Route path="pazienti" element={<AdminPazientiGlobalPage />} />
            </Route>

            <Route element={<RankGuard allow={manifestazioneDashboardRouteRanks()} />}>
              <Route element={<ManifestazioneScopeGuard />}>
                <Route path="manifestazione/:id" element={<ManifestazioneDashboardPage />} />
                <Route path="manifestazione/:id/rubrica" element={<ManifestazioneRubricaPage />} />
                <Route path="manifestazione/:id/file-utili" element={<ManifestazioneFileUtiliPage />} />
              </Route>
            </Route>

            <Route element={<RankGuard allow={manifestazioneImpostazioniRouteRanks()} />}>
              <Route element={<ManifestazioneScopeGuard />}>
                <Route path="manifestazione/:id/impostazioni" element={<ManifestazioneImpostazioniPage />} />
              </Route>
            </Route>

            <Route element={<RankGuard allow={pmaDashboardRouteRanks()} />}>
              <Route element={<PmaScopeGuard />}>
                <Route path="pma/:id" element={<PMADashboardPage />} />
                <Route path="pma/:id/paziente/:pazienteId" element={<SchedaPazientePage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
