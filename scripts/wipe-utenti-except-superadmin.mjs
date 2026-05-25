/**
 * Elimina utenti Firestore + Auth tranne Superadmin.
 * Usa refresh token da `firebase login` (~/.config/configstore/firebase-tools.json).
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIREBASE_CLI_CLIENT_ID =
  '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function projectIdFromEnv() {
  const path = resolve(root, '.env.local')
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (t.startsWith('VITE_FIREBASE_PROJECT_ID=')) {
      return t.slice('VITE_FIREBASE_PROJECT_ID='.length).trim()
    }
  }
  throw new Error('VITE_FIREBASE_PROJECT_ID mancante in .env.local')
}

async function getAccessToken() {
  const cfgPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json')
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
  const refreshToken = cfg?.tokens?.refresh_token
  if (!refreshToken) {
    throw new Error('Esegui `firebase login` prima di usare questo script.')
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: FIREBASE_CLI_CLIENT_ID,
      client_secret: FIREBASE_CLI_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const body = await res.json()
  if (!res.ok || !body.access_token) {
    throw new Error(body.error_description ?? body.error ?? 'Token OAuth non ottenuto')
  }
  return body.access_token
}

async function listUtenti(projectId, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/utenti`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`List utenti fallita: ${t}`)
  }
  const body = await res.json()
  return body.documents ?? []
}

function fieldString(fields, key) {
  const v = fields?.[key]
  if (!v) return undefined
  if (typeof v.stringValue === 'string') return v.stringValue
  return undefined
}

async function deleteFirestoreDoc(docName, token) {
  const res = await fetch(`https://firestore.googleapis.com/v1/${docName}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 404) {
    const t = await res.text()
    throw new Error(`Delete Firestore ${docName}: ${t}`)
  }
}

async function deleteAuthUser(projectId, uid, token) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ localId: uid }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body?.error?.message ?? res.statusText
    console.warn(`  Auth delete ${uid}: ${msg}`)
  }
}

async function main() {
  const projectId = projectIdFromEnv()
  const token = await getAccessToken()
  const docs = await listUtenti(projectId, token)

  let kept = 0
  let removed = 0

  for (const doc of docs) {
    const uid = doc.name.split('/').pop()
    const rank = fieldString(doc.fields, 'rank')
    if (rank === 'Superadmin') {
      kept++
      console.log(`Conservato Superadmin: ${uid}`)
      continue
    }
    await deleteFirestoreDoc(doc.name, token)
    await deleteAuthUser(projectId, uid, token)
    removed++
    console.log(`Rimosso: ${uid} (rank: ${rank ?? '?'})`)
  }

  console.log(`\nFatto. Rimossi: ${removed}, Superadmin conservati: ${kept}`)
}

main().catch((e) => {
  console.error('Errore:', e.message ?? e)
  process.exit(1)
})
