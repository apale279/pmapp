export class PmaNomeInvalidoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PmaNomeInvalidoError'
  }
}

/** Nome PMA → ID documento: minuscolo, senza spazi. */
export function normalizePmaDocumentId(nomeInput: string): string {
  const trimmed = nomeInput.trim()
  if (!trimmed) {
    throw new PmaNomeInvalidoError('Il nome del PMA è obbligatorio.')
  }
  if (/\s/.test(trimmed)) {
    throw new PmaNomeInvalidoError('Il nome del PMA non può contenere spazi.')
  }
  if (trimmed.includes('/')) {
    throw new PmaNomeInvalidoError('Il nome del PMA non può contenere il carattere "/".')
  }
  return trimmed.toLowerCase()
}
