import { describe, expect, it } from 'vitest'
import { haversineMeters } from './geo'

describe('haversineMeters', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineMeters(48.8566, 2.3522, 48.8566, 2.3522)).toBeLessThan(1)
  })

  it('matches approximate Paris–Lyon distance', () => {
    const parisLat = 48.8566
    const parisLng = 2.3522
    const lyonLat = 45.764
    const lyonLng = 4.8357
    const meters = haversineMeters(parisLat, parisLng, lyonLat, lyonLng)
    expect(meters).toBeGreaterThan(380_000)
    expect(meters).toBeLessThan(430_000)
  })
})
