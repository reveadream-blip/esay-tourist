import { useEffect, useState } from 'react'
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

type Props = {
  place: Place
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `a ${Math.round(distanceMeters)}m`
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`
}

export function PlaceCard({ place }: Props) {
  const { t } = useTranslation()
  const directionUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
  const staticMapFallback = `https://staticmap.openstreetmap.de/staticmap.php?center=${place.lat},${place.lng}&zoom=16&size=1200x800&markers=${place.lat},${place.lng},red-pushpin`
  const placeholderFallback = `https://placehold.co/1200x800/e2e8f0/475569?text=${encodeURIComponent(place.name)}`
  const [imageSrc, setImageSrc] = useState(place.photo)

  useEffect(() => {
    setImageSrc(place.photo)
  }, [place.photo])

  return (
    <article className="overflow-hidden rounded-3xl border border-white/30 bg-white/60 shadow-xl backdrop-blur-md">
      <div className="relative h-40">
        <img
          src={imageSrc}
          alt={place.name}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (imageSrc !== staticMapFallback) {
              setImageSrc(staticMapFallback)
              return
            }
            if (imageSrc !== placeholderFallback) {
              setImageSrc(placeholderFallback)
            }
          }}
        />
        <span className="absolute right-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white">
          {formatDistance(place.distanceMeters)}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">{place.name}</h3>
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {place.rating.toFixed(1)}
          </div>
        </div>

        <a
          href={directionUrl}
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
