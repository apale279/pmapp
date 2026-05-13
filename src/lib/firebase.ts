import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { browserSessionPersistence, getAuth, setPersistence, type Auth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseOptions: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

function isFirebaseConfigured(options: FirebaseOptions): boolean {
  return Boolean(
    options.apiKey &&
      options.authDomain &&
      options.projectId &&
      options.storageBucket &&
      options.messagingSenderId &&
      options.appId,
  )
}

/**
 * Firestore con cache persistente (IndexedDB) e coordinamento tra più schede del browser.
 * Utile in ambiente PMA con più operatori e più finestre aperte.
 */
function createFirestoreWithOfflineSupport(app: FirebaseApp): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  } catch {
    return getFirestore(app)
  }
}

const configured = isFirebaseConfigured(firebaseOptions)

export const firebaseApp: FirebaseApp | null = configured
  ? (getApps()[0] ?? initializeApp(firebaseOptions))
  : null

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null

/**
 * Sessione legata alla scheda del browser: chiusura finestra/tab → logout implicito (nessun token in persistenza locale estesa).
 * Deve essere completata prima di `onAuthStateChanged` / login interattivo.
 */
export async function ensureBrowserSessionAuthPersistence(): Promise<void> {
  if (!auth) return
  await setPersistence(auth, browserSessionPersistence)
}

export const db: Firestore | null = firebaseApp
  ? createFirestoreWithOfflineSupport(firebaseApp)
  : null

export const storage: FirebaseStorage | null = firebaseApp ? getStorage(firebaseApp) : null

export function isFirebaseReady(): boolean {
  return firebaseApp !== null && auth !== null && db !== null
}
