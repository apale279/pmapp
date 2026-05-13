/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  /** Opzionale: credenziali bootstrap Superadmin di test (solo sviluppo) */
  readonly VITE_BOOTSTRAP_SUPERADMIN_EMAIL?: string
  readonly VITE_BOOTSTRAP_SUPERADMIN_PASSWORD?: string
  /** Regione Cloud Functions (es. europe-west1). Deve coincidere con il deploy. */
  readonly VITE_FIREBASE_FUNCTIONS_REGION?: string
  /** Cloudinary: cloud name (unsigned upload da browser). */
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string
  /** Cloudinary: upload preset di tipo unsigned. */
  readonly VITE_CLOUDINARY_UPLOAD_PRESET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
