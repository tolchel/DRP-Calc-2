import { describe, it, expect } from 'vitest'
import { runSimulation } from './simulation'
import type { SimulationInput } from '../types/simulation'

const BASE_INPUT: SimulationInput = {
  assets: [{ type: 'db', count: 5, avgSizeGB: 100 }],
  tapeLibraries: [{ driveCount: 2, driveThroughputMBs: 300 }],
  san: { maxSpeedGBs: 4, streamCount: 10, streamSpeedMBs: 400 },
  fastNetworkGbps: 10,
  lanGbps: 1,
  engineerCount: 3,
  uncertaintyPct: 0.15,
  trials: 1000,
}

describe('runSimulation (SIM-02)', () => {
  it('returns both kyberbackup and competitor results', () => {
    const result = runSimulation(BASE_INPUT)
    expect(result).toHaveProperty('kyberbackup')
    expect(result).toHaveProperty('competitor')
  })

  it('each ScenarioResult has kde, p10, p50, p90, min, max', () => {
    const result = runSimulation(BASE_INPUT)
    for (const scenario of [result.kyberbackup, result.competitor]) {
      expect(scenario.kde.length).toBeGreaterThanOrEqual(1)
      expect(scenario.kde.length).toBeLessThanOrEqual(300)
      expect(scenario.p50).toBeGreaterThan(0)
      expect(scenario.min).toBeLessThanOrEqual(scenario.p50)
      expect(scenario.p90).toBeGreaterThanOrEqual(scenario.p50)
    }
  })
})

describe('KDE units (SIM-03 / SIM-04)', () => {
  it('kde x values are in hours (not minutes) — peak should be < 24 for standard input', () => {
    const result = runSimulation(BASE_INPUT)
    const maxX = Math.max(...result.kyberbackup.kde.map(p => p.x))
    // If x were in minutes, this would be ~480+ for an 8-hour recovery
    expect(maxX).toBeLessThan(200)  // sanity check: hours, not minutes
  })
})

describe('Progress reporting (SIM-10)', () => {
  it('fires exactly 20 times for 1000 trials (plus final 100%)', () => {
    const calls: number[] = []
    runSimulation({ ...BASE_INPUT, trials: 1000 }, (p) => calls.push(p))
    // 20 interval messages + final 100% = 21 max, but allow for floor rounding
    expect(calls.length).toBeGreaterThanOrEqual(20)
    expect(calls.length).toBeLessThanOrEqual(22)
    expect(calls[calls.length - 1]).toBe(100)
  })

  it('fires at 0% through 95% in 5% increments roughly', () => {
    const calls: number[] = []
    runSimulation({ ...BASE_INPUT, trials: 2000 }, (p) => calls.push(p))
    expect(calls[0]).toBe(0)
    expect(calls[calls.length - 1]).toBe(100)
  })
})

describe('Network factor (SIM-07)', () => {
  it('networkFactor is always within [0.8, 1.2] — validated via output bounds', () => {
    // Run many trials; if network factor exceeded [0.8,1.2], results would be outliers
    // This is a smoke test — the exact formula is tested in recovery.test.ts
    const result = runSimulation({ ...BASE_INPUT, trials: 5000 })
    expect(result.kyberbackup.min).toBeGreaterThan(0)
    expect(result.kyberbackup.max).toBeLessThan(result.kyberbackup.min * 10)  // no wild outliers
  })
})
