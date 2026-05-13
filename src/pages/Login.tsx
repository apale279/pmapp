import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import {
  bootstrapSuperadminIfNoUsers,
  getBootstrapTestCredentials,
} from '../lib/bootstrapTestSuperadmin'
import { consumeLoginFlashMessage } from '../lib/authLoginFlash'
import { defaultRouteAfterLogin } from '../lib/postLoginRedirect'
import { auth, db, isFirebaseReady } from '../lib/firebase'

export function Login() {
  const { status, user, firebaseDisabled, logout, refreshProfile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [bootstrapMessage, setBootstrapMessage] = useState<string | null>(null)
  const [bootstrapBusy, setBootstrapBusy] = useState(false)
  const [securityNotice, setSecurityNotice] = useState<string | null>(null)

  useEffect(() => {
    const msg = consumeLoginFlashMessage()
    if (msg) setSecurityNotice(msg)
  }, [])

  if (firebaseDisabled || status === 'firebase_disabled') {
    return (
      <div className="pma-dashboard flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="pma-card max-w-md border-amber-200 bg-amber-50 text-center">
          <div className="pma-card__hdr text-amber-900">Firebase non configurato</div>
          <p className="mt-2 text-sm text-amber-900">
            Imposta le variabili <code className="rounded bg-amber-100/80 px-1">VITE_FIREBASE_*</code> in{' '}
            <code className="rounded bg-amber-100/80 px-1">.env.local</code> e riavvia{' '}
            <code className="rounded bg-amber-100/80 px-1">npm run dev</code>.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'ready' && user) {
    return <Navigate to={defaultRouteAfterLogin(user)} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!auth) return
    setPending(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : ''
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setFormError('Email o password non validi.')
      } else if (code === 'auth/too-many-requests') {
        setFormError('Troppi tentativi. Riprova più tardi.')
      } else {
        setFormError(err instanceof Error ? err.message : 'Accesso non riuscito.')
      }
    } finally {
      setPending(false)
    }
  }

  async function handleBootstrap() {
    setBootstrapMessage(null)
    if (!auth || !db) return
    setBootstrapBusy(true)
    try {
      const result = await bootstrapSuperadminIfNoUsers(auth, db)
      if (!result.ok) {
        setBootstrapMessage(result.message)
        return
      }
      if (result.created) {
        const { email: em, password: pw } = getBootstrapTestCredentials()
        setEmail(em)
        setPassword(pw)
        setBootstrapMessage(
          `Creato Superadmin. Email: ${em} — Password: ${pw} (cambiale subito).`,
        )
        await refreshProfile()
        return
      }
      setBootstrapMessage(
        'Esistono già documenti in `utenti`. Usa il login oppure crea utenti dalla console.',
      )
    } catch (e) {
      setBootstrapMessage(e instanceof Error ? e.message : 'Errore bootstrap')
    } finally {
      setBootstrapBusy(false)
    }
  }

  return (
    <div className="pma-dashboard flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-lg p-0 pma-card">
        <div className="pma-bar justify-center">
          <div className="pma-bar__id text-center text-base">PMApp</div>
        </div>
        <div className="px-6 pb-8 pt-5">
          <p className="text-center text-sm text-slate-500">Accedi con email e password</p>

          {securityNotice ? (
            <div
              className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
              role="alert"
            >
              {securityNotice}
            </div>
          ) : null}

        <form className="mt-6 space-y-0" onSubmit={(e) => void handleSubmit(e)}>
          <label className="pma-field">
            <span className="pma-field__label">Email</span>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="pma-field">
            <span className="pma-field__label">Password</span>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {formError ? (
            <p className="px-3 py-2 text-sm text-red-600" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="p-3 pt-4">
          <button
            type="submit"
            disabled={pending || !isFirebaseReady()}
            className="w-full rounded-full bg-[#2563eb] py-2.5 text-sm font-semibold uppercase text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Accesso in corso…' : 'Accedi'}
          </button>
          </div>
        </form>

        {import.meta.env.DEV ? (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Solo sviluppo
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Se la collection <code className="rounded bg-slate-100 px-1">utenti</code> è vuota,
              crea un Superadmin di test (Authentication + Firestore). Richiede regole che
              consentano la scrittura iniziale.
            </p>
            <button
              type="button"
              disabled={bootstrapBusy || !isFirebaseReady()}
              onClick={() => void handleBootstrap()}
              className="mt-3 w-full rounded-md border border-slate-300 bg-white py-2 text-sm font-medium uppercase text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bootstrapBusy ? 'Creazione…' : 'Crea Superadmin di test (se DB vuoto)'}
            </button>
            {bootstrapMessage ? (
              <p className="mt-2 text-xs text-slate-600">{bootstrapMessage}</p>
            ) : null}
          </div>
        ) : null}

        {status === 'needs_profile' ? (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>Hai un account ma manca il profilo Firestore.</p>
            <button
              type="button"
              className="mt-2 text-sm font-medium uppercase text-amber-950 underline"
              onClick={() => void logout()}
            >
              Esci e riprova con un altro account
            </button>
          </div>
        ) : null}
        </div>
      </div>
    </div>
  )
}
