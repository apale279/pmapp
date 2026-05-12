const DELETE_ACCOUNT_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:delete'

export class IdentityToolkitDeleteUserError extends Error {
  readonly rawMessage: string

  constructor(rawMessage: string) {
    super(mapDeleteMessage(rawMessage))
    this.name = 'IdentityToolkitDeleteUserError'
    this.rawMessage = rawMessage
  }
}

function mapDeleteMessage(raw: string): string {
  if (raw === 'MISSING_API_KEY' || raw.includes('MISSING_API_KEY')) {
    return 'Chiave API Firebase mancante o non valida (VITE_FIREBASE_API_KEY).'
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('UNAUTHORIZED')) {
    return (
      'Eliminazione account non autorizzata con la sola Web API Key. ' +
      'Identity Toolkit accetta di solito solo idToken per accounts:delete dal client; ' +
      'per eliminare altri utenti serve un backend con credenziali amministrative (OAuth / Admin SDK). ' +
      'Dettaglio tecnico: ' +
      raw
    )
  }
  if (raw.includes('USER_NOT_FOUND')) {
    return 'Utente non trovato in Firebase Authentication (potrebbe essere già stato eliminato).'
  }
  if (raw.includes('INVALID_ID_TOKEN')) {
    return 'Token non valido per eliminazione account.'
  }
  return raw
}

/**
 * Elimina un account Firebase Auth via REST (Identity Toolkit), senza usare
 * `deleteUser` sul client SDK (che agirebbe solo sull’utente corrente).
 *
 * Richiesta con `localId` come da linee guida progetto; se il progetto non
 * consente questa operazione dal browser, la risposta conterrà un errore
 * esplicito (es. PERMISSION_DENIED).
 */
export async function identityToolkitDeleteUserByLocalId(localId: string): Promise<void> {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
  if (!apiKey || apiKey === 'IL_TUO_VALORE') {
    throw new IdentityToolkitDeleteUserError('MISSING_API_KEY')
  }

  const url = `${DELETE_ACCOUNT_URL}?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId }),
  })

  const body = (await res.json()) as Record<string, unknown>

  if (!res.ok) {
    const err = body.error as { message?: string } | undefined
    throw new IdentityToolkitDeleteUserError(err?.message ?? 'UNKNOWN')
  }
}
