/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_DEBUG: string
  readonly VITE_ENABLE_EXPORT: string
  readonly VITE_ENABLE_POLLING: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
