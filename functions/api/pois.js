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

function overpassQueryForCategory(categoryKey, lat, lon, radius) {
  const r = Math.min(Math.max(Number(radius) || 2000, 200), 5000);
  const a = (filters) => `(
${filters}
);
out center 80;`;

  switch (categoryKey) {
    case 'restaurant':
      return a(`  nwr[amenity=restaurant](around:${r},${lat},${lon})`);
    case 'hotel':
      return a(`  nwr[tourism=hotel](around:${r},${lat},${lon});
  nwr[amenity=hotel](around:${r},${lat},${lon})`);
    case 'shop':
      return a(`  nwr[shop=mall](around:${r},${lat},${lon});
  nwr[shop=department_store](around:${r},${lat},${lon});
  nwr[shop=clothes](around:${r},${lat},${lon})`);
    case 'travel':
      return a(`  nwr[office=travel_agent](around:${r},${lat},${lon});
  nwr[tourism=information](around:${r},${lat},${lon})`);
    case 'grocery':
      return a(`  nwr[shop=supermarket](around:${r},${lat},${lon});
  nwr[shop=convenience](around:${r},${lat},${lon});
  nwr[shop=grocery](around:${r},${lat},${lon})`);
    case 'bakery':
      return a(`  nwr[shop=bakery](around:${r},${lat},${lon})`);
    case 'all':
    default:
      return a(`  nwr[amenity=restaurant](around:${r},${lat},${lon});
  nwr[tourism=hotel](around:${r},${lat},${lon});
  nwr[shop=supermarket](around:${r},${lat},${lon});
  nwr[shop=bakery](around:${r},${lat},${lon});
  nwr[office=travel_agent](around:${r},${lat},${lon})`);
  }
}

function toPoi(el) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;
  const t = el.tags || {};
  const name = t.name || t.brand || t['name:en'] || t['name:fr'] || t.operator;
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
  const radius = Number(url.searchParams.get('radius') || '2000');

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json({ error: 'Invalid lat/lng' }, 400);
  }

  const body = `[out:json][timeout:25];
${overpassQueryForCategory(category, lat, lng, radius)}`;

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
  const list = (data.elements || []).map(toPoi).filter(Boolean).slice(0, 50);
  return json({ pois: list, source: 'osm-proxy' });
}
