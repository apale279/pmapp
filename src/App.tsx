import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RankGuard } from './components/routes/RankGuard'
import { ManifestazioneScopeGuard } from './components/routes/ManifestazioneScopeGuard'
import { PmaScopeGuard } from './components/routes/PmaScopeGuard'
import { AppLayout } from './layouts/AppLayout'
import { HomePage } from './pages/HomePage'
import { Login } from './pages/Login'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { ManifestazioneDashboardPage } from './pages/manifestazione/ManifestazioneDashboardPage'
import { ManifestazioneFileUtiliPage } from './pages/manifestazione/ManifestazioneFileUtiliPage'
import { ManifestazioneImpostazioniPage } from './pages/manifestazione/ManifestazioneImpostazioniPage'
import { ManifestazioneRubricaPage } from './pages/manifestazione/ManifestazioneRubricaPage'
import { PMADashboardPage } from './pages/pma/PMADashboardPage'
import { SchedaPazientePage } from './pages/pma/SchedaPazientePage'
import { PMAImpostazioniPage } from './pages/pma/PMAImpostazioniPage'
import { GestioneUtentiPage } from './pages/admin/GestioneUtentiPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminManifestazioniPage } from './pages/admin/AdminManifestazioniPage'
import { AdminPmaGlobalPage } from './pages/admin/AdminPmaGlobalPage'
import { AdminPazientiGlobalPage } from './pages/admin/AdminPazientiGlobalPage'
import {
  gestioneUtentiRouteRanks,
  manifestazioneDashboardRouteRanks,
  manifestazioneImpostazioniRouteRanks,
  pmaDashboardRouteRanks,
  superadminAdminRouteRanks,
} from './lib/rankMatrix'

export default function App() {
  return (
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
              <Route path="pma/:id/impostazioni" element={<PMAImpostazioniPage />} />
              <Route path="pma/:id/paziente/:pazienteId" element={<SchedaPazientePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
