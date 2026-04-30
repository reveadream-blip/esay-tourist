import type { CategoryId } from '../components/CategoryBar'

export const CATEGORY_RULES: Array<{
  category: Exclude<CategoryId, 'all'>
  match: (tags: Record<string, string>) => boolean
}> = [
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
    category: 'markets',
    match: (tags) =>
      tags.amenity === 'marketplace' ||
      tags.shop === 'market' ||
      tags.shop === 'greengrocer',
  },
  {
    category: 'agencies',
    match: (tags) => tags.amenity === 'travel_agency',
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
      tags.shop === 'mall',
  },
]

export function inferCategory(tags: Record<string, string>): Exclude<CategoryId, 'all'> {
  const matched = CATEGORY_RULES.find((rule) => rule.match(tags))
  return matched?.category ?? 'activities'
}

export function getStableEstimatedRating(rawId: string): number {
  const seed = rawId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return 3.8 + (seed % 12) / 10
}
