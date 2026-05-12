import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, db, isFirebaseReady } from '../lib/firebase'
import { loadUtenteProfile } from '../lib/loadUtenteProfile'
import type { UserProfile } from '../types/userProfile'

export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'ready'
  | 'needs_profile'
  | 'error'
  | 'firebase_disabled'

export interface AuthContextValue {
  status: AuthStatus
  user: UserProfile | null
  errorMessage: string | null
  firebaseDisabled: boolean
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthStateContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebaseOk = isFirebaseReady()

  const [status, setStatus] = useState<AuthStatus>(() =>
    firebaseOk ? 'loading' : 'firebase_disabled',
  )
  const [user, setUser] = useState<UserProfile | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    firebaseOk ? null : 'Configura le variabili VITE_FIREBASE_* in .env.local',
  )

  const firebaseDisabled = !firebaseOk

  const loadProfileForUid = useCallback(async (uid: string, email: string | null) => {
    if (!db) {
      setErrorMessage('Firestore non disponibile')
      setStatus('error')
      setUser(null)
      return
    }
    try {
      const profile = await loadUtenteProfile(db, uid, email)
      if (!profile) {
        setUser(null)
        setStatus('needs_profile')
        setErrorMessage(null)
        return
      }
      setUser(profile)
      setStatus('ready')
      setErrorMessage(null)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Errore caricamento profilo'
      setUser(null)
      setStatus('error')
      setErrorMessage(message)
    }
  }, [])

  useEffect(() => {
    if (!firebaseOk || !auth || !db) {
      return
    }

    const unsub = onAuthStateChanged(auth, async (fu) => {
      setErrorMessage(null)
      if (!fu) {
        setUser(null)
        setStatus('unauthenticated')
        return
      }
      setStatus('loading')
      await loadProfileForUid(fu.uid, fu.email)
    })

    return () => unsub()
  }, [firebaseOk, loadProfileForUid])

  const logout = useCallback(async () => {
    if (!auth) return
    await signOut(auth)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!auth || !auth.currentUser || !db) return
    setStatus('loading')
    await loadProfileForUid(auth.currentUser.uid, auth.currentUser.email)
  }, [loadProfileForUid])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      errorMessage,
      firebaseDisabled,
      logout,
      refreshProfile,
    }),
    [status, user, errorMessage, firebaseDisabled, logout, refreshProfile],
  )

  return (
    <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>
  )
}

// useAuth è esportato accanto al provider come da struttura richiesta (AuthContext.tsx)
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthStateContext)
  if (!ctx) {
    throw new Error('useAuth deve essere usato dentro AuthProvider')
  }
  return ctx
}
