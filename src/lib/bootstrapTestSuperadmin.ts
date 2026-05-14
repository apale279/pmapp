import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
} from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import type { Auth } from 'firebase/auth'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { identityToolkitSignUp } from './identityToolkitSignUp'

const PROD_DISABLED_MSG = 'Bootstrap di test non disponibile in build di produzione.'

const MISSING_ENV_MSG =
  'Imposta VITE_BOOTSTRAP_SUPERADMIN_EMAIL e VITE_BOOTSTRAP_SUPERADMIN_PASSWORD in .env.local (nessun valore predefinito in repository).'

function readBootstrapEnv(): { email: string; password: string } | null {
  const email = import.meta.env.VITE_BOOTSTRAP_SUPERADMIN_EMAIL?.trim()
  const password = import.meta.env.VITE_BOOTSTRAP_SUPERADMIN_PASSWORD
  if (!email || typeof password !== 'string' || !password.trim()) return null
  return { email, password: password.trim() }
}

/** Credenziali usate dopo bootstrap (stesse variabili d'ambiente). */
export function getBootstrapTestCredentials(): { email: string; password: string } {
  if (import.meta.env.PROD) throw new Error(PROD_DISABLED_MSG)
  const v = readBootstrapEnv()
  if (!v) throw new Error(MISSING_ENV_MSG)
  return v
}

/**
 * Se `utenti` è vuota: crea Superadmin via REST Identity Toolkit + profilo Firestore, poi login (solo test).
 * Richiede `VITE_BOOTSTRAP_SUPERADMIN_*` impostate; nessuna password di default nel bundle.
 */
export async function bootstrapSuperadminIfNoUsers(
  auth: Auth,
  db: Firestore,
): Promise<
  | { ok: true; created: false; reason: 'users_already_exist' }
  | { ok: true; created: true; email: string }
  | { ok: false; message: string }
> {
  if (import.meta.env.PROD) {
    return { ok: false, message: PROD_DISABLED_MSG }
  }
  const creds = readBootstrapEnv()
  if (!creds) {
    return { ok: false, message: MISSING_ENV_MSG }
  }

  const first = await getDocs(query(collection(db, 'utenti'), limit(1)))
  if (!first.empty) {
    return { ok: true, created: false, reason: 'users_already_exist' }
  }

  try {
    const { localId, email } = await identityToolkitSignUp(creds.email, creds.password)
    await setDoc(doc(db, 'utenti', localId), {
      nome: 'Superadmin di test',
      rank: 'Superadmin',
      id_manifestazione: null,
      id_pma: null,
      email,
    })
    await signInWithEmailAndPassword(auth, creds.email, creds.password)
    return { ok: true, created: true, email: creds.email }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Errore sconosciuto'
    return { ok: false, message }
  }
}
