import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { CategoryBar, type CategoryId } from './components/CategoryBar'
import { PlaceCard, type Place } from './components/PlaceCard'
import { getGooglePlacePhotoUrl, hasGooglePlacesKey } from './services/googlePlaces'

const EARTH_RADIUS_KM = 6371
const MAX_RADIUS_METERS = 50000
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const FAST_RADIUS_METERS = 8000
const OVERPASS_RESULT_LIMIT = 12000

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const toRadians = (value: number) => (value * Math.PI) / 180

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c * 1000
}

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

const CATEGORY_RULES: Array<{ category: Exclude<CategoryId, 'all'>; match: (tags: Record<string, string>) => boolean }> =
  [
    {
      category: 'hotels',
      match: (tags) =>
        ['hotel', 'motel', 'hostel', 'guest_house', 'apartment'].includes(tags.tourism ?? '') ||
        ['hotel', 'motel'].includes(tags.building ?? ''),
    },
    {
      category: 'restos',
      match: (tags) => ['restaurant', 'cafe', 'fast_food', 'food_court', 'ice_cream'].includes(tags.amenity ?? ''),
    },
    {
      category: 'bars',
      match: (tags) => ['bar', 'pub', 'biergarten'].includes(tags.amenity ?? ''),
    },
    {
      category: 'nightlife',
      match: (tags) => ['nightclub', 'stripclub'].includes(tags.amenity ?? '') || tags.club === 'nightclub',
    },
    {
      category: 'spa',
      match: (tags) => tags.amenity === 'spa' || tags.leisure === 'spa' || tags.shop === 'massage',
    },
    {
      category: 'monuments',
      match: (tags) =>
        ['monument', 'memorial', 'ruins', 'castle', 'archaeological_site'].includes(tags.historic ?? '') ||
        ['museum', 'attraction', 'artwork', 'viewpoint'].includes(tags.tourism ?? ''),
    },
    {
      category: 'rentals',
      match: (tags) =>
        ['car_rental', 'bicycle_rental', 'motorcycle_rental', 'vehicle_rental', 'boat_rental'].includes(
          tags.amenity ?? '',
        ) || tags.shop === 'car_rental',
    },
    {
      category: 'activities',
      match: (tags) =>
        ['park', 'playground', 'sports_centre', 'fitness_centre', 'water_park', 'marina'].includes(tags.leisure ?? '') ||
        ['theme_park', 'zoo', 'aquarium', 'gallery'].includes(tags.tourism ?? '') ||
        tags.amenity === 'marketplace' ||
        tags.shop === 'mall' ||
        tags.amenity === 'travel_agency',
    },
  ]

const inferCategory = (tags: Record<string, string>): Exclude<CategoryId, 'all'> => {
  const matched = CATEGORY_RULES.find((rule) => rule.match(tags))
  return matched?.category ?? 'activities'
}

const getStableRating = (rawId: string): number => {
  const seed = rawId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return 3.8 + (seed % 12) / 10
}

