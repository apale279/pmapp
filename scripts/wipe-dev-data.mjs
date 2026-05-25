/**
 * Elimina PMA, manifestazioni, pazienti collegati e utenti (tranne Superadmin).
 * Non modifica codice/impostazioni app. Richiede .env.local con Firebase + credenziali Superadmin.
 *
 * Uso: node scripts/wipe-dev-data.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  deleteDoc,
  doc,
} from 'firebase/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvLocal() {
  const path = resolve(root, '.env.local')
  const env = {}
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    }
  } catch {
    throw new Error('File .env.local non trovato.')
  }
  return env
}

const BATCH_MAX = 450

async function deleteQueryDocs(db, q) {
  const snap = await getDocs(q)
  for (let i = 0; i < snap.docs.length; i += BATCH_MAX) {
    const batch = writeBatch(db)
    for (const d of snap.docs.slice(i, i + BATCH_MAX)) {
      batch.delete(d.ref)
    }
    await batch.commit()
    console.log(`  eliminati ${Math.min(i + BATCH_MAX, snap.docs.length)}/${snap.docs.length}`)
  }
  return snap.docs.length
}

async function deleteCollection(db, name) {
  console.log(`Collection ${name}…`)
  const n = await deleteQueryDocs(db, collection(db, name))
  console.log(`  totale: ${n}`)
  return n
}

async function deleteManifestazioniWithContatori(db) {
  console.log('Collection manifestazioni (+ contatori)…')
  const snap = await getDocs(collection(db, 'manifestazioni'))
  for (const manDoc of snap.docs) {
    const contSnap = await getDocs(collection(db, 'manifestazioni', manDoc.id, 'contatori'))
    for (let i = 0; i < contSnap.docs.length; i += BATCH_MAX) {
      const batch = writeBatch(db)
      for (const d of contSnap.docs.slice(i, i + BATCH_MAX)) {
        batch.delete(d.ref)
      }
      await batch.commit()
    }
    await deleteDoc(doc(db, 'manifestazioni', manDoc.id))
    console.log(`  manifestazione eliminata: ${manDoc.id}`)
  }
  console.log(`  totale manifestazioni: ${snap.docs.length}`)
  return snap.docs.length
}

async function deleteAuthUser(apiKey, localId) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body?.error?.message ?? res.statusText
    console.warn(`  Auth delete ${localId}: ${msg}`)
    return false
  }
  return true
}

async function wipeUtentiExceptSuperadmin(db, apiKey) {
  console.log('Collection utenti (conserva Superadmin)…')
  const snap = await getDocs(collection(db, 'utenti'))
  let kept = 0
  let removed = 0
  for (const d of snap.docs) {
    const rank = d.data()?.rank
    if (rank === 'Superadmin') {
      kept++
      console.log(`  conservato Superadmin: ${d.id}`)
      continue
    }
    await deleteDoc(d.ref)
    removed++
    await deleteAuthUser(apiKey, d.id)
  }
  console.log(`  utenti rimossi: ${removed}, Superadmin conservati: ${kept}`)
  return { removed, kept }
}

async function main() {
  const env = loadEnvLocal()
  const email =
    env.VITE_BOOTSTRAP_SUPERADMIN_EMAIL?.trim() ||
    env.WIPE_SUPERADMIN_EMAIL?.trim()
  const password =
    env.VITE_BOOTSTRAP_SUPERADMIN_PASSWORD ||
    env.WIPE_SUPERADMIN_PASSWORD

  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }

  if (!email || !password) {
    throw new Error(
      'Imposta VITE_BOOTSTRAP_SUPERADMIN_EMAIL e VITE_BOOTSTRAP_SUPERADMIN_PASSWORD in .env.local',
    )
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)

  console.log('Login Superadmin…')
  await signInWithEmailAndPassword(auth, email, password)
  console.log('Autenticato.\n')

  await deleteCollection(db, 'pazienti')
  await deleteCollection(db, 'codici_minori')
  await deleteCollection(db, 'allerte_pma')
  await deleteCollection(db, 'rubrica_contatti')
  await deleteCollection(db, 'manifestazione_file_utili')
  await deleteCollection(db, 'pma')
  await deleteManifestazioniWithContatori(db)
  await wipeUtentiExceptSuperadmin(db, firebaseConfig.apiKey)

  console.log('\nPulizia completata.')
  process.exit(0)
}

main().catch((e) => {
  console.error('Errore:', e.message ?? e)
  process.exit(1)
})
