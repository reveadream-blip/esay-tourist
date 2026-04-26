import { Navigation, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type Place = {
  id: string
  category: string
  name: string
  photo: string
  lat: number
  lng: number
  rating: number
  distanceMeters: number
}

type PlaceCardProps = {
  place: Place
}

const formatDistance = (distanceMeters: number): string => {
  if (distanceMeters < 1000) {
    return `a ${Math.round(distanceMeters)}m`
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`
}

export function PlaceCard({ place }: PlaceCardProps) {
  const { t } = useTranslation()

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`

  return (
    <article className="overflow-hidden rounded-3xl border border-white/30 bg-white/60 shadow-xl backdrop-blur-md">
      <div className="relative h-40 overflow-hidden">
        <img src={place.photo} alt={place.name} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
          {formatDistance(place.distanceMeters)}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{place.name}</h3>
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {place.rating.toFixed(1)}
          </div>
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Navigation className="h-4 w-4" />
          {t('itinerary')}
        </a>
      </div>
    </article>
  )
}
