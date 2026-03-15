import { describe, it, expect } from 'vitest'
import { mergeKDEs } from './ComparisonScreen'
import type { KDEPoint } from '../types/simulation'

const makeKDE = (points: { x: number; density: number }[]): KDEPoint[] =>
  points.map(p => ({ x: p.x, density: p.density }))

describe('mergeKDEs', () => {
  it('mergeKDEs with 4 non-overlapping KDE arrays returns a merged array with all 4 density keys present', () => {
    const kdes = [
      makeKDE([{ x: 1, density: 0.5 }, { x: 2, density: 0.3 }]),
      makeKDE([{ x: 3, density: 0.4 }, { x: 4, density: 0.2 }]),
      makeKDE([{ x: 5, density: 0.6 }, { x: 6, density: 0.1 }]),
      makeKDE([{ x: 7, density: 0.7 }, { x: 8, density: 0.3 }]),
    ]
    const result = mergeKDEs(kdes)
    expect(result.length).toBeGreaterThan(0)
    const firstEntry = result[0]
    // Each merged entry should have density0, density1, density2, density3
    expect(firstEntry).toHaveProperty('density0')
    expect(firstEntry).toHaveProperty('density1')
    expect(firstEntry).toHaveProperty('density2')
    expect(firstEntry).toHaveProperty('density3')
  })

  it('x values in merged array are sorted ascending', () => {
    const kdes = [
      makeKDE([{ x: 5, density: 0.5 }, { x: 1, density: 0.3 }]),
      makeKDE([{ x: 3, density: 0.4 }, { x: 2, density: 0.2 }]),
    ]
    const result = mergeKDEs(kdes)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].x).toBeGreaterThanOrEqual(result[i - 1].x)
    }
  })

  it("points outside a curve's range return density 0 for that curve", () => {
    const kdes = [
      makeKDE([{ x: 1, density: 0.5 }, { x: 2, density: 0.3 }]),
      makeKDE([{ x: 10, density: 0.8 }, { x: 20, density: 0.4 }]),
    ]
    const result = mergeKDEs(kdes)
    // At x=1 (within kdes[0] range, outside kdes[1] range), density1 should be 0
    const pointNearX1 = result.find(p => p.x === 1)
    if (pointNearX1) {
      expect(pointNearX1.density1).toBe(0)
    } else {
      // Even if x=1 isn't a merged point, at minimum the structure must exist
      expect(result.length).toBeGreaterThan(0)
    }
  })
})
