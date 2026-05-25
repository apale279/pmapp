/** Query rapida Firestore: PMA con token e ultimi pazienti. */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi'
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function projectIdFromEnv() {
  for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) {
    const t = line.trim()
    if (t.startsWith('VITE_FIREBASE_PROJECT_ID=')) return t.slice(25).trim()
  }
  throw new Error('project id missing')
}

async function getAccessToken() {
  const cfg = JSON.parse(readFileSync(join(homedir(), '.config', 'configstore', 'firebase-tools.json'), 'utf8'))
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: cfg.tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const body = await res.json()
  return body.access_token
}

async function listCollection(projectId, token, col, pageSize = 20) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${col}?pageSize=${pageSize}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const body = await res.json()
  return body.documents ?? []
}

function fieldVal(f) {
  if (!f) return null
  if ('stringValue' in f) return f.stringValue
  if ('integerValue' in f) return f.integerValue
  if ('doubleValue' in f) return f.doubleValue
  if ('booleanValue' in f) return f.booleanValue
  if ('nullValue' in f) return null
  if ('timestampValue' in f) return f.timestampValue
  return JSON.stringify(f)
}

async function main() {
  const projectId = projectIdFromEnv()
  const token = await getAccessToken()

  console.log('=== PMA (con token) ===')
  const pmas = await listCollection(projectId, token, 'pma', 50)
  if (pmas.length === 0) console.log('(nessun PMA)')
  for (const d of pmas) {
    const id = d.name.split('/').pop()
    const f = d.fields ?? {}
    console.log({
      id,
      nome: fieldVal(f.nome),
      id_manifestazione: fieldVal(f.id_manifestazione),
      token: fieldVal(f.token) ? `${String(fieldVal(f.token)).slice(0, 8)}…` : '(assente)',
    })
  }

  console.log('\n=== Pazienti (ultimi) ===')
  const paz = await listCollection(projectId, token, 'pazienti', 30)
  if (paz.length === 0) console.log('(nessun paziente in Firestore)')
  for (const d of paz) {
    const id = d.name.split('/').pop()
    const f = d.fields ?? {}
    console.log({
      id,
      id_paziente_visibile: fieldVal(f.id_paziente_visibile),
      id_pma: fieldVal(f.id_pma),
      id_manifestazione: fieldVal(f.id_manifestazione),
      nome: fieldVal(f.nome),
      cognome: fieldVal(f.cognome),
      stato: fieldVal(f.stato),
      tipo_paziente: fieldVal(f.tipo_paziente),
      creato_da_rank: fieldVal(f.creato_da_rank),
      creato_da_uid: fieldVal(f.creato_da_uid),
      cross: fieldVal(f.cross) ?? fieldVal(f.external_source) ?? fieldVal(f.source) ?? null,
    })
  }
}

main().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
