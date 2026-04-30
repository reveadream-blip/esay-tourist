const toWikimediaFileUrl = (commonsFileName: string) => {
  const normalized = commonsFileName.startsWith('File:') ? commonsFileName.slice(5) : commonsFileName
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(normalized)}`
}

export function getPlacePhotoUrl(tags: Record<string, string>, lat: number, lng: number): string {
  const directImage = tags.image ?? tags['image:0']
  if (directImage && /^https?:\/\//i.test(directImage)) {
    return directImage
  }

  const wikimediaCommons = tags.wikimedia_commons
  if (wikimediaCommons) {
    return toWikimediaFileUrl(wikimediaCommons)
  }

  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=1200x800&markers=${lat},${lng},red-pushpin`
}

export async function getWikipediaThumbnail(wikipediaTag: string): Promise<string | null> {
  const separatorIndex = wikipediaTag.indexOf(':')
  if (separatorIndex <= 0) return null

  const lang = wikipediaTag.slice(0, separatorIndex)
  const title = wikipediaTag.slice(separatorIndex + 1).replace(/ /g, '_')
  const endpoint = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`

  const response = await fetch(endpoint)
  if (!response.ok) return null

  const data = (await response.json()) as { thumbnail?: { source?: string } }
  return data.thumbnail?.source ?? null
}
