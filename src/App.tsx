import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { CategoryBar, type CategoryId } from './components/CategoryBar'
import { PlaceCard, type Place } from './components/PlaceCard'

const EARTH_RADIUS_KM = 6371

const basePlaces: Omit<Place, 'distanceMeters'>[] = [
  { id: 'h1', category: 'hotels', name: 'Aurora Grand Hotel', photo: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=900&q=80', lat: 0, lng: 0, rating: 4.7 },
  { id: 'r1', category: 'restos', name: 'Le Palmier Bistro', photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80', lat: 0, lng: 0, rating: 4.6 },
  { id: 'b1', category: 'bars', name: 'Moonlight Rooftop', photo: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=900&q=80', lat: 0, lng: 0, rating: 4.5 },
  { id: 'n1', category: 'nightlife', name: 'Neon Pulse Club', photo: 'https://images.unsplash.com/photo-1571266028243-5e6f56f71b2d?auto=format&fit=crop&w=900&q=80', lat: 0, lng: 0, rating: 4.4 },
  { id: 's1', category: 'spa', name: 'Harmony Spa Retreat', photo: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80', lat: 0, lng: 0, rating: 4.8 },
  { id: 'a1', category: 'activities', name: 'Skyline Adventure Park', photo: 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?auto=format&fit=crop&w=900&q=80', lat: 0, lng: 0, rating: 4.3 },
  { id: 'm1', category: 'monuments', name: 'Liberty Heritage Monument', photo: 'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?auto=format&fit=crop&w=900&q=80', lat: 0, lng: 0, rating: 4.7 },
  { id: 'c1', category: 'rentals', name: 'CityDrive Rentals', photo: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80', lat: 0, lng: 0, rating: 4.2 },
]

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const toRadians = (value: number) => (value * Math.PI) / 180

const haversineDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c * 1000
}

const offsetByIndex = (origin: { lat: number; lng: number }, index: number) => {
  const latOffset = ((index % 3) - 1) * 0.008
  const lngOffset = (Math.floor(index / 3) - 1) * 0.01

  return {
    lat: origin.lat + latOffset,
    lng: origin.lng + lngOffset,
  }
}

function App() {
  const { t } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('hotels')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(true)
      setIsLoadingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude })
        setIsLoadingLocation(false)
      },
      () => {
        setLocationError(true)
        setIsLoadingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }, [])

  const places = useMemo(() => {
    if (!location) return []

    return basePlaces.map((place, index) => {
      const offsetPoint = offsetByIndex(location, index + 1)
      const distanceMeters = haversineDistanceMeters(location.lat, location.lng, offsetPoint.lat, offsetPoint.lng)

      return { ...place, ...offsetPoint, distanceMeters }
    })
  }, [location])

  const filteredPlaces = useMemo(
    () => places.filter((place) => place.category === selectedCategory),
    [places, selectedCategory],
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-indigo-100 px-4 py-5 text-slate-800">
      <main className="mx-auto flex w-full max-w-md flex-col gap-4">
        <header className="rounded-3xl border border-white/30 bg-white/50 p-5 shadow-xl backdrop-blur-md">
          <h1 className="text-2xl font-bold text-slate-900">{t('appTitle')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('appSubtitle')}</p>
        </header>

        <CategoryBar selected={selectedCategory} onSelect={setSelectedCategory} />

        {location && (
          <section className="overflow-hidden rounded-3xl border border-white/30 bg-white/55 shadow-xl backdrop-blur-md">
            <div className="px-4 py-3 text-sm font-semibold text-slate-700">{t('aroundYou')}</div>
            <MapContainer center={[location.lat, location.lng]} zoom={14} className="h-52 w-full">
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[location.lat, location.lng]}>
                <Popup>{t('yourLocation')}</Popup>
              </Marker>
              {filteredPlaces.map((place) => (
                <Marker key={place.id} position={[place.lat, place.lng]}>
                  <Popup>{place.name}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </section>
        )}

        {isLoadingLocation && (
          <section className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="animate-pulse overflow-hidden rounded-3xl border border-white/30 bg-white/55 p-4 shadow-xl backdrop-blur-md"
              >
                <div className="h-36 rounded-2xl bg-slate-200" />
                <div className="mt-4 h-4 w-2/3 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-1/3 rounded bg-slate-200" />
                <div className="mt-4 h-10 rounded-xl bg-slate-200" />
              </div>
            ))}
          </section>
        )}

        {!isLoadingLocation && locationError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {t('locationError')}
          </div>
        )}

        {!isLoadingLocation && !locationError && filteredPlaces.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-600 backdrop-blur-md">
            {t('noPlaces')}
          </div>
        )}

        {!isLoadingLocation && filteredPlaces.length > 0 && (
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
