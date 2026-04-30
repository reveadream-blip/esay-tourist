const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/cgi/interpreter',
]

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

/** POST Overpass QL (`data=` form encoding) with mirror rotation and exponential backoff. */
export async function fetchOverpass(overpassQl: string, signal: AbortSignal): Promise<Response> {
  const body = `data=${encodeURIComponent(overpassQl)}`
  let lastError: Error | null = null

  for (const url of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          body,
          signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        })

        if (response.ok) return response

        lastError = new Error(`Overpass HTTP ${response.status} (${url})`)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
      }

      const backoff = Math.min(800 * 2 ** attempt, 5000)
      await sleep(backoff)
    }
  }

  throw lastError ?? new Error('Overpass request failed')
}
