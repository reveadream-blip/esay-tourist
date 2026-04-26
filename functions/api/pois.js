const OVERPASS = 'https://overpass-api.de/api/interpreter';

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

function overpassQueryForCategory(categoryKey, lat, lon, radius, searchTerm) {
  const r = Math.min(Math.max(Number(radius) || 50000, 200), 50000);
  function escapeRegex(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function buildKeywordPattern(searchTerm) {
    const q = String(searchTerm || '').trim().toLowerCase();
    if (!q) return '';
    const synonyms = {
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
    if (candidate && String(candidate).trim()) {
      return candidate;
    }
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

  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'User-Agent': 'EasyTourist/1.0 (Cloudflare Pages Function)',
    },
    body,
  });

  if (!res.ok) {
    return json({ error: `Overpass HTTP ${res.status}` }, 502);
  }

  const data = await res.json();
  const list = (data.elements || [])
    .map((el) => toPoi(el, preferredLanguage))
    .filter(Boolean)
    .slice(0, 300);
  return json({ pois: list, source: 'osm-proxy' });
}
