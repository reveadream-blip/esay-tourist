const OVERPASS = 'https://overpass-api.de/api/interpreter';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const UPSTREAM_TIMEOUT_MS = 12000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = UPSTREAM_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function overpassQueryForCategory(categoryKey, lat, lon, radius, searchTerm) {
  const r = Math.min(Math.max(Number(radius) || 50000, 200), 50000);
  function escapeRegex(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function buildKeywordPattern(qValue) {
    const q = String(qValue || '').trim().toLowerCase();
    if (!q) return '';
    const synonyms = {
      spa: 'spa|wellness|massage',
      massage: 'massage|spa|wellness',
      loueur: 'rental|car_rental|motorcycle_rental|bike_rental',
      location: 'rental|car_rental|motorcycle_rental|bike_rental',
      motobike: 'motorcycle|motorbike|scooter|bike_rental',
      moto: 'motorcycle|motorbike|scooter|bike_rental',
      voiture: 'car|car_rental|rental',
      plongee: 'diving|dive|scuba',
      visite: 'attraction|museum|gallery|viewpoint|tourism',
      monument: 'monument|memorial|historic|castle|fort',
      monuments: 'monument|memorial|historic|castle|fort',
    };
    return synonyms[q] || escapeRegex(q);
  }
  const keywordPattern = buildKeywordPattern(searchTerm);
  const a = (filters) => `(
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

function normalizeLanguageTag(languageTag) {
  const value = String(languageTag || '').trim().toLowerCase();
  if (!value) return 'en';
  return value.split('-')[0] || 'en';
}

function pickLocalizedName(tags, preferredLanguage) {
  const lang = normalizeLanguageTag(preferredLanguage);
  const direct = tags[`name:${lang}`];
  const chain = [direct, tags['name:en'], tags.int_name, tags.official_name, tags.name, tags.brand, tags.operator];
  for (const candidate of chain) {
    if (candidate && String(candidate).trim()) return candidate;
  }
  return null;
}

function toPoi(el, preferredLanguage) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;
  const t = el.tags || {};
  const name = pickLocalizedName(t, preferredLanguage);
  if (!name) return null;
  const addr = [t['addr:street'], t['addr:housenumber'], t['addr:city']].filter(Boolean).join(' ');
  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    latitude: lat,
    longitude: lon,
    address: addr || undefined,
  };
}

function toPoiFromNominatim(item) {
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const name = item.name || (item.display_name ? String(item.display_name).split(',')[0] : null);
  if (!name) return null;
  return {
    id: `nominatim-${item.osm_type || 'x'}-${item.osm_id || Math.random().toString(36).slice(2)}`,
    name,
    latitude: lat,
    longitude: lon,
    address: item.display_name || undefined,
  };
}

async function fetchNominatimFallback(lat, lng, radius, query, preferredLanguage) {
  const q = String(query || '').trim();
  if (!q) return [];
  const r = Math.min(Math.max(Number(radius) || 50000, 500), 50000);
  const latDelta = r / 111000;
  const lonDelta = r / (111000 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));
  const left = lng - lonDelta;
  const right = lng + lonDelta;
  const top = lat + latDelta;
  const bottom = lat - latDelta;
  const params = new URLSearchParams({
    format: 'jsonv2',
    q,
    bounded: '1',
    limit: '50',
    viewbox: `${left},${top},${right},${bottom}`,
    'accept-language': preferredLanguage || 'en',
  });

  try {
    const res = await fetchWithTimeout(`${NOMINATIM}?${params.toString()}`, {
      headers: { 'User-Agent': 'EasyTourist/1.0 (Cloudflare Pages Function)' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map(toPoiFromNominatim).filter(Boolean);
  } catch {
    return [];
  }
}

function dedupePois(list) {
  const seen = new Set();
  const out = [];
  for (const p of list) {
    const key = `${Number(p.latitude).toFixed(5)}_${Number(p.longitude).toFixed(5)}_${String(p.name || '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  const category = url.searchParams.get('category') || 'all';
  const query = url.searchParams.get('q') || '';
  const preferredLanguage = url.searchParams.get('lang') || 'en';
  const radius = Number(url.searchParams.get('radius') || '50000');

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json({ error: 'Invalid lat/lng' }, 400);
  }

  const body = `[out:json][timeout:25];
${overpassQueryForCategory(category, lat, lng, radius, query)}`;

  let list = [];
  try {
    const res = await fetchWithTimeout(OVERPASS, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'User-Agent': 'EasyTourist/1.0 (Cloudflare Pages Function)',
      },
      body,
    });
    if (res.ok) {
      const data = await res.json();
      list = (data.elements || [])
        .map((el) => toPoi(el, preferredLanguage))
        .filter(Boolean)
        .slice(0, 250);
    }
  } catch {
    // Ignore and continue with Nominatim fallback.
  }

  if (query.trim()) {
    const nameMatches = await fetchNominatimFallback(lat, lng, radius, query, preferredLanguage);
    list = dedupePois([...nameMatches, ...list]).slice(0, 300);
  }
  return json({ pois: list, source: 'osm-proxy' });
}
