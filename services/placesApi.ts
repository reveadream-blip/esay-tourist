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
export type PoiDataSource = 'google' | 'osm';

async function fetchNearbyPoisViaCloudflareProxy(
  latitude: number,
  longitude: number,
  categoryKey: string,
  radiusMeters: number
): Promise<Poi[]> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    category: categoryKey,
    radius: String(radiusMeters),
  });
  const res = await fetch(`/api/pois?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Proxy HTTP ${res.status}`);
  }
  const json = (await res.json()) as { pois?: Poi[] };
  return json.pois ?? [];
}

async function fetchNearbyPoisGoogle(
  latitude: number,
  longitude: number,
  categoryKey: string,
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
  radiusMeters = 2000
): Promise<{ pois: Poi[]; source: PoiDataSource }> {
  if (getApiKey()) {
    const pois = await fetchNearbyPoisGoogle(
      latitude,
      longitude,
      categoryKey,
      radiusMeters
    );
    return { pois, source: 'google' };
  }

  let pois: Poi[] = [];
  try {
    const { fetchNearbyPoisOsm } = await import('./placesOsm');
    pois = await fetchNearbyPoisOsm(latitude, longitude, categoryKey, radiusMeters);
  } catch {
    // On web, Overpass can be blocked by CORS; fallback to Cloudflare Pages Function proxy.
    pois = await fetchNearbyPoisViaCloudflareProxy(
      latitude,
      longitude,
      categoryKey,
      radiusMeters
    );
  }
  return { pois, source: 'osm' };
}
