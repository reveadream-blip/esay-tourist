import type { CategoryId } from '../components/CategoryBar'
import { getKartaViewPhotoUrl, getMapillaryThumbnailUrl } from './streetImagery'

/** https://meta.wikimedia.org/wiki/User-Agent_policy */
export const WIKIMEDIA_USER_AGENT =
  'EasyTravel/1.0 (https://github.com/reveadream-blip/esay-tourist; easy-travel-pwa)'

const wikimediaFetch = (url: string, init: RequestInit = {}) =>
  fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'User-Agent': WIKIMEDIA_USER_AGENT,
      'Api-User-Agent': WIKIMEDIA_USER_AGENT,
      ...((init.headers as Record<string, string>) ?? {}),
    },
  })

const toWikimediaFileUrl = (commonsFileName: string) => {
  const normalized = commonsFileName.startsWith('File:') ? commonsFileName.slice(5) : commonsFileName
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(normalized)}`
}

export function extractWikidataId(tags: Record<string, string>): string | undefined {
  const raw = tags.wikidata ?? tags['brand:wikidata'] ?? tags['operator:wikidata']
  if (!raw) return undefined
  const match = raw.match(/Q\d+/i)
  return match ? match[0].toUpperCase() : undefined
}

export function extractWikipediaTag(tags: Record<string, string>): string | undefined {
  const direct = tags.wikipedia?.trim()
  if (direct) return direct
  const langKey = Object.keys(tags).find((k) => k.startsWith('wikipedia:') && tags[k]?.trim())
  return langKey ? tags[langKey]?.trim() : undefined
}

const CATEGORY_COMMONS_KEYWORD: Record<Exclude<CategoryId, 'all'>, string> = {
  hotels: 'hotel building exterior',
  restos: 'restaurant interior food',
  bars: 'bar pub interior',
  markets: 'market hall food',
  agencies: 'travel agency office',
  nightlife: 'nightclub venue',
  spa: 'spa wellness',
  activities: 'leisure park',
  monuments: 'historic landmark',
  rentals: 'car rental',
}

export function categoryToCommonsKeyword(category: string): string {
  if (category === 'all') return 'travel destination'
  return CATEGORY_COMMONS_KEYWORD[category as Exclude<CategoryId, 'all'>] ?? 'city street'
}

/** Mots-clés courts pour affiner la recherche Commons sur le nom du lieu. */
export function categoryToStockKeyword(category: string): string {
  const m: Record<string, string> = {
    hotels: 'hotel building',
    restos: 'restaurant',
    bars: 'bar pub',
    markets: 'food market',
    agencies: 'travel office',
    nightlife: 'nightclub',
    spa: 'spa interior',
    activities: 'leisure park',
    monuments: 'historic landmark',
    rentals: 'car rental',
  }
  return m[category] ?? 'travel destination'
}

export function getCategorySvgDataUrl(category: string): string {
  const palette: Record<string, [string, string, string]> = {
    hotels: ['#dbeafe', '#3b82f6', '🏨'],
    restos: ['#fef3c7', '#f59e0b', '🍽'],
    bars: ['#fce7f3', '#db2777', '🍹'],
    markets: ['#dcfce7', '#16a34a', '🛒'],
    agencies: ['#e0e7ff', '#6366f1', '✈'],
    nightlife: ['#ede9fe', '#7c3aed', '🎵'],
    spa: ['#ccfbf1', '#0d9488', '💆'],
    activities: ['#cffafe', '#0891b2', '🎯'],
    monuments: ['#fee2e2', '#dc2626', '🏛'],
    rentals: ['#f3f4f6', '#475569', '🚗'],
  }
  const [c1, c2, emoji] = palette[category] ?? ['#f1f5f9', '#64748b', '📍']
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><text x="600" y="440" text-anchor="middle" font-size="140">${emoji}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** True tant qu'on peut encore tenter une vraie image (pas carte / pas état final « sans photo »). */
export function isPhotoPlaceholder(photo: string): boolean {
  if (photo.includes('easytravel-pending')) return true
  return (
    photo.includes('tile.openstreetmap.org') ||
    photo.includes('staticmap.openstreetmap.de') ||
    photo.includes('placehold.co')
  )
}

export function getPlacePhotoUrl(tags: Record<string, string>): string {
  const directImage = tags.image ?? tags['image:0']
  if (directImage && /^https?:\/\//i.test(directImage)) {
    return directImage
  }

  const wikimediaCommons = tags.wikimedia_commons
  if (wikimediaCommons) {
    return toWikimediaFileUrl(wikimediaCommons)
  }

  /* Pas d'URL OSM : pas de carte en vignette — placeholder jusqu'à enrichissement (Commons / wiki / rue). */
  return getPendingPhotoDataUrl()
}

/** SVG neutre pendant la recherche d'une vraie photo (pas une carte). */
export function getPendingPhotoDataUrl(): string {
  const svg =
    '<!--easytravel-pending--><svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e2e8f0"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><text x="600" y="390" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" fill="#64748b">Recherche d\'une photo du lieu…</text><text x="600" y="430" text-anchor="middle" font-family="system-ui,sans-serif" font-size="17" fill="#94a3b8">Wikidata · Commons · vues de rue</text></svg>'
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** État final : aucune image trouvée pour cet établissement (pas une photo carte). */
export function getNoPhotoDataUrl(): string {
  const svg =
    '<!--easytravel-nophoto--><svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f1f5f9"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><text x="600" y="380" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" fill="#475569">Aucune photo du lieu</text><text x="600" y="420" text-anchor="middle" font-family="system-ui,sans-serif" font-size="17" fill="#94a3b8">Pas d\'image trouvée (Wikidata, Commons, vues de rue)</text></svg>'
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * Sans `\p{Letter}` (certains WebViews / Safari anciens plantent le parsing du bundle).
 */
export function sanitizePlaceNameForImageSearch(name: string): string {
  const mapped = name
    .split('')
    .map((ch) => {
      const cp = ch.codePointAt(0)!
      if (cp <= 0x1f || cp === 0x7f) return ' '
      if (cp < 0x80) {
        if (/[0-9A-Za-z'\s-]/.test(ch)) return ch
        return ' '
      }
      return ch
    })
    .join('')
  return mapped.replace(/\s+/g, ' ').trim().slice(0, 96)
}

function parseWikipediaTag(wikipediaTag: string): { lang: string; title: string } | null {
  const separatorIndex = wikipediaTag.indexOf(':')
  if (separatorIndex <= 0) return null
  const lang = wikipediaTag.slice(0, separatorIndex)
  const title = wikipediaTag.slice(separatorIndex + 1).replace(/ /g, '_')
  if (!lang || !title) return null
  return { lang, title }
}

/** Résumé REST (souvent OK en navigateur) ; fallback action=query+pageimages avec origin=* (CORS MediaWiki). */
export async function getWikipediaThumbnail(wikipediaTag: string): Promise<string | null> {
  const parsed = parseWikipediaTag(wikipediaTag)
  if (!parsed) return null

  const { lang, title } = parsed
  const endpoint = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`

  try {
    const response = await wikimediaFetch(endpoint)
    if (response.ok) {
      const data = (await response.json()) as { thumbnail?: { source?: string } }
      const fromRest = data.thumbnail?.source
      if (fromRest && /^https?:\/\//i.test(fromRest)) return fromRest
    }
  } catch {
    /* fall through to action=query */
  }

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: '800',
    titles: title.replace(/_/g, ' '),
  })
  const apiUrl = `https://${lang}.wikipedia.org/w/api.php?${params}`
  const apiRes = await wikimediaFetch(apiUrl)
  if (!apiRes.ok) return null

  const apiData = (await apiRes.json()) as {
    query?: { pages?: Record<string, { thumbnail?: { source?: string } }> }
  }
  const pages = apiData.query?.pages
  if (!pages) return null

  for (const page of Object.values(pages)) {
    const src = page.thumbnail?.source
    if (src && /^https?:\/\//i.test(src)) return src
  }
  return null
}

