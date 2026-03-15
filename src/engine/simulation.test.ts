import { describe, it } from 'vitest'

// TODO: import { runSimulation } from './simulation' — uncomment after Plan 03+05 implement this
// import type { SimulationInput } from '../types/simulation'

const _STUB_INPUT = {
  assets: [{ type: 'db' as const, count: 10, avgSizeGB: 100 }],
  tapeLibraries: [{ driveCount: 2, driveThroughputMBs: 300 }],
  san: { maxSpeedGBs: 4, streamCount: 10, streamSpeedMBs: 400 },
  fastNetworkGbps: 10,
  lanGbps: 1,
  engineerCount: 3,
  uncertaintyPct: 0.15,
  trials: 1000,
}

describe('runSimulation (SIM-02)', () => {
  it.todo('returns both kyberbackup and competitor ScenarioResult fields')
})

describe('Кибербакап vs Конкурент (SIM-03 vs SIM-04)', () => {
  it.todo('kyberbackup median <= competitor median for standard tape+SAN setup')
})

describe('Network variation (SIM-07)', () => {
  it.todo('network factor stays within [0.8, 1.2] across all trials')
})

describe('Progress reporting (SIM-10)', () => {
  it.todo('progress callback fires exactly 20 times for any trial count (trials / 5%)')
})
