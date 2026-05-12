import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SyncLiveProvider } from './context/SyncLiveContext'
import './index.css'
import './lib/firebase'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SyncLiveProvider>
          <App />
        </SyncLiveProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
