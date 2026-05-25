/**
 * Elimina tutti gli account Superadmin (Firestore + Auth) e ne crea uno nuovo.
 * Aggiorna VITE_BOOTSTRAP_SUPERADMIN_* in .env.local.
 *
 * Uso: node scripts/recreate-superadmin.mjs
 */
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIREBASE_CLI_CLIENT_ID =
  '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const envPath = resolve(root, '.env.local')

function loadEnvLocal() {
  const env = {}
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return env
}

function upsertEnvLocal(key, value) {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  let found = false
  const out = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true
      return `${key}=${value}`
    }
    return line
  })
  if (!found) {
    if (out.length && out[out.length - 1] !== '') out.push('')
    out.push(`${key}=${value}`)
  }
  writeFileSync(envPath, out.join('\n'), 'utf8')
}

function generateCredentials() {
  const suffix = randomBytes(4).toString('hex')
  const email = `pmapp-superadmin-${suffix}@pmapp.local`
  const password = randomBytes(18).toString('base64url')
  return { email, password }
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
  if (typeof v?.stringValue === 'string') return v.stringValue
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

async function signUpUser(apiKey, email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  })
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'SignUp fallito')
  }
  if (!body.localId) throw new Error('SignUp: localId mancante')
  return { localId: body.localId, email: body.email ?? email }
}

async function createUtenteDoc(projectId, uid, email, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/utenti?documentId=${encodeURIComponent(uid)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        nome: { stringValue: 'Superadmin' },
        rank: { stringValue: 'Superadmin' },
        id_manifestazione: { nullValue: null },
        id_pma: { nullValue: null },
        email: { stringValue: email },
      },
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Creazione profilo Firestore fallita: ${t}`)
  }
}

async function main() {
  const env = loadEnvLocal()
  const projectId = env.VITE_FIREBASE_PROJECT_ID
  const apiKey = env.VITE_FIREBASE_API_KEY
  if (!projectId || !apiKey) {
    throw new Error('VITE_FIREBASE_PROJECT_ID e VITE_FIREBASE_API_KEY richiesti in .env.local')
  }

  const adminToken = await getAccessToken()
  const docs = await listUtenti(projectId, adminToken)

  let removed = 0
  for (const doc of docs) {
    const uid = doc.name.split('/').pop()
    const rank = fieldString(doc.fields, 'rank')
    if (rank !== 'Superadmin') continue
    await deleteFirestoreDoc(doc.name, adminToken)
    await deleteAuthUser(projectId, uid, adminToken)
    removed++
    console.log(`Rimosso Superadmin: ${uid}`)
  }
  console.log(`Superadmin eliminati: ${removed}`)

  const { email, password } = generateCredentials()
  console.log('Creazione nuovo Superadmin…')
  const { localId } = await signUpUser(apiKey, email, password)
  await createUtenteDoc(projectId, localId, email, adminToken)

  upsertEnvLocal('VITE_BOOTSTRAP_SUPERADMIN_EMAIL', email)
  upsertEnvLocal('VITE_BOOTSTRAP_SUPERADMIN_PASSWORD', password)

  console.log('\nSuperadmin ricreato.')
  console.log(`Email:    ${email}`)
  console.log(`Password: ${password}`)
  console.log('\nCredenziali salvate in .env.local (VITE_BOOTSTRAP_SUPERADMIN_*).')
}

main().catch((e) => {
  console.error('Errore:', e.message ?? e)
  process.exit(1)
})
