/** Higher score = better match. Used when user types a search query. */
export function getSearchRelevanceScore(query: string, placeName: string): number {
  const q = query.trim().toLowerCase()
  const n = placeName.toLowerCase()
  if (!q) return 0
  if (n === q) return 1000
  if (n.startsWith(q)) return 850

  const idx = n.indexOf(q)
  if (idx === -1) return 0

  const charBefore = idx > 0 ? n[idx - 1] : ''
  const wordStartBonus = /[\s\-'(/,.]/.test(charBefore) ? 120 : 0

  return 500 + wordStartBonus - Math.min(idx, 200)
}
