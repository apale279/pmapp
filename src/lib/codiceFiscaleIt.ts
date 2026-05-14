/** Pattern codice fiscale italiano (16 caratteri, senza omocodia). */
const CF_16_RE = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i

/**
 * Normalizza testo grezzo da barcode (solo A–Z e 0–9, maiuscolo).
 */
export function normalizeCfAlnum(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

export function isCodiceFiscaleItaliano16(s: string): boolean {
  return s.length === 16 && CF_16_RE.test(s)
}

/**
 * Estrae un CF plausibile da stringa letta (CODE 128 tessera sanitaria: 16 caratteri CF).
 * Se la stringa è più lunga, cerca una finestra di 16 caratteri che rispetti il pattern.
 */
export function extractCfFromBarcodeText(raw: string): string | null {
  const alnum = normalizeCfAlnum(raw)
  if (alnum.length === 16 && isCodiceFiscaleItaliano16(alnum)) return alnum
  if (alnum.length > 16) {
    for (let i = 0; i <= alnum.length - 16; i++) {
      const slice = alnum.slice(i, i + 16)
      if (isCodiceFiscaleItaliano16(slice)) return slice
    }
  }
  return null
}
