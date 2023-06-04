/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_APP_TITLE: string
  VITE_APP_BASE_API: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}