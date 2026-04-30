import { describe, expect, it } from 'vitest'
import {
  categoryToCommonsKeyword,
  extractWikidataId,
  extractWikipediaTag,
  isPhotoPlaceholder,
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

describe('categoryToCommonsKeyword', () => {
  it('maps known categories', () => {
    expect(categoryToCommonsKeyword('restos')).toContain('restaurant')
    expect(categoryToCommonsKeyword('hotels')).toContain('hotel')
  })
})

describe('isPhotoPlaceholder', () => {
  it('detects svg and legacy fallbacks', () => {
    expect(isPhotoPlaceholder('data:image/svg+xml;base64,xxx')).toBe(true)
    expect(isPhotoPlaceholder('https://staticmap.openstreetmap.de/staticmap.php?x=1')).toBe(true)
    expect(isPhotoPlaceholder('https://upload.wikimedia.org/foo.jpg')).toBe(false)
  })
})
