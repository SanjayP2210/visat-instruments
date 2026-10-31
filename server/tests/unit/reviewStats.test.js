// Live Customer Review statistics shown on the public website (no database needed).
import { describe, expect, it } from 'vitest'
import { reviewStats } from '../../src/services/siteService.js'

describe('reviewStats', () => {
  it('averages the star ratings, rounded to one decimal place', () => {
    expect(reviewStats([{ rating: 5 }, { rating: 4 }, { rating: 4 }])).toEqual({ average: 4.3, count: 3 })
    expect(reviewStats([{ rating: 5 }, { rating: 4 }])).toEqual({ average: 4.5, count: 2 })
    expect(reviewStats([{ rating: 3 }])).toEqual({ average: 3, count: 1 })
  })

  it('leaves out reviews without a valid 1–5 star rating from both average and count', () => {
    expect(reviewStats([{ rating: 5 }, { rating: null }, {}, { rating: 0 }, { rating: 6 }, { rating: 4.5 }, { rating: '5' }])).toEqual({ average: 5, count: 1 })
  })

  it('returns null when there are no rated reviews, so no rating is ever shown', () => {
    expect(reviewStats([])).toBeNull()
    expect(reviewStats()).toBeNull()
    expect(reviewStats([{ rating: null }])).toBeNull()
  })
})
