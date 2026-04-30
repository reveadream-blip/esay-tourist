/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optionnel : https://unsplash.com/developers — photos de secours par thème de catégorie */
  readonly VITE_UNSPLASH_ACCESS_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
