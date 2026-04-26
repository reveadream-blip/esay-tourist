export type Poi = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  distanceMeters?: number;
};

export const categoryToPlaceType: Record<string, string> = {
  all: 'all',
  restaurant: 'restaurant',
  hotel: 'hotel',
  shop: 'shop',
  travel: 'travel',
  grocery: 'grocery',
  bakery: 'bakery',
};

const PHOTON_URL = 'https://photon.komoot.io/api';
const FETCH_TIMEOUT_MS = 12000;
const MAX_RADIUS_METERS = 50000;

/** Source utilisée côté UI (affichage discret). */
export type PoiDataSource = 'osm' | 'fallback';

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchProxyPois(
  latitude: number,
  longitude: number,
  categoryKey: string,
  searchTerm: string,
  preferredLanguage: string,
  radiusMeters: number
): Promise<Poi[]> {
  const requestOnce = async (radius: number): Promise<Poi[]> => {
    const params = new URLSearchParams({
      lat: String(latitude),
      lng: String(longitude),
      category: categoryKey,
      q: searchTerm,
      lang: normalizeLanguageTag(preferredLanguage),
      radius: String(radius),
    });
    const res = await fetchWithTimeout(`/api/pois?${params.toString()}`);
    if (!res.ok) {
      return [];
    }
    const json = (await res.json()) as { pois?: Poi[] };
    return json.pois ?? [];
  };

  // For "around me" tabs, query progressively to prioritize nearest places.
  if (!searchTerm.trim()) {
    const steps = [2000, 5000, 10000, 20000, radiusMeters];
    const merged: Poi[] = [];
    const seen = new Set<string>();
    for (const step of steps) {
      const chunk = await requestOnce(Math.min(step, radiusMeters));
      for (const poi of chunk) {
        const key = `${poi.latitude.toFixed(5)}_${poi.longitude.toFixed(5)}_${poi.name.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(poi);
      }
      if (merged.length >= 250) break;
    }
    return merged.slice(0, 300);
  }

  return requestOnce(radiusMeters);
}

function normalizeLanguageTag(languageTag: string): string {
  const code = languageTag.trim().toLowerCase();
  if (!code) {
    return 'en';
  }
  return code.split('-')[0] || 'en';
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

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number | string;
    osm_type?: string;
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    street?: string;
    housenumber?: string;
    osm_key?: string;
    osm_value?: string;
  };
};

function haversineMeters(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
}

function categoryKeywords(categoryKey: string): string[] {
  switch (categoryKey) {
    case 'restaurant':
      return ['restaurant', 'food'];
    case 'hotel':
      return ['hotel', 'resort'];
    case 'shop':
      return ['shopping', 'store'];
    case 'travel':
      return ['tour', 'attraction'];
    case 'grocery':
      return ['supermarket', 'grocery'];
    case 'bakery':
      return ['bakery', 'bread'];
    case 'all':
    default:
      return ['restaurant', 'hotel', 'shopping', 'attraction'];
  }
}

async function searchPhoton(
  query: string,
  latitude: number,
  longitude: number,
  lang: string,
  limit = 60
): Promise<Poi[]> {
  const params = new URLSearchParams({
    q: query,
    lat: String(latitude),
    lon: String(longitude),
    limit: String(limit),
    lang,
  });
  const res = await fetchWithTimeout(`${PHOTON_URL}?${params.toString()}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { features?: PhotonFeature[] };
  return (json.features ?? [])
    .map((f) => {
      const coords = f.geometry?.coordinates;
      const p = f.properties;
      if (!coords || coords.length < 2 || !p?.name) return null;
      const [lon, lat] = coords;
      const address = [p.street, p.housenumber, p.city || p.state, p.country]
        .filter(Boolean)
        .join(', ');
      return {
        id: `photon-${p.osm_type ?? 'x'}-${p.osm_id ?? `${lat}-${lon}`}`,
        name: p.name,
        latitude: lat,
        longitude: lon,
        address: address || undefined,
      } as Poi;
    })
    .filter((x): x is Poi => x != null);
}

function dedupePois(pois: Poi[]): Poi[] {
  const seen = new Set<string>();
  const out: Poi[] = [];
  for (const p of pois) {
    const key = `${p.latitude.toFixed(5)}_${p.longitude.toFixed(5)}_${p.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/**
 * Lieux proches via OpenStreetMap Photon (gratuit, sans clé).
 * @param radiusMeters default 50000 (50 km)
 */
export async function fetchNearbyPois(
  latitude: number,
  longitude: number,
  categoryKey: string,
  searchTerm = '',
  preferredLanguage = 'en',
  radiusMeters = 50000
): Promise<{ pois: Poi[]; source: PoiDataSource }> {
  const lang = normalizeLanguageTag(preferredLanguage);
  const safeRadius = Math.min(Math.max(radiusMeters, 200), MAX_RADIUS_METERS);
  const queries =
    searchTerm.trim().length > 0 ? [searchTerm.trim()] : categoryKeywords(categoryKey);

  try {
    const hasSearch = searchTerm.trim().length > 0;
    const [proxyPois, photonChunks] = await Promise.all([
      // For category tabs (empty search), prefer dense nearby POI search from Overpass proxy.
      fetchProxyPois(
        latitude,
        longitude,
        categoryKey,
        searchTerm.trim(),
        lang,
        safeRadius
      ),
      Promise.all(
        queries.map((q) =>
          searchPhoton(q, latitude, longitude, lang, hasSearch ? 120 : 80)
        )
      ),
    ]);

    const merged = dedupePois([...proxyPois, ...photonChunks.flat()]);
    const seen = new Set<string>();
    const filtered = merged
      .map((poi) => ({
        ...poi,
        distanceMeters: haversineMeters(latitude, longitude, poi.latitude, poi.longitude),
      }))
      .filter((poi) => poi.distanceMeters <= safeRadius)
      .filter((poi) => {
        const key = `${poi.latitude.toFixed(5)}_${poi.longitude.toFixed(5)}_${poi.name.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
      .slice(0, 300);

    if (filtered.length > 0) {
      return { pois: filtered, source: 'osm' };
    }
  } catch {
    // fallback below
  }

  return {
    pois: fallbackPois(latitude, longitude, categoryKey, searchTerm),
    source: 'fallback',
  };
}
