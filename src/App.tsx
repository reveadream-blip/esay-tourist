import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { CategoryBar, type CategoryId } from './components/CategoryBar'
import { ClusteredPlaceMarkers } from './components/ClusteredPlaceMarkers'
import { PlaceCard, type Place } from './components/PlaceCard'
import { haversineMeters } from './lib/geo'
import { fetchOverpass } from './lib/overpass'
import {
  buildOverpassQuery,
  FAST_RADIUS_METERS,
  MAX_RADIUS_METERS,
} from './lib/overpassQuery'
import {
  extractWikidataId,
  extractWikipediaTag,
  getPlacePhotoUrl,
  isPhotoPlaceholder,
  resolveEnrichedPhoto,
} from './lib/placePhoto'
import { getStableEstimatedRating, inferCategory } from './lib/placesLogic'
import { getSearchRelevanceScore } from './lib/searchRelevance'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

type OsmElement = {
  id: number
  type: 'node' | 'way' | 'relation'
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

type OsmResponse = {
  elements: OsmElement[]
}

type SearchMapFocusProps = {
  place: Place | null
  hasActiveSearch: boolean
}

function SearchMapFocus({ place, hasActiveSearch }: SearchMapFocusProps) {
  const map = useMap()

  useEffect(() => {
    if (!hasActiveSearch || !place) return
    map.flyTo([place.lat, place.lng], 16, { duration: 0.8 })
  }, [map, place, hasActiveSearch])

  return null
}

function App() {
  const { t } = useTranslation()
  const [category, setCategory] = useState<CategoryId>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [locationError, setLocationError] = useState(false)
  const attemptedPhotoEnrichmentRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLoading(false)
      setLocationError(true)
      return
    }

    let watchId: number | undefined
    let debounceTimer: ReturnType<typeof setTimeout>

    const applyPosition = (lat: number, lng: number) => {
      setPosition((prev) => {
        if (prev && Math.abs(prev.lat - lat) < 0.00005 && Math.abs(prev.lng - lng) < 0.00005) {
          return prev
        }
        return { lat, lng }
      })
      setIsLoading(false)
      setLocationError(false)
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => applyPosition(coords.latitude, coords.longitude),
      () => {
        setLocationError(true)
        setIsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )

    watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        window.clearTimeout(debounceTimer)
        debounceTimer = window.setTimeout(() => {
          applyPosition(coords.latitude, coords.longitude)
        }, 1500)
      },
      () => {
        /* erreurs silencieuses : le premier getCurrentPosition gère l’échec total */
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 25000 },
    )

    return () => {
      window.clearTimeout(debounceTimer)
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 350)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (!position) return

    const controller = new AbortController()
    const cacheKeyBase = `${position.lat.toFixed(3)}-${position.lng.toFixed(3)}-${debouncedSearch.trim().toLowerCase()}`

    const parsePlaces = (data: OsmResponse): Place[] =>
      data.elements
        .reduce<Place[]>((acc, element) => {
          const lat = element.lat ?? element.center?.lat
          const lng = element.lon ?? element.center?.lon
          if (lat === undefined || lng === undefined) return acc

          const tags = element.tags ?? {}
          const name = tags.name ?? tags['name:en'] ?? tags.brand
          if (!name) return acc

          const distanceMeters = haversineMeters(position.lat, position.lng, lat, lng)
          if (distanceMeters > MAX_RADIUS_METERS) return acc

          const id = `${element.type}-${element.id}`
          const categoryId = inferCategory(tags)
          const stars = Number(tags.stars)
          const hasOsmStars = Number.isFinite(stars) && stars > 0
          const rating = hasOsmStars ? Math.min(5, stars) : getStableEstimatedRating(id)
          const ratingSource = hasOsmStars ? 'osm' : 'estimated'

          acc.push({
            id,
            category: categoryId,
            name,
            photo: getPlacePhotoUrl(tags, categoryId),
            wikipediaTag: extractWikipediaTag(tags),
            wikidataId: extractWikidataId(tags),
            lat,
            lng,
            rating,
            ratingSource,
            distanceMeters,
          })
          return acc
        }, [])
        .filter((place, index, array) => array.findIndex((item) => item.id === place.id) === index)

    const fetchAndParse = async (radiusMeters: number) => {
      const query = buildOverpassQuery(position.lat, position.lng, radiusMeters, debouncedSearch)
      const response = await fetchOverpass(query, controller.signal)

      const data = (await response.json()) as OsmResponse
      return parsePlaces(data)
    }

    const loadNearbyPlaces = async () => {
      setIsLoading(true)
      try {
        const cachedFast = sessionStorage.getItem(`easytravel-fast-${cacheKeyBase}`)
        if (cachedFast) {
          setPlaces(JSON.parse(cachedFast) as Place[])
          setIsLoading(false)
        }

        const fastPlaces = await fetchAndParse(FAST_RADIUS_METERS)
        if (!controller.signal.aborted) {
          setPlaces(fastPlaces)
          setIsLoading(false)
          sessionStorage.setItem(`easytravel-fast-${cacheKeyBase}`, JSON.stringify(fastPlaces))
        }

        const fullCacheKey = `easytravel-full-${cacheKeyBase}`
        const cachedFull = sessionStorage.getItem(fullCacheKey)
        if (cachedFull && !controller.signal.aborted) {
          setPlaces(JSON.parse(cachedFull) as Place[])
          return
        }

        const fullPlaces = await fetchAndParse(MAX_RADIUS_METERS)
        if (!controller.signal.aborted) {
          setPlaces(fullPlaces)
          sessionStorage.setItem(fullCacheKey, JSON.stringify(fullPlaces))
        }
      } catch {
        if (!controller.signal.aborted) {
          setPlaces([])
          setIsLoading(false)
        }
      }
    }

    void loadNearbyPlaces()
    return () => controller.abort()
  }, [position, debouncedSearch])

  useEffect(() => {
    const candidates = places
      .filter(
        (place) => isPhotoPlaceholder(place.photo) && !attemptedPhotoEnrichmentRef.current.has(place.id),
      )
      .slice(0, 18)

    if (candidates.length === 0) return

    candidates.forEach((place) => attemptedPhotoEnrichmentRef.current.add(place.id))

    let cancelled = false
    const concurrency = 3
    const queue = [...candidates]

    const runWorkers = async () => {
      const updates: Array<{ id: string; photo: string }> = []

      const worker = async () => {
        while (queue.length > 0 && !cancelled) {
          const place = queue.shift()
          if (!place) continue

          try {
            const url = await resolveEnrichedPhoto({
              wikidataId: place.wikidataId,
              wikipediaTag: place.wikipediaTag,
              category: place.category,
            })
            if (url) {
              updates.push({ id: place.id, photo: url })
            }
          } catch {
            /* ignore */
          }
        }
      }

      await Promise.all(Array.from({ length: concurrency }, () => worker()))

      if (cancelled || updates.length === 0) return

      const updateMap = new Map(updates.map((item) => [item.id, item.photo]))
      setPlaces((currentPlaces) =>
        currentPlaces.map((place) => {
          const nextPhoto = updateMap.get(place.id)
          return nextPhoto ? { ...place, photo: nextPhoto } : place
        }),
      )
    }

    void runWorkers()
    return () => {
      cancelled = true
    }
  }, [places])

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    const filtered = places
      .filter((place) => (category === 'all' ? true : place.category === category))
      .filter((place) =>
        normalizedQuery ? place.name.toLowerCase().includes(normalizedQuery) : true,
      )

    return filtered.sort((a, b) => {
      if (normalizedQuery) {
        const scoreA = getSearchRelevanceScore(normalizedQuery, a.name)
        const scoreB = getSearchRelevanceScore(normalizedQuery, b.name)
        if (scoreB !== scoreA) return scoreB - scoreA
      }
      return a.distanceMeters - b.distanceMeters
    })
  }, [places, category, searchQuery])

  const mapMarkers = useMemo(
    () =>
      filteredPlaces.map((place) => ({
        id: place.id,
        lat: place.lat,
        lng: place.lng,
        name: place.name,
      })),
    [filteredPlaces],
  )

  const hasActiveSearch = searchQuery.trim().length > 0
  const focusedPlace = hasActiveSearch && filteredPlaces.length > 0 ? filteredPlaces[0] : null
  const listPlaces =
    hasActiveSearch && focusedPlace
      ? filteredPlaces.filter((place) => place.id !== focusedPlace.id)
      : filteredPlaces

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-indigo-100 px-4 py-5 text-slate-800">
      <main className="mx-auto flex w-full max-w-md flex-col gap-4">
        <header className="rounded-3xl border border-white/30 bg-white/50 p-5 shadow-xl backdrop-blur-md">
          <h1 className="text-2xl font-bold text-slate-900">{t('appTitle')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('appSubtitle')}</p>
        </header>

        <CategoryBar selected={category} onChange={setCategory} />

        <section className="rounded-2xl border border-white/30 bg-white/55 p-3 shadow-xl backdrop-blur-md">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
              aria-label={t('aria.searchLabel')}
              className="w-full rounded-xl border border-white/30 bg-white/70 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2"
            />
          </label>
          <p className="mt-2 px-1 text-xs font-medium text-slate-600">{t('radiusLabel')}</p>
        </section>

        {position && (
          <section
            className="overflow-hidden rounded-3xl border border-white/30 bg-white/55 shadow-xl backdrop-blur-md"
            aria-label={t('aria.mapSection')}
          >
            <p className="px-4 py-3 text-sm font-semibold text-slate-700">{t('nearbyMap')}</p>
            <MapContainer center={[position.lat, position.lng]} zoom={14} className="h-56 w-full">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <SearchMapFocus place={focusedPlace} hasActiveSearch={hasActiveSearch} />
              <Marker position={[position.lat, position.lng]}>
                <Popup>{t('yourPosition')}</Popup>
              </Marker>
              <ClusteredPlaceMarkers places={mapMarkers} />
            </MapContainer>
          </section>
        )}

        {focusedPlace && (
          <section className="space-y-2" aria-label={t('searchResultCard')}>
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {t('searchResultCard')}
            </p>
            <PlaceCard place={focusedPlace} />
          </section>
        )}

        {isLoading && (
          <section className="space-y-3" aria-busy="true" aria-live="polite">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse overflow-hidden rounded-3xl border border-white/30 bg-white/55 p-4 shadow-xl backdrop-blur-md"
              >
                <div className="h-36 rounded-2xl bg-slate-200" />
                <div className="mt-4 h-4 w-2/3 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-1/3 rounded bg-slate-200" />
                <div className="mt-4 h-10 rounded-xl bg-slate-200" />
              </div>
            ))}
            <p className="px-1 text-sm text-slate-600">{t('loading')}</p>
          </section>
        )}

        {!isLoading && locationError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {t('locationError')}
          </div>
        )}

        {!isLoading && !locationError && filteredPlaces.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700 backdrop-blur-md">
            {t('noResults')}
          </div>
        )}

        {!isLoading && listPlaces.length > 0 && (
          <section className="space-y-3 pb-4" aria-label={t('aria.resultsList')}>
            {listPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
