const LOGIN_FLASH_STORAGE_KEY = 'pmapp_login_flash_message'

export function setLoginFlashMessage(text: string): void {
  try {
    sessionStorage.setItem(LOGIN_FLASH_STORAGE_KEY, text)
  } catch {
    /* storage non disponibile (es. modalità privata) */
  }
}

/** Legge e rimuove il messaggio mostrato una sola volta sulla pagina di login. */
export function consumeLoginFlashMessage(): string | null {
  try {
    const v = sessionStorage.getItem(LOGIN_FLASH_STORAGE_KEY)
    if (v) sessionStorage.removeItem(LOGIN_FLASH_STORAGE_KEY)
    return v
  } catch {
    return null
  }
}
