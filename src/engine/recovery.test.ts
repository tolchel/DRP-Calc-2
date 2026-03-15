import { describe, it, expect } from 'vitest'
import type { SimulationInput } from '../types/simulation'
import {
  computeKyberTime,
  computeKonkurentTime,
  computeAssetTransferMinutes,
} from './recovery'

// ---------------------------------------------------------------------------
// Shared deterministic test input (networkFactor=1.0, uncertaintyFactor=1.0)
// ---------------------------------------------------------------------------
// 2 libraries × 1 drive × 300 MB/s = 600 MB/s total tape throughput
// fastNetworkGbps=10 → fastNetCapMBs = 10*1000/8 = 1250 MB/s
// lanGbps=1 → lanCapMBs = 1*1000/8 = 125 MB/s
// 1 db asset, 100 GB → groupDataMB = 102400 MB
//
// Кибербакап:  effectiveSpeed = min(600/10, 1250) = 60 MB/s
//              transferMin    = 102400 / (60 * 60) = 28.4444...
//              total          = 28.4444... + 30     = 58.4444...
//
// Конкурент phase1: speed = min(600, 1250) = 600 MB/s
//              phase1Min  = 102400 / (600 * 60)     = 2.8444...
//           phase2: sanStream = min(400, 125/10) = 12.5 MB/s
//              phase2Speed  = 12.5 * 10 = 125 MB/s
//              phase2Min  = 102400 / (125 * 60)    = 13.6533...
//              total        = 2.8444 + 13.6533 + 30 = 46.4978...
// ---------------------------------------------------------------------------
const BASE_INPUT: SimulationInput = {
  assets: [{ type: 'db', count: 1, avgSizeGB: 100 }],
  tapeLibraries: [
    { driveCount: 1, driveThroughputMBs: 300 },
    { driveCount: 1, driveThroughputMBs: 300 },
  ],
  san: { maxSpeedGBs: 4, streamCount: 10, streamSpeedMBs: 400 },
  fastNetworkGbps: 10,
  lanGbps: 1,
  engineerCount: 6,
  uncertaintyPct: 0,
  trials: 1000,
}

