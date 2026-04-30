import { describe, expect, it } from 'vitest'
import {
  categoryToCommonsKeyword,
  extractWikidataId,
  extractWikipediaTag,
  getNoPhotoDataUrl,
  getPendingPhotoDataUrl,
  hasResolvedPlacePhoto,
  isPhotoPlaceholder,
  sanitizePlaceNameForImageSearch,
} from './placePhoto'

describe('extractWikidataId', () => {
  it('returns first Q-id', () => {
    expect(extractWikidataId({ wikidata: 'Q42' })).toBe('Q42')
    expect(extractWikidataId({ wikidata: 'q12345' })).toBe('Q12345')
  })

  it('parses from compound values', () => {
    expect(extractWikidataId({ wikidata: 'Q1;Q2' })).toBe('Q1')
  })

  it('reads brand:wikidata', () => {
    expect(extractWikidataId({ 'brand:wikidata': 'Q2088861' })).toBe('Q2088861')
  })

  it('returns undefined when absent', () => {
    expect(extractWikidataId({})).toBeUndefined()
  })
})

describe('extractWikipediaTag', () => {
  it('uses wikipedia first', () => {
    expect(extractWikipediaTag({ wikipedia: 'fr:Tour Eiffel' })).toBe('fr:Tour Eiffel')
  })

  it('falls back to wikipedia:lang', () => {
    expect(
      extractWikipediaTag({ 'wikipedia:en': 'en:Notre-Dame de Paris', name: 'x' }),
    ).toBe('en:Notre-Dame de Paris')
  })
})

describe('sanitizePlaceNameForImageSearch', () => {
  it('keeps letters with accents and strips noisy ascii', () => {
    expect(sanitizePlaceNameForImageSearch('Café  L’été')).toMatch(/Café.*été/)
    expect(sanitizePlaceNameForImageSearch('foo@bar')).toBe('foo bar')
  })
})

describe('categoryToCommonsKeyword', () => {
  it('maps known categories', () => {
    expect(categoryToCommonsKeyword('restos')).toContain('restaurant')
    expect(categoryToCommonsKeyword('hotels')).toContain('hotel')
  })
})

describe('hasResolvedPlacePhoto', () => {
  it('accepts remote images and rejects pending / nophoto', () => {
    expect(hasResolvedPlacePhoto('https://upload.wikimedia.org/foo.jpg')).toBe(true)
    expect(hasResolvedPlacePhoto(getPendingPhotoDataUrl())).toBe(false)
    expect(hasResolvedPlacePhoto(getNoPhotoDataUrl())).toBe(false)
    expect(hasResolvedPlacePhoto('https://tile.openstreetmap.org/16/1/2.png')).toBe(false)
  })
})

describe('isPhotoPlaceholder', () => {
  it('treats pending and legacy map URLs as needing enrichment, not nophoto', () => {
    expect(isPhotoPlaceholder(getPendingPhotoDataUrl())).toBe(true)
    expect(isPhotoPlaceholder(getNoPhotoDataUrl())).toBe(false)
    expect(isPhotoPlaceholder('https://staticmap.openstreetmap.de/staticmap.php?x=1')).toBe(true)
    expect(isPhotoPlaceholder('https://tile.openstreetmap.org/16/1/2.png')).toBe(true)
    expect(isPhotoPlaceholder('https://upload.wikimedia.org/foo.jpg')).toBe(false)
  })
})
