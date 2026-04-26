export type GooglePlaceResult = {
  place_id: string;
  name: string;
  vicinity?: string;
  geometry: { location: { lat: number; lng: number } };
};

export type Poi = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
};

/** Maps app categories to Google Places `type` (Nearby Search). */
export const categoryToPlaceType: Record<string, string> = {
  all: 'point_of_interest',
  restaurant: 'restaurant',
  hotel: 'lodging',
  shop: 'store',
  travel: 'travel_agency',
  grocery: 'grocery_or_supermarket',
  bakery: 'bakery',
};

const NEARBY_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

function getApiKey(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
}

export function hasPlacesApiKey(): boolean {
  return getApiKey().length > 0;
}

/** Source utilisée côté UI (affichage discret). */
export type PoiDataSource = 'google' | 'osm' | 'fallback';

async function fetchNearbyPoisViaCloudflareProxy(
  latitude: number,
  longitude: number,
  categoryKey: string,
  searchTerm: string,
  radiusMeters: number
): Promise<Poi[]> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    category: categoryKey,
    q: searchTerm,
    radius: String(radiusMeters),
  });
  const res = await fetch(`/api/pois?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Proxy HTTP ${res.status}`);
  }
  const json = (await res.json()) as { pois?: Poi[] };
  return json.pois ?? [];
}

function fallbackPois(
  latitude: number,
  longitude: number,
  categoryKey: string,
  searchTerm: string
): Poi[] {
  const labels: Record<string, string[]> = {
    all: ['City Center', 'Tourist Info', 'Local Market', 'Scenic Spot'],
    restaurant: ['Bistro Soleil', 'Ocean Grill', 'Casa Pasta', 'Street Food Corner'],
    hotel: ['Grand Horizon Hotel', 'City Nest Hotel', 'Blue Bay Resort', 'Urban Stay'],
    shop: ['Central Mall', 'Artisan Boutique', 'Souvenir House', 'Fashion Point'],
    travel: ['Adventure Tours', 'Easy Excursions', 'Local Guide Hub', 'City Trips'],
    grocery: ['Fresh Market', 'Daily Grocery', 'Green Basket', 'Mini Mart'],
    bakery: ['Sunrise Bakery', 'Pain d Or', 'Sweet Oven', 'Morning Bread'],
  };
  const names = labels[categoryKey] ?? labels.all;
  const q = searchTerm.trim();
  const selectedNames =
    q.length > 0
      ? [`${q} Center`, `${q} Spot`, `${q} Nearby`, `${q} Guide`]
      : names;

  return selectedNames.map((name, index) => ({
    id: `fallback-${categoryKey}-${index}`,
    name,
    latitude: latitude + 0.002 * (index + 1),
    longitude: longitude + 0.002 * ((index % 2 === 0 ? 1 : -1) * (index + 1)),
    address: 'Nearby area',
  }));
}

async function fetchNearbyPoisGoogle(
  latitude: number,
  longitude: number,
  categoryKey: string,
  searchTerm: string,
  radiusMeters: number
): Promise<Poi[]> {
  const key = getApiKey();
  if (!key) {
    return [];
  }

  const type = categoryToPlaceType[categoryKey] ?? 'point_of_interest';
  const params = new URLSearchParams({
    location: `${latitude},${longitude}`,
    radius: String(radiusMeters),
    type,
    ...(searchTerm.trim() ? { keyword: searchTerm.trim() } : {}),
    key,
  });

  const res = await fetch(`${NEARBY_URL}?${params.toString()}`);
  const json = (await res.json()) as {
    results?: GooglePlaceResult[];
    status: string;
    error_message?: string;
  };

  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(json.error_message ?? json.status);
  }

  const results = json.results ?? [];
  return results.map((r) => ({
    id: r.place_id,
    name: r.name,
    latitude: r.geometry.location.lat,
    longitude: r.geometry.location.lng,
    address: r.vicinity,
  }));
}

/**
 * Lieux proches : Google Places si `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` est défini, sinon OpenStreetMap (gratuit).
 * Google : activer Places API + facturation sur Google Cloud.
 * @param radiusMeters default 2000
 */
export async function fetchNearbyPois(
  latitude: number,
  longitude: number,
  categoryKey: string,
  searchTerm = '',
  radiusMeters = 2000
): Promise<{ pois: Poi[]; source: PoiDataSource }> {
  if (getApiKey()) {
    const pois = await fetchNearbyPoisGoogle(
      latitude,
      longitude,
      categoryKey,
      searchTerm,
      radiusMeters
    );
    return { pois, source: 'google' };
  }

  let pois: Poi[] = [];
  try {
    const { fetchNearbyPoisOsm } = await import('./placesOsm');
    pois = await fetchNearbyPoisOsm(
      latitude,
      longitude,
      categoryKey,
      searchTerm,
      radiusMeters
    );
  } catch {
    // On web, Overpass can be blocked by CORS; fallback to Cloudflare Pages Function proxy.
    try {
      pois = await fetchNearbyPoisViaCloudflareProxy(
        latitude,
        longitude,
        categoryKey,
        searchTerm,
        radiusMeters
      );
    } catch {
      return {
        pois: fallbackPois(latitude, longitude, categoryKey, searchTerm),
        source: 'fallback',
      };
    }
  }
  return { pois, source: 'osm' };
}
