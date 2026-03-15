import { describe, it, expect } from 'vitest'
import { computeKDE } from './kde'

// Helper: generate normally-distributed samples using Box-Muller
function generateNormal(n: number, mean: number, std: number): number[] {
  const samples: number[] = []
  for (let i = 0; i < n; i += 2) {
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
    samples.push(mean + std * z0)
    if (i + 1 < n) samples.push(mean + std * z1)
  }
  return samples.slice(0, n)
}

// Helper: generate uniform samples
function generateUniform(n: number, lo: number, hi: number): number[] {
  const samples: number[] = []
  for (let i = 0; i < n; i++) {
    samples.push(lo + Math.random() * (hi - lo))
  }
  return samples
}

describe('computeKDE', () => {
  describe('output contract', () => {
    it('returns an array for a normal distribution of 1000 samples', () => {
      const samples = generateNormal(1000, 10, 2)
      const result = computeKDE(samples, 250)
      expect(Array.isArray(result)).toBe(true)
    })

    it('output has exactly maxPoints entries when maxPoints <= 300', () => {
      const samples = generateNormal(1000, 10, 2)
      const result = computeKDE(samples, 250)
      expect(result.length).toBe(250)
    })

    it('output is capped at 300 even if maxPoints argument exceeds 300', () => {
      const samples = generateNormal(1000, 10, 2)
      const result = computeKDE(samples, 500)
      expect(result.length).toBeLessThanOrEqual(300)
    })

    it('output has <= 300 points for any valid call', () => {
      const samples = generateNormal(200, 5, 1)
      const result = computeKDE(samples)  // default maxPoints
      expect(result.length).toBeLessThanOrEqual(300)
    })
  })

  describe('x values', () => {
    it('x values are within [min(samples), max(samples)]', () => {
      const samples = generateNormal(1000, 20, 5)
      const minS = Math.min(...samples)
      const maxS = Math.max(...samples)
      const result = computeKDE(samples, 200)
      for (const pt of result) {
        expect(pt.x).toBeGreaterThanOrEqual(minS - 1e-9)
        expect(pt.x).toBeLessThanOrEqual(maxS + 1e-9)
      }
    })

    it('x values are equidistant (uniform spacing)', () => {
      const samples = generateNormal(500, 10, 3)
      const result = computeKDE(samples, 100)
      const dx0 = result[1].x - result[0].x
      for (let i = 2; i < result.length; i++) {
        const dx = result[i].x - result[i - 1].x
        expect(dx).toBeCloseTo(dx0, 6)
      }
    })

    it('first x equals min(samples)', () => {
      const samples = generateNormal(500, 10, 2)
      const minS = Math.min(...samples)
      const result = computeKDE(samples, 150)
      expect(result[0].x).toBeCloseTo(minS, 6)
    })

    it('last x equals max(samples)', () => {
      const samples = generateNormal(500, 10, 2)
      const maxS = Math.max(...samples)
      const result = computeKDE(samples, 150)
      expect(result[result.length - 1].x).toBeCloseTo(maxS, 6)
    })
  })

  describe('density values', () => {
    it('all density values are non-negative', () => {
      const samples = generateNormal(1000, 15, 4)
      const result = computeKDE(samples, 250)
      for (const pt of result) {
        expect(pt.density).toBeGreaterThanOrEqual(0)
      }
    })

    it('density integral approximates 1.0 within 5% tolerance', () => {
      const samples = generateNormal(2000, 10, 2)
      const result = computeKDE(samples, 250)
      let integral = 0
      for (let i = 0; i < result.length - 1; i++) {
        const dx = result[i + 1].x - result[i].x
        integral += result[i].density * dx
      }
      expect(integral).toBeGreaterThan(0.95)
      expect(integral).toBeLessThan(1.05)
    })

    it('uniform distribution produces approximately flat density', () => {
      // For a uniform distribution, density should be roughly 1/(hi-lo) everywhere
      const lo = 0
      const hi = 10
      const samples = generateUniform(2000, lo, hi)
      const result = computeKDE(samples, 200)
      // Exclude edge points (KDE boundary effects), check middle 60%
      const mid = result.slice(Math.floor(result.length * 0.2), Math.floor(result.length * 0.8))
      const densities = mid.map(pt => pt.density)
      const mean = densities.reduce((a, b) => a + b, 0) / densities.length
      const variance = densities.reduce((a, b) => a + (b - mean) ** 2, 0) / densities.length
      const cv = Math.sqrt(variance) / mean  // coefficient of variation
      // CV < 0.2 means reasonably flat (within 20% relative variation)
      expect(cv).toBeLessThan(0.2)
    })
  })

  describe('edge cases', () => {
    it('single sample returns a valid KDEPoint array without throwing', () => {
      const result = computeKDE([42])
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0].x).toBe(42)
      expect(result[0].density).toBeGreaterThanOrEqual(0)
    })

    it('two identical samples does not throw or produce NaN density', () => {
      const result = computeKDE([5, 5])
      expect(Array.isArray(result)).toBe(true)
      for (const pt of result) {
        expect(isNaN(pt.density)).toBe(false)
        expect(isFinite(pt.density)).toBe(true)
      }
    })

    it('all identical samples does not throw and returns valid densities', () => {
      const samples = Array(100).fill(7)
      const result = computeKDE(samples, 10)
      expect(Array.isArray(result)).toBe(true)
      for (const pt of result) {
        expect(isNaN(pt.density)).toBe(false)
      }
    })

    it('handles large input of 200,000 samples without throwing', () => {
      const samples = generateNormal(200_000, 100, 20)
      expect(() => computeKDE(samples, 250)).not.toThrow()
    })
  })

  describe('bandwidth', () => {
    it('computed bandwidth is positive for any valid (non-degenerate) input', () => {
      // We test this indirectly: if bandwidth <= 0, density would be all-zero or NaN
      const samples = generateNormal(100, 5, 2)
      const result = computeKDE(samples, 50)
      const hasPositiveDensity = result.some(pt => pt.density > 0)
      expect(hasPositiveDensity).toBe(true)
    })
  })
})
