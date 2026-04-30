import { describe, expect, it } from 'vitest'
import { getSearchRelevanceScore } from './searchRelevance'

describe('getSearchRelevanceScore', () => {
  it('ranks exact matches highest', () => {
    expect(getSearchRelevanceScore('café', 'café')).toBeGreaterThan(getSearchRelevanceScore('caf', 'restaurant café'))
  })

  it('ranks prefix above substring', () => {
    const prefix = getSearchRelevanceScore('cafe', 'cafe de flore')
    const middle = getSearchRelevanceScore('cafe', 'le petit cafe')
    expect(prefix).toBeGreaterThan(middle)
  })
})
