/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optionnel : https://unsplash.com/developers — photos de secours par thème de catégorie */
  readonly VITE_UNSPLASH_ACCESS_KEY?: string
  /** Optionnel : https://www.pexels.com/api/ — photos de stock (gratuit avec inscription) */
  readonly VITE_PEXELS_ACCESS_KEY?: string
  /** Optionnel : https://www.mapillary.com/dashboard/developers — vignettes « street level » (jeton client gratuit MLY|…) */
  readonly VITE_MAPILLARY_ACCESS_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
