const SIGN_UP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp'

export class IdentityToolkitSignUpError extends Error {
  readonly rawMessage: string

  constructor(rawMessage: string) {
    super(mapIdentityToolkitMessage(rawMessage))
    this.name = 'IdentityToolkitSignUpError'
    this.rawMessage = rawMessage
  }
}

function mapIdentityToolkitMessage(raw: string): string {
  if (raw === 'MISSING_API_KEY' || raw.includes('MISSING_API_KEY')) {
    return 'Chiave API Firebase mancante o non valida (VITE_FIREBASE_API_KEY).'
  }
  if (raw === 'MISSING_LOCAL_ID') {
    return 'Risposta Identity Toolkit imprevista (manca localId).'
  }
  if (raw.includes('EMAIL_EXISTS')) {
    return 'Questa email è già registrata. Usa un’altra email o recupera l’accesso dall’account esistente.'
  }
  if (raw.includes('INVALID_EMAIL')) {
    return 'Indirizzo email non valido.'
  }
  if (raw.includes('WEAK_PASSWORD') || raw.includes('PASSWORD_DOES_NOT_MEET_REQUIREMENTS')) {
    return 'Password troppo debole. Usa almeno 6 caratteri e, se richiesto dalla console Firebase, rispetti i requisiti di complessità.'
  }
  if (raw.includes('OPERATION_NOT_ALLOWED')) {
    return 'Registrazione email/password non abilitata nel progetto Firebase (Authentication).'
  }
  return raw
}

export interface IdentityToolkitSignUpResult {
  localId: string
  email: string
}

/**
 * Crea un account Firebase Auth via REST (Identity Toolkit), senza usare
 * createUserWithEmailAndPassword: non altera la sessione del Superadmin corrente.
 */
export async function identityToolkitSignUp(
  email: string,
  password: string,
): Promise<IdentityToolkitSignUpResult> {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
  if (!apiKey || apiKey === 'IL_TUO_VALORE') {
    throw new IdentityToolkitSignUpError('MISSING_API_KEY')
  }

  const url = `${SIGN_UP_URL}?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      password,
      returnSecureToken: true,
    }),
  })

  const body = (await res.json()) as Record<string, unknown>

  if (!res.ok) {
    const err = body.error as { message?: string } | undefined
    throw new IdentityToolkitSignUpError(err?.message ?? 'UNKNOWN')
  }

  const localId = body.localId
  const emailOut = body.email
  if (typeof localId !== 'string' || !localId) {
    throw new IdentityToolkitSignUpError('MISSING_LOCAL_ID')
  }

  return {
    localId,
    email: typeof emailOut === 'string' ? emailOut : email.trim(),
  }
}
