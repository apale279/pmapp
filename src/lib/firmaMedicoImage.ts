const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png'])

export function validateFirmaFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Formato non supportato: carica un file JPEG o PNG.'
  }
  if (file.size > MAX_BYTES) {
    return 'Il file supera il limite di 2 MB.'
  }
  return null
}

/**
 * Legge un’immagine locale come data URL (Base64) tramite `FileReader.readAsDataURL`.
 * Usato per persistere la firma medico su Firestore senza Firebase Storage.
 */
export function readImageFileAsDataUrl(file: File): Promise<string> {
  const v = validateFirmaFile(file)
  if (v) return Promise.reject(new Error(v))
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => {
      const r = fr.result
      if (typeof r === 'string') resolve(r)
      else reject(new Error('Lettura file non riuscita.'))
    }
    fr.onerror = () => reject(new Error(fr.error?.message ?? 'Lettura file non riuscita.'))
    fr.readAsDataURL(file)
  })
}
