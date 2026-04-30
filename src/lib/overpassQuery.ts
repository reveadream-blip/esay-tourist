import { OVERPASS_RESULT_LIMIT } from './overpassConstants'

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function buildOverpassQuery(
  lat: number,
  lng: number,
  radiusMeters: number,
  searchTerm = '',
): string {
  const normalizedSearch = searchTerm.trim()
  const nameFilter = normalizedSearch ? `["name"~"${escapeRegex(normalizedSearch)}",i]` : ''

  return `
[out:json][timeout:40];
(
  nwr(around:${radiusMeters},${lat},${lng})[amenity~"restaurant|cafe|fast_food|food_court|bar|pub|biergarten|nightclub|spa|marketplace|travel_agency|car_rental|bicycle_rental|motorcycle_rental|vehicle_rental|boat_rental"]${nameFilter};
  nwr(around:${radiusMeters},${lat},${lng})[tourism~"hotel|motel|hostel|guest_house|apartment|attraction|museum|artwork|viewpoint|theme_park|zoo|aquarium|gallery"]${nameFilter};
  nwr(around:${radiusMeters},${lat},${lng})[historic~"monument|memorial|ruins|castle|archaeological_site"]${nameFilter};
  nwr(around:${radiusMeters},${lat},${lng})[leisure~"park|playground|sports_centre|fitness_centre|water_park|marina|spa"]${nameFilter};
  nwr(around:${radiusMeters},${lat},${lng})[shop~"mall|car_rental|massage|market|greengrocer"]${nameFilter};
);
out center ${OVERPASS_RESULT_LIMIT};
`
}

export { FAST_RADIUS_METERS, MAX_RADIUS_METERS, OVERPASS_RESULT_LIMIT } from './overpassConstants'
