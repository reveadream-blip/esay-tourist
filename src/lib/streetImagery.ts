/** Mapillary (jeton gratuit dashboard) + KartaView (endpoints publics) + Pexels (clé API gratuite). */

function bboxMapillary(lat: number, lng: number, halfSpanMeters = 90): string {
  const dLat = halfSpanMeters / 111_320
  const dLng = halfSpanMeters / (111_320 * Math.cos((lat * Math.PI) / 180))
  const minLon = lng - dLng
  const minLat = lat - dLat
  const maxLon = lng + dLng
  const maxLat = lat + dLat
  return `${minLon},${minLat},${maxLon},${maxLat}`
}

function kartaviewCorners(lat: number, lng: number, delta = 0.004): { tLeft: string; bRight: string } {
  return {
    tLeft: `${lat + delta},${lng - delta}`,
    bRight: `${lat - delta},${lng + delta}`,
  }
}

function pickKartaViewImageUrl(data: unknown): string | null {
  const rows = Array.isArray(data) ? data : data != null ? [data] : []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const raw =
      o.fileurlTh ?? o.fileurl ?? o.fileUrlTh ?? o.thumbnailUrl ?? o.thumbnail
    if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) {
      return raw.startsWith('http://') ? `https://${raw.slice(7)}` : raw
    }
  }
  return null
}

/**
 * Mapillary — compte gratuit : https://www.mapillary.com/dashboard/developers → Register application → Client token (format MLY|…).
 * Quotas généreux pour usage cartographique ; la clé est exposée dans le bundle (comme Unsplash).
 */
export async function getMapillaryThumbnailUrl(
  lat: number,
  lng: number,
  accessToken: string | undefined,
): Promise<string | null> {
  const token = accessToken?.trim()
  if (!token) return null

  const bbox = bboxMapillary(lat, lng, 100)
  const params = new URLSearchParams({
    fields: 'id,thumb_1024_url',
    bbox,
    limit: '5',
  })

  try {
    const res = await fetch(`https://graph.mapillary.com/images?${params}`, {
      headers: { Authorization: `OAuth ${token}` },
    })
    if (!res.ok) return null

    const json = (await res.json()) as { data?: Array<{ thumb_1024_url?: string }> }
    for (const row of json.data ?? []) {
      const u = row.thumb_1024_url
      if (u && /^https?:\/\//i.test(u)) return u
    }
  } catch {
    return null
  }
  return null
}

type KvStatus = { apiCode?: number }

/**
 * KartaView (ex OpenStreetCam) — pas de clé pour la lecture publique documentée.
 * Utilise l’API 2.0 : https://kartaview.org/doc/authentication
 */
export async function getKartaViewPhotoUrl(lat: number, lng: number): Promise<string | null> {
  try {
    const direct = await fetch(
      `https://api.openstreetcam.org/2.0/photo/?lat=${lat}&lng=${lng}&zoomLevel=18`,
    )
    const dj = (await direct.json()) as { status?: KvStatus; result?: { data?: unknown } }
    if (dj.status?.apiCode === 600 && dj.result?.data) {
      const u = pickKartaViewImageUrl(dj.result.data)
      if (u) return u
    }

    const { tLeft, bRight } = kartaviewCorners(lat, lng)
    const seqRes = await fetch(
      `https://api.openstreetcam.org/2.0/sequence/?tLeft=${encodeURIComponent(tLeft)}&bRight=${encodeURIComponent(bRight)}`,
    )
    const sj = (await seqRes.json()) as {
      status?: KvStatus
      result?: { data?: Array<Record<string, unknown>> }
    }
    if (sj.status?.apiCode !== 600 || !sj.result?.data?.length) return null

    const first = sj.result.data[0]
    const seqId = first.id ?? first.sequenceId ?? first.sequence_id
    if (seqId === undefined || seqId === null) return null

    const ph = await fetch(
      `https://api.openstreetcam.org/2.0/photo/?sequenceId=${encodeURIComponent(String(seqId))}&sequenceIndex=0`,
    )
    const pj = (await ph.json()) as { status?: KvStatus; result?: { data?: unknown } }
    if (pj.status?.apiCode !== 600 || pj.result?.data == null) return null
    return pickKartaViewImageUrl(pj.result.data)
  } catch {
    return null
  }
}

/**
 * Pexels — clé gratuite : https://www.pexels.com/api/ (inscription → Authorization dans les en-têtes).
 */
export async function getPexelsCategoryPhoto(query: string): Promise<string | null> {
  const key = import.meta.env.VITE_PEXELS_ACCESS_KEY
  if (!key || typeof key !== 'string') return null

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`
    const res = await fetch(url, { headers: { Authorization: key.trim() } })
    if (!res.ok) return null

    const data = (await res.json()) as {
      photos?: Array<{ src?: { large2x?: string; large?: string; medium?: string } }>
    }
    const src = data.photos?.[0]?.src
    return src?.large2x ?? src?.large ?? src?.medium ?? null
  } catch {
    return null
  }
}
