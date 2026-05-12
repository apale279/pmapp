import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RankGuard } from './components/routes/RankGuard'
import { AppLayout } from './layouts/AppLayout'
import { HomePage } from './pages/HomePage'
import { Login } from './pages/Login'
import { ManifestazioneDashboardPage } from './pages/manifestazione/ManifestazioneDashboardPage'
import { ManifestazioneImpostazioniPage } from './pages/manifestazione/ManifestazioneImpostazioniPage'
import { PMADashboardPage } from './pages/pma/PMADashboardPage'
import { SchedaPazientePage } from './pages/pma/SchedaPazientePage'
import { PMAImpostazioniPage } from './pages/pma/PMAImpostazioniPage'
import { GestioneUtentiPage } from './pages/admin/GestioneUtentiPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route
            path="utenti"
            element={
              <RankGuard allow={['Superadmin']}>
                <GestioneUtentiPage />
              </RankGuard>
            }
          />
          <Route
            path="manifestazione/:id"
            element={
              <RankGuard allow={['Superadmin', 'Centrale']}>
                <ManifestazioneDashboardPage />
              </RankGuard>
            }
          />
          <Route
            path="manifestazione/:id/impostazioni"
            element={
              <RankGuard allow={['Superadmin']}>
                <ManifestazioneImpostazioniPage />
              </RankGuard>
            }
          />
          <Route path="pma/:id/paziente/:pazienteId" element={<SchedaPazientePage />} />
          <Route path="pma/:id/impostazioni" element={<PMAImpostazioniPage />} />
          <Route path="pma/:id" element={<PMADashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
