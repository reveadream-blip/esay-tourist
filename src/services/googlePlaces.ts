export const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined

type GooglePlacePhoto = {
  name: string
}

type GoogleTextSearchPlace = {
  photos?: GooglePlacePhoto[]
}

type GoogleTextSearchResponse = {
  places?: GoogleTextSearchPlace[]
}

const SEARCH_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'

export const hasGooglePlacesKey = Boolean(GOOGLE_PLACES_API_KEY)

const buildPhotoMediaUrl = (photoName: string) =>
  `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=1200&key=${GOOGLE_PLACES_API_KEY}`

export async function getGooglePlacePhotoUrl(
  placeName: string,
  lat: number,
  lng: number,
): Promise<string | null> {
  if (!GOOGLE_PLACES_API_KEY) return null

  const response = await fetch(SEARCH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.photos',
    },
    body: JSON.stringify({
      textQuery: placeName,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 2000,
        },
      },
      pageSize: 1,
      languageCode: 'fr',
    }),
  })

  if (!response.ok) return null

  const data = (await response.json()) as GoogleTextSearchResponse
  const photoName = data.places?.[0]?.photos?.[0]?.name
  if (!photoName) return null

  return buildPhotoMediaUrl(photoName)
}
