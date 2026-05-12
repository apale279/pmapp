import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function FullScreenMessage({
  title,
  detail,
  actions,
}: {
  title: string
  detail?: string | null
  actions?: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {detail ? (
          <p className="mt-2 text-sm text-slate-600">{detail}</p>
        ) : null}
        {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

/**
 * Rotte private: richiedono sessione Firebase e documento `utenti/{uid}`.
 * Utente non autenticato → `/login`.
 */
export function ProtectedRoute() {
  const { status, errorMessage, firebaseDisabled, logout } = useAuth()
  const location = useLocation()

  if (firebaseDisabled || status === 'firebase_disabled') {
    return (
      <FullScreenMessage
        title="Firebase non configurato"
        detail="Aggiungi le chiavi in .env.local e riavvia il server di sviluppo."
      />
    )
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Caricamento sessione…
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    )
  }

  if (status === 'needs_profile') {
    return (
      <FullScreenMessage
        title="Profilo non trovato"
        detail="Il tuo account esiste in Authentication ma manca il documento in Firestore (collection utenti). Chiedi a un amministratore di crearlo."
        actions={
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => void logout()}
          >
            Esci
          </button>
        }
      />
    )
  }

  if (status === 'error') {
    return (
      <FullScreenMessage
        title="Errore profilo"
        detail={errorMessage}
        actions={
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => void logout()}
          >
            Esci
          </button>
        }
      />
    )
  }

  if (status === 'ready') {
    return <Outlet />
  }

  return (
    <FullScreenMessage
      title="Stato non previsto"
      detail={errorMessage}
      actions={
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={() => void logout()}
        >
          Esci
        </button>
      }
    />
  )
}