const toWikimediaFileUrl = (commonsFileName: string) => {
  const normalized = commonsFileName.startsWith('File:')
    ? commonsFileName.slice(5)
    : commonsFileName
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(normalized)}`
}

const getPlacePhotoUrl = (tags: Record<string, string>, lat: number, lng: number) => {
  const directImage = tags.image ?? tags['image:0']
  if (directImage && /^https?:\/\//i.test(directImage)) {
    return directImage
  }

  const wikimediaCommons = tags.wikimedia_commons
  if (wikimediaCommons) {
    return toWikimediaFileUrl(wikimediaCommons)
  }

  // Fallback to a static map centered on the exact place location.
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=1200x800&markers=${lat},${lng},red-pushpin`
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildOverpassQuery = (lat: number, lng: number, radiusMeters: number, searchTerm = ''): string => {
  const normalizedSearch = searchTerm.trim()
  const nameFilter = normalizedSearch ? `["name"~"${escapeRegex(normalizedSearch)}",i]` : ''

  return `
[out:json][timeout:40];
(
  nwr(around:${radiusMeters},${lat},${lng})[amenity~"restaurant|cafe|fast_food|food_court|bar|pub|biergarten|nightclub|spa|marketplace|travel_agency|car_rental|bicycle_rental|motorcycle_rental|vehicle_rental|boat_rental"]${nameFilter};
  nwr(around:${radiusMeters},${lat},${lng})[tourism~"hotel|motel|hostel|guest_house|apartment|attraction|museum|artwork|viewpoint|theme_park|zoo|aquarium|gallery"]${nameFilter};
  nwr(around:${radiusMeters},${lat},${lng})[historic~"monument|memorial|ruins|castle|archaeological_site"]${nameFilter};
  nwr(around:${radiusMeters},${lat},${lng})[leisure~"park|playground|sports_centre|fitness_centre|water_park|marina|spa"]${nameFilter};
  nwr(around:${radiusMeters},${lat},${lng})[shop~"mall|car_rental|massage"]${nameFilter};
);
out center ${OVERPASS_RESULT_LIMIT};
`
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

  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLoading(false)
      setLocationError(true)
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude })
        setIsLoading(false)
      },
      () => {
        setLocationError(true)
        setIsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
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

          const distanceMeters = haversine(position.lat, position.lng, lat, lng)
          if (distanceMeters > MAX_RADIUS_METERS) return acc

          const id = `${element.type}-${element.id}`
          const categoryId = inferCategory(tags)
          const stars = Number(tags.stars)
          const rating = Number.isFinite(stars) && stars > 0 ? Math.min(5, stars) : getStableRating(id)

          acc.push({
            id,
            category: categoryId,
            name,
            photo: getPlacePhotoUrl(tags, lat, lng),
            lat,
            lng,
            rating,
            distanceMeters,
          })
          return acc
        }, [])
        .filter((place, index, array) => array.findIndex((item) => item.id === place.id) === index)

    const fetchAndParse = async (radiusMeters: number) => {
      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        body: buildOverpassQuery(position.lat, position.lng, radiusMeters, debouncedSearch),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Overpass failed: ${response.status}`)
      }

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

        // Step 1: quick nearby results for fast map rendering.
        const fastPlaces = await fetchAndParse(FAST_RADIUS_METERS)
        if (!controller.signal.aborted) {
          setPlaces(fastPlaces)
          setIsLoading(false)
          sessionStorage.setItem(`easytravel-fast-${cacheKeyBase}`, JSON.stringify(fastPlaces))
        }

        // Step 2: full 50km enrichment in background.
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
      } catch (error) {
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
    if (!hasGooglePlacesKey || places.length === 0) return

    const controller = new AbortController()
    const enrichPhotos = async () => {
      const subset = places.slice(0, 20)
      const updates = await Promise.all(
        subset.map(async (place) => {
          const cacheKey = `easytravel-google-photo-${place.id}`
          const cached = sessionStorage.getItem(cacheKey)
          if (cached) {
            return { id: place.id, photo: cached }
          }

          try {
            const photoUrl = await getGooglePlacePhotoUrl(place.name, place.lat, place.lng)
            if (!photoUrl) return null
            sessionStorage.setItem(cacheKey, photoUrl)
            return { id: place.id, photo: photoUrl }
          } catch {
            return null
          }
        }),
      )

      if (controller.signal.aborted) return
      const updateMap = new Map(updates.filter((item): item is { id: string; photo: string } => Boolean(item)).map((item) => [item.id, item.photo]))
      if (updateMap.size === 0) return

      setPlaces((currentPlaces) =>
        currentPlaces.map((place) => {
          const nextPhoto = updateMap.get(place.id)
          return nextPhoto ? { ...place, photo: nextPhoto } : place
        }),
      )
    }

    void enrichPhotos()
    return () => controller.abort()
  }, [places])

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return places
      .filter((place) => place.distanceMeters >= 0 && place.distanceMeters <= MAX_RADIUS_METERS)
      .filter((place) => (category === 'all' ? true : place.category === category))
      .filter((place) => (normalizedQuery ? place.name.toLowerCase().includes(normalizedQuery) : true))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
  }, [places, category, searchQuery])

  const hasActiveSearch = searchQuery.trim().length > 0
  const focusedPlace = hasActiveSearch && filteredPlaces.length > 0 ? filteredPlaces[0] : null
  const listPlaces = hasActiveSearch && focusedPlace
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
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-xl border border-white/30 bg-white/70 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2"
            />
          </label>
          <p className="mt-2 px-1 text-xs font-medium text-slate-600">{t('radiusLabel')}</p>
        </section>

        {position && (
          <section className="overflow-hidden rounded-3xl border border-white/30 bg-white/55 shadow-xl backdrop-blur-md">
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
              {filteredPlaces.map((place) => (
                <Marker key={place.id} position={[place.lat, place.lng]}>
                  <Popup>{place.name}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </section>
        )}

        {focusedPlace && (
          <section className="space-y-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {t('searchResultCard')}
            </p>
            <PlaceCard place={focusedPlace} />
          </section>
        )}

        {isLoading && (
          <section className="space-y-3">
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
          <section className="space-y-3 pb-4">
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