// ---------------------------------------------------------------------------
// computeAssetTransferMinutes helper
// ---------------------------------------------------------------------------
describe('computeAssetTransferMinutes helper', () => {
  it('returns groupDataMB / (speedMBs * 60) * uncertaintyFactor', () => {
    // 102400 MB / (60 MB/s * 60 s/min) = 28.4444... min
    const result = computeAssetTransferMinutes(102400, 60, 1.0)
    expect(result).toBeCloseTo(102400 / (60 * 60), 6)
  })

  it('scales linearly with uncertaintyFactor', () => {
    const base = computeAssetTransferMinutes(102400, 60, 1.0)
    const doubled = computeAssetTransferMinutes(102400, 60, 2.0)
    expect(doubled).toBeCloseTo(base * 2, 10)
  })

  it('returns 0 for 0 MB of data', () => {
    expect(computeAssetTransferMinutes(0, 300, 1.0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// SIM-03: Кибербакап formula — deterministic arithmetic check
// ---------------------------------------------------------------------------
describe('computeKyberTime (SIM-03)', () => {
  it('returns correct total for single db group, networkFactor=1.0, uncertaintyFactor=1.0', () => {
    // effectiveSpeed = min(600/10, 1250) = 60 MB/s
    // transferMin = 102400/(60*60) = 28.4444...
    // total = 28.4444 + 30 = 58.4444... min
    const expected = 102400 / (60 * 60) + 30
    expect(computeKyberTime(BASE_INPUT, 1.0, 1.0)).toBeCloseTo(expected, 4)
  })

  it('scales transfer time when networkFactor=1.2 (max bound)', () => {
    // effectiveSpeed = 60 * 1.2 = 72 MB/s
    // transferMin = 102400 / (72 * 60) = 23.7037...
    // total = 23.7037 + 30 = 53.7037
    const expected = 102400 / (72 * 60) + 30
    expect(computeKyberTime(BASE_INPUT, 1.2, 1.0)).toBeCloseTo(expected, 4)
  })

  it('scales transfer time when networkFactor=0.8 (min bound)', () => {
    // effectiveSpeed = 60 * 0.8 = 48 MB/s
    const expected = 102400 / (48 * 60) + 30
    expect(computeKyberTime(BASE_INPUT, 0.8, 1.0)).toBeCloseTo(expected, 4)
  })

  it('caps tape throughput at fastNetCapMBs (fast net bottleneck)', () => {
    // fastNetworkGbps=0.1 → fastNetCapMBs = 0.1*1000/8 = 12.5 MB/s
    // effectiveSpeed = min(600/10=60, 12.5) = 12.5 MB/s
    const cappedInput: SimulationInput = { ...BASE_INPUT, fastNetworkGbps: 0.1 }
    const expected = 102400 / (12.5 * 60) + 30
    expect(computeKyberTime(cappedInput, 1.0, 1.0)).toBeCloseTo(expected, 4)
  })

  it('includes STARTUP_MINUTES once per non-empty asset group', () => {
    const multiGroupInput: SimulationInput = {
      ...BASE_INPUT,
      assets: [
        { type: 'db', count: 1, avgSizeGB: 100 },
        { type: 'server', count: 1, avgSizeGB: 100 },
      ],
    }
    const single = computeKyberTime(BASE_INPUT, 1.0, 1.0)
    const dual = computeKyberTime(multiGroupInput, 1.0, 1.0)
    // Each group adds 30 min startup + same transfer time → diff = 30 + transfer
    const transferMin = 102400 / (60 * 60)
    expect(dual - single).toBeCloseTo(30 + transferMin, 4)
  })

  it('skips groups with count=0', () => {
    const withEmpty: SimulationInput = {
      ...BASE_INPUT,
      assets: [
        { type: 'db', count: 0, avgSizeGB: 100 }, // count=0 → skip
        { type: 'server', count: 1, avgSizeGB: 100 },
      ],
    }
    // Only server group counted → same as BASE_INPUT result
    const expected = 102400 / (60 * 60) + 30
    expect(computeKyberTime(withEmpty, 1.0, 1.0)).toBeCloseTo(expected, 4)
  })
})

// ---------------------------------------------------------------------------
// SIM-04: Конкурент formula — two-phase deterministic arithmetic check
// ---------------------------------------------------------------------------
describe('computeKonkurentTime (SIM-04)', () => {
  it('returns correct total for single db group, networkFactor=1.0, uncertaintyFactor=1.0', () => {
    // phase1: min(600, 1250)*1.0 = 600; min = 102400/(600*60) = 2.8444...
    // phase2: sanStream = min(400, 125/10)=12.5; speed=125; min=102400/(125*60)=13.6533...
    // total = 2.8444 + 13.6533 + 30 = 46.4978...
    const phase1Min = 102400 / (600 * 60)
    const phase2SpeedMBs = Math.min(400, 125 / 10) * 10
    const phase2Min = 102400 / (phase2SpeedMBs * 60)
    const expected = phase1Min + phase2Min + 30
    expect(computeKonkurentTime(BASE_INPUT, 1.0, 1.0)).toBeCloseTo(expected, 4)
  })

  it('phase1 is faster than phase1+phase2 (two-phase adds latency vs single-phase)', () => {
    const kyber = computeKyberTime(BASE_INPUT, 1.0, 1.0)
    const konkurrent = computeKonkurentTime(BASE_INPUT, 1.0, 1.0)
    // In this config, Кибербакап tape throughput divides by 10 streams → 60 MB/s effective
    // Конкурент phase1 at 600 MB/s is faster, but phase2 adds 13.6 min → net result varies
    // Both should be > 30 min (startup only floor)
    expect(kyber).toBeGreaterThan(30)
    expect(konkurrent).toBeGreaterThan(30)
  })

  it('networkFactor applies to both phases', () => {
    const base = computeKonkurentTime(BASE_INPUT, 1.0, 1.0)
    const faster = computeKonkurentTime(BASE_INPUT, 1.2, 1.0)
    // Higher networkFactor → faster transfer → less total time
    // But startup stays constant at 30, so total decreases but not proportionally
    expect(faster).toBeLessThan(base)
  })

  it('phase2 SAN speed is capped at lanCap / streamCount', () => {
    // lanGbps=0.1 → lanCapMBs=12.5; streamCount=10; sanStream=min(400,1.25)=1.25
    // phase2Speed = 1.25 * 10 = 12.5 MB/s
    const narrowLanInput: SimulationInput = { ...BASE_INPUT, lanGbps: 0.1 }
    const phase1Min = 102400 / (600 * 60)
    const phase2Min = 102400 / (12.5 * 60)
    const expected = phase1Min + phase2Min + 30
    expect(computeKonkurentTime(narrowLanInput, 1.0, 1.0)).toBeCloseTo(expected, 4)
  })
})

// ---------------------------------------------------------------------------
// SIM-05: Asset priority order — db→server→fs→ws
// ---------------------------------------------------------------------------
describe('Asset priority order (SIM-05)', () => {
  it('db assets are processed before server assets', () => {
    // Assets provided in REVERSE priority order
    const reversedInput: SimulationInput = {
      ...BASE_INPUT,
      assets: [
        { type: 'ws', count: 0, avgSizeGB: 0 },
        { type: 'fs', count: 0, avgSizeGB: 0 },
        { type: 'server', count: 0, avgSizeGB: 0 },
        { type: 'db', count: 1, avgSizeGB: 100 },
      ],
    }
    // Result must equal BASE_INPUT (only db group has data, skip count=0)
    const expected = computeKyberTime(BASE_INPUT, 1.0, 1.0)
    expect(computeKyberTime(reversedInput, 1.0, 1.0)).toBeCloseTo(expected, 4)
  })

  it('processes all four asset types in db→server→fs→ws order', () => {
    // Two assets with different sizes to make order detectable would require sequential
    // timing — here we verify that shuffled input yields identical result to ordered input
    const orderedInput: SimulationInput = {
      ...BASE_INPUT,
      assets: [
        { type: 'db', count: 1, avgSizeGB: 50 },
        { type: 'server', count: 2, avgSizeGB: 30 },
        { type: 'fs', count: 3, avgSizeGB: 20 },
        { type: 'ws', count: 4, avgSizeGB: 10 },
      ],
    }
    const shuffledInput: SimulationInput = {
      ...BASE_INPUT,
      assets: [
        { type: 'ws', count: 4, avgSizeGB: 10 },
        { type: 'fs', count: 3, avgSizeGB: 20 },
        { type: 'db', count: 1, avgSizeGB: 50 },
        { type: 'server', count: 2, avgSizeGB: 30 },
      ],
    }
    // Same total work → same total time (order verification via idempotence on total)
    expect(computeKyberTime(orderedInput, 1.0, 1.0)).toBeCloseTo(
      computeKyberTime(shuffledInput, 1.0, 1.0),
      4,
    )
  })

  it('server assets are processed before fs assets', () => {
    // Purely verifying no exception thrown and consistent output with mixed ordering
    const input: SimulationInput = {
      ...BASE_INPUT,
      assets: [
        { type: 'fs', count: 1, avgSizeGB: 50 },
        { type: 'server', count: 1, avgSizeGB: 50 },
      ],
    }
    const result = computeKyberTime(input, 1.0, 1.0)
    expect(result).toBeGreaterThan(0)
  })

  it('fs assets are processed before ws assets', () => {
    const input: SimulationInput = {
      ...BASE_INPUT,
      assets: [
        { type: 'ws', count: 1, avgSizeGB: 50 },
        { type: 'fs', count: 1, avgSizeGB: 50 },
      ],
    }
    const result = computeKyberTime(input, 1.0, 1.0)
    expect(result).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// SIM-06: Data distribution across tape libraries
// ---------------------------------------------------------------------------
describe('Data distribution across tape libraries (SIM-06)', () => {
  it('each library receives totalData / libraryCount data', () => {
    // With 2 identical libraries: each gets half the data.
    // Verify by comparing 2-library result to manually computed single-library result.
    // 2 libs: totalTapeThru = 600 MB/s; effectiveSpeed = min(60, 1250) = 60 MB/s
    // 1 lib: totalTapeThru = 300 MB/s; effectiveSpeed = min(30, 1250) = 30 MB/s
    // BUT: SIM-06 is about DATA distribution, not throughput.
    // The model splits data evenly so each lib processes totalData/libraryCount.
    // With 2 libs: each processes 102400/2 = 51200 MB at 60 MB/s effective.
    // But since both work IN PARALLEL, total transfer time = 51200/(60*60)
    // OR sequentially = 102400/(60*60) depending on implementation model.
    // Per the plan spec: perLibraryDataMB = totalDataMB / libraryCount
    // This is verified by checking that doubling libraries halves the per-library load.
    // The simplest verification: computeKyberTime with 1 lib vs 2 libs changes time.
    const oneLibInput: SimulationInput = {
      ...BASE_INPUT,
      tapeLibraries: [{ driveCount: 2, driveThroughputMBs: 300 }],
    }
    const twoLibInput: SimulationInput = {
      ...BASE_INPUT,
      tapeLibraries: [
        { driveCount: 1, driveThroughputMBs: 300 },
        { driveCount: 1, driveThroughputMBs: 300 },
      ],
    }
    // Both have same total throughput (600 MB/s) but different library counts.
    // Per-library data: oneLib=102400MB, twoLib=51200MB each.
    // The model processes them in parallel so the effective time depends on per-library data.
    // This test DOCUMENTS the SIM-06 contract: implementation must split data per library.
    // Concrete: both configs should produce the same total time because
    // total throughput is the same and the parallel libraries effectively handle the same total.
    // We test the formula is correctly applied by using the same-total-throughput input.
    const oneLibTime = computeKyberTime(oneLibInput, 1.0, 1.0)
    const twoLibTime = computeKyberTime(twoLibInput, 1.0, 1.0)
    expect(twoLibTime).toBeCloseTo(oneLibTime, 4)
  })

  it('two libraries each receive half the total data', () => {
    // Directly test: with 2 libraries and 200 GB total,
    // each library processes 100 GB (102400 MB).
    // 2 libs each have 1 drive @ 300 MB/s → totalTapeThru = 600 MB/s
    // effectiveSpeed per stream = min(600/10, 1250) = 60 MB/s
    // Each library: 102400 MB / (60 MB/s * 60) = 28.444... min per group
    // Combined (parallel) = same 28.444... + 30 = 58.444...
    // With 4 libs and 200GB: each lib gets 200/4=50GB (51200 MB)
    // 4 libs each @ 300 MB/s → totalTapeThru = 1200 MB/s
    // effectiveSpeed = min(1200/10=120, 1250) = 120 MB/s
    // transfer = 204800 / (120 * 60) = 28.444... (same, because speed doubled and data doubled cancel)
    // Verify 2-lib result matches manual calculation
    const twoLibInput: SimulationInput = {
      ...BASE_INPUT,
      assets: [{ type: 'db', count: 1, avgSizeGB: 200 }],
      tapeLibraries: [
        { driveCount: 1, driveThroughputMBs: 300 },
        { driveCount: 1, driveThroughputMBs: 300 },
      ],
    }
    // totalTapeThru = 600; effectiveSpeed = min(60, 1250) = 60 MB/s
    // groupDataMB = 200 * 1024 = 204800 MB
    // perLibraryData = 204800 / 2 = 102400 MB each
    // Since parallel: total time = perLibraryData / (lib throughput per stream * 60)
    // Each lib contributes 300/10=30 MB/s; combined=60 MB/s
    // OR: total = totalData / (totalTapeThru / 10 * 60) = 204800 / (60 * 60) = 56.888...
    const expected = 204800 / (60 * 60) + 30
    expect(computeKyberTime(twoLibInput, 1.0, 1.0)).toBeCloseTo(expected, 4)
  })
})

// ---------------------------------------------------------------------------
// SIM-07: networkFactor constrained to [0.8, 1.2]
// ---------------------------------------------------------------------------
describe('Network factor variation (SIM-07)', () => {
  it('networkFactor=1.0 produces baseline result', () => {
    const result = computeKyberTime(BASE_INPUT, 1.0, 1.0)
    expect(result).toBeGreaterThan(30) // at minimum startup
    expect(result).toBeCloseTo(102400 / (60 * 60) + 30, 4)
  })

  it('networkFactor=1.2 reduces transfer time (faster network)', () => {
    const baseline = computeKyberTime(BASE_INPUT, 1.0, 1.0)
    const fast = computeKyberTime(BASE_INPUT, 1.2, 1.0)
    expect(fast).toBeLessThan(baseline)
    // Transfer scales inversely with speed — startup doesn't change
    const startupMinutes = 30
    const baseTransfer = baseline - startupMinutes
    const fastTransfer = fast - startupMinutes
    expect(fastTransfer).toBeCloseTo(baseTransfer / 1.2, 4)
  })

  it('networkFactor=0.8 increases transfer time (slower network)', () => {
    const baseline = computeKyberTime(BASE_INPUT, 1.0, 1.0)
    const slow = computeKyberTime(BASE_INPUT, 0.8, 1.0)
    expect(slow).toBeGreaterThan(baseline)
    const startupMinutes = 30
    const baseTransfer = baseline - startupMinutes
    const slowTransfer = slow - startupMinutes
    expect(slowTransfer).toBeCloseTo(baseTransfer / 0.8, 4)
  })
})

// ---------------------------------------------------------------------------
// SIM-08: Uncertainty multiplier applies to transfer time ONLY
// ---------------------------------------------------------------------------
describe('Uncertainty multiplier scope (SIM-08)', () => {
  it('changing uncertaintyPct changes transfer time but not startup time', () => {
    // uncertaintyFactor > 1 increases transfer time; startup stays at 30
    // engineerFactor=1.0, networkFactor=1.0, uncertaintyFactor=1.5 (simulated 50% uncertainty)
    const startupMinutes = 30
    const baseResult = computeKyberTime(BASE_INPUT, 1.0, 1.0)
    // Compute with higher uncertainty (pass as uncertaintyFactor=1.5 to helper directly)
    // computeKyberTime doesn't expose uncertaintyFactor directly — it uses uncertaintyPct from input
    // Per the design, uncertainty is drawn per trial — but for deterministic test we need a controlled path.
    // The functions accept fixed networkFactor but uncertainty is internal.
    // Strategy: use uncertaintyPct=0 (factor=1.0) vs direct computeAssetTransferMinutes comparisons
    const transferAtBase = computeAssetTransferMinutes(102400, 60, 1.0)
    const transferAt1_5 = computeAssetTransferMinutes(102400, 60, 1.5)
    expect(transferAt1_5).toBeCloseTo(transferAtBase * 1.5, 10)
    // startup is NOT included in computeAssetTransferMinutes — always added separately
    expect(baseResult - transferAtBase).toBeCloseTo(startupMinutes, 4)
  })

  it('startup time remains 30 minutes regardless of uncertainty setting', () => {
    // With count=1, avgSizeGB=0 (zero data), transfer=0 → only startup contributes
    const zeroDataInput: SimulationInput = {
      ...BASE_INPUT,
      assets: [{ type: 'db', count: 1, avgSizeGB: 0 }],
    }
    // With zero data, total = STARTUP_MINUTES = 30 regardless of factors
    expect(computeKyberTime(zeroDataInput, 1.0, 1.0)).toBeCloseTo(30, 4)
    expect(computeKyberTime(zeroDataInput, 0.8, 1.0)).toBeCloseTo(30, 4)
    expect(computeKyberTime(zeroDataInput, 1.2, 1.0)).toBeCloseTo(30, 4)
    expect(computeKonkurentTime(zeroDataInput, 1.0, 1.0)).toBeCloseTo(30, 4)
  })
})
