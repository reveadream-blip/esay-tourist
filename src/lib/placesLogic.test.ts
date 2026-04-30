import { describe, expect, it } from 'vitest'
import { inferCategory } from './placesLogic'

describe('inferCategory', () => {
  it('classifies travel agency', () => {
    expect(inferCategory({ amenity: 'travel_agency' })).toBe('agencies')
  })

  it('classifies marketplace', () => {
    expect(inferCategory({ amenity: 'marketplace' })).toBe('markets')
  })

  it('classifies restaurant', () => {
    expect(inferCategory({ amenity: 'restaurant' })).toBe('restos')
  })
})