type WbEntitiesResponse = {
  entities?: Record<
    string,
    {
      claims?: {
        P18?: Array<{ mainsnak?: { datavalue?: { value?: string } } }>
      }
    }
  >
}

export async function getWikidataP18ImageUrl(qid: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: qid,
    format: 'json',
    props: 'claims',
    origin: '*',
  })
  const response = await wikimediaFetch(`https://www.wikidata.org/w/api.php?${params}`)
  if (!response.ok) return null

  const data = (await response.json()) as WbEntitiesResponse
  const entity = data.entities?.[qid]
  const p18 = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value
  if (!p18 || typeof p18 !== 'string') return null

  const fileName = p18.startsWith('File:') ? p18 : `File:${p18}`
  return toWikimediaFileUrl(fileName)
}

type CommonsQueryResponse = {
  query?: {
    pages?: Record<
      string,
      {
        imageinfo?: Array<{ thumburl?: string; url?: string }>
      }
    >
  }
}

/** Image Commons géolocalisée la plus proche (souvent mieux qu’un mot-clé générique). */
export async function getCommonsNearbyImageUrl(lat: number, lng: number): Promise<string | null> {
  const listParams = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    list: 'geosearch',
    gscoord: `${lat}|${lng}`,
    gsradius: '2500',
    gslimit: '6',
    gsnamespace: '6',
  })
  const listRes = await wikimediaFetch(`https://commons.wikimedia.org/w/api.php?${listParams}`)
  if (!listRes.ok) return null

  const listData = (await listRes.json()) as {
    query?: { geosearch?: Array<{ pageid: number }> }
  }
  const pageid = listData.query?.geosearch?.[0]?.pageid
  if (pageid === undefined) return null

  const imgParams = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    pageids: String(pageid),
    prop: 'imageinfo',
    iiprop: 'url|thumburl',
    iiurlwidth: '800',
  })
  const imgRes = await wikimediaFetch(`https://commons.wikimedia.org/w/api.php?${imgParams}`)
  if (!imgRes.ok) return null

  const imgData = (await imgRes.json()) as CommonsQueryResponse
  const pages = imgData.query?.pages
  if (!pages) return null

  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0]
    const url = info?.thumburl ?? info?.url
    if (url && /^https?:\/\//i.test(url)) return url
  }
  return null
}

