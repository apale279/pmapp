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

const DEFAULT_EMAIL =
  import.meta.env.VITE_BOOTSTRAP_SUPERADMIN_EMAIL ?? 'superadmin@pmapp.test'
const DEFAULT_PASSWORD =
  import.meta.env.VITE_BOOTSTRAP_SUPERADMIN_PASSWORD ?? 'PmApp-Superadmin-2026!'

export function getBootstrapTestCredentials(): { email: string; password: string } {
  return { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD }
}

/**
 * Se `utenti` è vuota: crea Superadmin via REST Identity Toolkit + profilo Firestore, poi login (solo test).
 */
export async function bootstrapSuperadminIfNoUsers(
  auth: Auth,
  db: Firestore,
): Promise<
  | { ok: true; created: false; reason: 'users_already_exist' }
  | { ok: true; created: true; email: string }
  | { ok: false; message: string }
> {
  const first = await getDocs(query(collection(db, 'utenti'), limit(1)))
  if (!first.empty) {
    return { ok: true, created: false, reason: 'users_already_exist' }
  }

  try {
    const { localId, email } = await identityToolkitSignUp(DEFAULT_EMAIL, DEFAULT_PASSWORD)
    await setDoc(doc(db, 'utenti', localId), {
      nome: 'Superadmin di test',
      rank: 'Superadmin',
      id_manifestazione: null,
      id_pma: null,
      email,
    })
    await signInWithEmailAndPassword(auth, DEFAULT_EMAIL, DEFAULT_PASSWORD)
    return { ok: true, created: true, email: DEFAULT_EMAIL }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Errore sconosciuto'
    return { ok: false, message }
  }
}
