import { useEffect, useState } from 'react'
import { Navigation, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getCategorySvgDataUrl } from '../lib/placePhoto'

export type RatingSource = 'osm' | 'estimated'

export type Place = {
  id: string
  category: string
  name: string
  photo: string
  wikipediaTag?: string
  wikidataId?: string
  lat: number
  lng: number
  rating: number
  ratingSource: RatingSource
  distanceMeters: number
}

type Props = {
  place: Place
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `à ${Math.round(distanceMeters)} m`
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`
}

export function PlaceCard({ place }: Props) {
  const { t } = useTranslation()
  const directionUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
  const categorySvgFallback = getCategorySvgDataUrl(place.category)
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
          onError={() => {
            if (imageSrc !== categorySvgFallback) {
              setImageSrc(categorySvgFallback)
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
          <div
            className={`inline-flex shrink-0 flex-col items-end gap-0.5 rounded-full px-2 py-1 text-xs font-semibold ${
              place.ratingSource === 'osm'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-600'
            }`}
            title={place.ratingSource === 'estimated' ? t('estimatedRatingHint') : undefined}
          >
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {place.rating.toFixed(1)}
            </span>
            {place.ratingSource === 'estimated' && (
              <span className="max-w-[8rem] text-[10px] font-normal leading-tight">{t('estimatedRating')}</span>
            )}
          </div>
        </div>

        <a
          href={directionUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Navigation className="h-4 w-4" aria-hidden />
          {t('itinerary')}
        </a>
      </div>
    </article>
  )
}
