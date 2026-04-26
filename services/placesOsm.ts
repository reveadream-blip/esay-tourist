import type { Poi } from './placesApi';

const OVERPASS = 'https://overpass-api.de/api/interpreter';

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** One Overpass “union” per category. Tags follow OpenStreetMap conventions. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildKeywordPattern(searchTerm: string): string {
  const q = searchTerm.trim().toLowerCase();
  if (!q) {
    return '';
  }

  const synonyms: Record<string, string> = {
    spa: 'spa|wellness|massage',
    massage: 'massage|spa|wellness',
    loueur: 'rental|car_rental|motorcycle_rental|bike_rental',
    location: 'rental|car_rental|motorcycle_rental|bike_rental',
    motobike: 'motorcycle|motorbike|scooter|bike_rental',
    moto: 'motorcycle|motorbike|scooter|bike_rental',
    voiture: 'car|car_rental|rental',
    plongée: 'diving|dive|scuba',
    plongee: 'diving|dive|scuba',
    visite: 'attraction|museum|gallery|viewpoint|tourism',
    monument: 'monument|memorial|historic|castle|fort',
    monuments: 'monument|memorial|historic|castle|fort',
  };

  return synonyms[q] ?? escapeRegex(q);
}

function overpassQueryForCategory(
  categoryKey: string,
  lat: number,
  lon: number,
  radius: number,
  searchTerm: string
) {
  const r = Math.min(Math.max(radius, 200), 5000);
  const keywordPattern = buildKeywordPattern(searchTerm);
  const a = (filters: string) =>
    `(
${filters}
);
out center 80;`;

  const keywordFilters = keywordPattern
    ? `
  nwr[name~"${keywordPattern}",i](around:${r},${lat},${lon});
  nwr[amenity~"${keywordPattern}",i](around:${r},${lat},${lon});
  nwr[shop~"${keywordPattern}",i](around:${r},${lat},${lon});
  nwr[tourism~"${keywordPattern}",i](around:${r},${lat},${lon});
  nwr[leisure~"${keywordPattern}",i](around:${r},${lat},${lon});
  nwr[historic~"${keywordPattern}",i](around:${r},${lat},${lon});`
    : '';

  switch (categoryKey) {
    case 'restaurant':
      return a(`  nwr[amenity=restaurant](around:${r},${lat},${lon});${keywordFilters}`);
    case 'hotel':
      return a(`  nwr[tourism=hotel](around:${r},${lat},${lon});
  nwr[amenity=hotel](around:${r},${lat},${lon});${keywordFilters}`);
    case 'shop':
      return a(`  nwr[shop=mall](around:${r},${lat},${lon});
  nwr[shop=department_store](around:${r},${lat},${lon});
  nwr[shop=clothes](around:${r},${lat},${lon});${keywordFilters}`);
    case 'travel':
      return a(`  nwr[office=travel_agent](around:${r},${lat},${lon});
  nwr[tourism=information](around:${r},${lat},${lon});${keywordFilters}`);
    case 'grocery':
      return a(`  nwr[shop=supermarket](around:${r},${lat},${lon});
  nwr[shop=convenience](around:${r},${lat},${lon});
  nwr[shop=grocery](around:${r},${lat},${lon});${keywordFilters}`);
    case 'bakery':
      return a(`  nwr[shop=bakery](around:${r},${lat},${lon});${keywordFilters}`);
    case 'all':
    default:
      return a(`  nwr[amenity=restaurant](around:${r},${lat},${lon});
  nwr[tourism=hotel](around:${r},${lat},${lon});
  nwr[shop=supermarket](around:${r},${lat},${lon});
  nwr[shop=bakery](around:${r},${lat},${lon});
  nwr[office=travel_agent](around:${r},${lat},${lon});${keywordFilters}`);
  }
}

function elementToPoi(el: OsmElement): Poi | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) {
    return null;
  }
  const t = el.tags ?? {};
  const name = t.name ?? t.brand ?? t['name:en'] ?? t['name:fr'] ?? t.operator;
  if (!name) {
    return null;
  }
  const addr = [t['addr:street'], t['addr:housenumber'], t['addr:city']]
    .filter(Boolean)
    .join(' ');

  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    latitude: lat,
    longitude: lon,
    address: addr || undefined,
  };
}

/**
 * Points d’intérêt via OpenStreetMap (Overpass) — pas de clé API.
 * Usage raisonnable : serveur public, éviter d’enchaîner des dizaines de requêtes.
 */
export async function fetchNearbyPoisOsm(
  latitude: number,
  longitude: number,
  categoryKey: string,
  searchTerm = '',
  radiusMeters = 2000
): Promise<Poi[]> {
  const body = `[out:json][timeout:25];
${overpassQueryForCategory(categoryKey, latitude, longitude, radiusMeters, searchTerm)}`;

  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'User-Agent': 'EasyTourist/1.0 (Expo; OSM data from public Overpass instance)',
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Overpass HTTP ${res.status}`);
  }

  const json = (await res.json()) as { elements?: OsmElement[] };
  const list = (json.elements ?? [])
    .map((el) => elementToPoi(el))
    .filter((p): p is Poi => p != null);

  const seen = new Set<string>();
  const deduped: Poi[] = [];
  for (const p of list) {
    const k = `${p.latitude.toFixed(5)}_${p.longitude.toFixed(5)}_${p.name}`;
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    deduped.push(p);
  }
  return deduped.slice(0, 50);
}