export async function getCommonsSearchImageUrl(searchQuery: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: searchQuery,
    gsrnamespace: '6',
    gsrlimit: '5',
    prop: 'imageinfo',
    iiprop: 'url|thumburl',
    iiurlwidth: '800',
  })

  const response = await wikimediaFetch(`https://commons.wikimedia.org/w/api.php?${params}`)
  if (!response.ok) return null

  const data = (await response.json()) as CommonsQueryResponse
  const pages = data.query?.pages
  if (!pages) return null

  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0]
    const url = info?.thumburl ?? info?.url
    if (url && /^https?:\/\//i.test(url)) return url
  }
  return null
}

async function getCommonsImagesForNamedPlace(name: string, category: string): Promise<string | null> {
  const clean = sanitizePlaceNameForImageSearch(name)
  if (clean.length < 2) return null

  const commonsCat = categoryToCommonsKeyword(category)
  const stockShort = categoryToStockKeyword(category)
  const queries = [`${clean} ${commonsCat}`, `${clean} ${stockShort}`, clean]

  for (const q of queries) {
    const u = await raceTimeout(getCommonsSearchImageUrl(q), 8000)
    if (u) return u
  }
  return null
}

/** Timeout pour ne pas bloquer sur une API lente (ex. KartaView saturée). */
function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = globalThis.setTimeout(() => resolve(null), ms)
    void Promise.resolve(promise)
      .then((v) => {
        globalThis.clearTimeout(timer)
        resolve(v ?? null)
      })
      .catch(() => {
        globalThis.clearTimeout(timer)
        resolve(null)
      })
  })
}

export type PhotoEnrichmentInput = {
  placeId: string
  name: string
  wikidataId?: string
  wikipediaTag?: string
  category: string
  lat: number
  lng: number
}

/**
 * Uniquement des sources pouvant représenter le lieu (wiki, Commons au nom du POI, rue).
 * Pas de stock / pas de photo aléatoire. Retourne null → utiliser getNoPhotoDataUrl().
 */
export async function resolveEnrichedPhoto(input: PhotoEnrichmentInput): Promise<string | null> {
  const tWiki = 12_000
  const tNet = 7000
  const tKarta = 4500

  if (input.wikidataId) {
    const u = await raceTimeout(getWikidataP18ImageUrl(input.wikidataId), tWiki)
    if (u) return u
  }
  if (input.wikipediaTag) {
    const u = await raceTimeout(getWikipediaThumbnail(input.wikipediaTag), tWiki)
    if (u) return u
  }

  const byName = await getCommonsImagesForNamedPlace(input.name, input.category)
  if (byName) return byName

  const near = await raceTimeout(getCommonsNearbyImageUrl(input.lat, input.lng), tNet)
  if (near) return near

  const mapillaryToken = import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN
  const mly = await raceTimeout(getMapillaryThumbnailUrl(input.lat, input.lng, mapillaryToken), tNet)
  if (mly) return mly

  const karta = await raceTimeout(getKartaViewPhotoUrl(input.lat, input.lng), tKarta)
  if (karta) return karta

  return null
}
