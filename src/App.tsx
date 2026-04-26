import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { CategoryBar, type CategoryId } from './components/CategoryBar'
import { PlaceCard, type Place } from './components/PlaceCard'

const EARTH_RADIUS_KM = 6371
const MAX_RADIUS_METERS = 50000

const basePlaces: Omit<Place, 'distanceMeters'>[] = [
  {
    id: 'h-1',
    category: 'hotels',
    name: 'Azure Bay Hotel',
    photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    lat: 0,
    lng: 0,
    rating: 4.8,
  },
  {
    id: 'r-1',
    category: 'restos',
    name: 'Maison Riviera',
    photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    lat: 0,
    lng: 0,
    rating: 4.6,
  },
  {
    id: 'b-1',
    category: 'bars',
    name: 'Velvet Sky Bar',
    photo: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
    lat: 0,
    lng: 0,
    rating: 4.5,
  },
  {
    id: 'n-1',
    category: 'nightlife',
    name: 'Pulse Night Club',
    photo: 'https://images.unsplash.com/photo-1571266028243-5e6f56f71b2d?auto=format&fit=crop&w=1200&q=80',
    lat: 0,
    lng: 0,
    rating: 4.4,
  },
  {
    id: 's-1',
    category: 'spa',
    name: 'Golden Zen Spa',
    photo: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
    lat: 0,
    lng: 0,
    rating: 4.9,
  },
  {
    id: 'a-1',
    category: 'activities',
    name: 'Panorama Adventure',
    photo: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=1200&q=80',
    lat: 0,
    lng: 0,
    rating: 4.3,
  },
  {
    id: 'm-1',
    category: 'monuments',
    name: 'Heritage Landmark',
    photo: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    lat: 0,
    lng: 0,
    rating: 4.7,
  },
  {
    id: 'c-1',
    category: 'rentals',
    name: 'DriveNow Rentals',
    photo: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    lat: 0,
    lng: 0,
    rating: 4.2,
  },
]

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

function App() {
  const { t } = useTranslation()
  const [category, setCategory] = useState<CategoryId>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
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

  const places = useMemo(() => {
    if (!position) return []

    return basePlaces.map((place, index) => {
      const lat = position.lat + (index % 3 === 0 ? 0.006 : -0.004 + (index % 2) * 0.004)
      const lng = position.lng + (index % 4 === 0 ? 0.008 : -0.006 + (index % 3) * 0.004)
      const distanceMeters = haversine(position.lat, position.lng, lat, lng)

      return { ...place, lat, lng, distanceMeters }
    })
  }, [position])

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return places
      .filter((place) => place.distanceMeters >= 0 && place.distanceMeters <= MAX_RADIUS_METERS)
      .filter((place) => (category === 'all' ? true : place.category === category))
      .filter((place) => (normalizedQuery ? place.name.toLowerCase().includes(normalizedQuery) : true))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
  }, [places, category, searchQuery])

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

        {!isLoading && filteredPlaces.length > 0 && (
          <section className="space-y-3 pb-4">
            {filteredPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
