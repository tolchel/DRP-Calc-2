import type { SimulationInput } from '../types/simulation'
import { STARTUP_MINUTES, ASSET_PRIORITY } from './constants'

// ---------------------------------------------------------------------------
// Shared arithmetic helpers
// ---------------------------------------------------------------------------

/**
 * Compute transfer-only time in minutes for one asset group.
 * STARTUP_MINUTES is NOT included — callers add it separately.
 *
 * uncertaintyFactor is a pre-drawn stochastic value (e.g. 1 + Uniform(0, uncertaintyPct)).
 * Applies to transfer time ONLY — never to STARTUP_MINUTES (SIM-08).
 */
export function computeAssetTransferMinutes(
  groupDataMB: number,
  effectiveSpeedMBs: number,
  uncertaintyFactor: number,
): number {
  if (groupDataMB === 0 || effectiveSpeedMBs === 0) return 0
  return (groupDataMB / (effectiveSpeedMBs * 60)) * uncertaintyFactor
}

// ---------------------------------------------------------------------------
// Internal: convert Gbps to MB/s
// ---------------------------------------------------------------------------
function gbpsToMBs(gbps: number): number {
  return (gbps * 1000) / 8
}

// ---------------------------------------------------------------------------
// Internal: compute total tape throughput across all libraries
// ---------------------------------------------------------------------------
function totalTapeThruMBs(input: SimulationInput): number {
  return input.tapeLibraries.reduce(
    (sum, lib) => sum + lib.driveCount * lib.driveThroughputMBs,
    0,
  )
}

// ---------------------------------------------------------------------------
// Internal: collect asset groups in ASSET_PRIORITY order, skipping count=0
// ---------------------------------------------------------------------------
interface AssetGroupResolved {
  groupDataMB: number
}

function orderedAssetGroups(input: SimulationInput): AssetGroupResolved[] {
  return ASSET_PRIORITY.flatMap((assetType) => {
    const group = input.assets.find((a) => a.type === assetType)
    if (!group || group.count === 0) return []
    const groupDataMB = group.count * group.avgSizeGB * 1024
    return [{ groupDataMB }]
  })
}

// ---------------------------------------------------------------------------
// SIM-03: Кибербакап — tape → objects (direct path, 10 streams)
// ---------------------------------------------------------------------------

/**
 * Compute recovery time in MINUTES for the Кибербакап scenario.
 *
 * Transfer path: tape → objects (direct).
 * Speed = min(totalTapeThruMBs / 10, fastNetCapMBs) × networkFactor × uncertaintyFactor.
 *
 * networkFactor:  pre-drawn stochastic, expected range [0.8, 1.2] (SIM-07)
 * engineerFactor: pre-drawn stochastic [0.5, 1.0]; when verifiersPerShift === 0 the
 *                 caller adds the 480-min pause — this function does not model it
 *                 (the pause depends on the outer simulation loop context).
 *
 * Returns total minutes including STARTUP_MINUTES per non-empty asset group.
 */
export function computeKyberTime(
  input: SimulationInput,
  networkFactor: number, // pre-drawn stochastic: [0.8, 1.2]
  engineerFactor: number, // pre-drawn stochastic: [0.5, 1.0] — reserved for outer loop
): number {
  // Suppress unused-var warning: engineerFactor is passed from the outer simulation loop
  // and will be used in Plan 04 when the full simulation runner integrates pause logic.
  void engineerFactor

  const tapeThru = totalTapeThruMBs(input)
  const fastNetCap = gbpsToMBs(input.fastNetworkGbps)

  // Кибербакап: tape stream divided across 10 parallel streams to object storage
  const baseSpeedMBs = Math.min(tapeThru / 10, fastNetCap)

  const groups = orderedAssetGroups(input)
  if (groups.length === 0) return 0

  let total = 0
  for (const { groupDataMB } of groups) {
    // uncertaintyFactor: stochastic draw injected by the simulation runner in Plan 04.
    // For this deterministic function, pass 1.0 — uncertainty is applied at the runner layer.
    const effectiveSpeedMBs = baseSpeedMBs * networkFactor
    const transferMin = computeAssetTransferMinutes(groupDataMB, effectiveSpeedMBs, 1.0)
    total += transferMin + STARTUP_MINUTES
  }

  return total
}

// ---------------------------------------------------------------------------
// SIM-04: Конкурент — tape → SAN → objects (two-phase path)
// ---------------------------------------------------------------------------

/**
 * Compute recovery time in MINUTES for the Конкурент scenario.
 *
 * Transfer path: two sequential phases per asset group.
 *
 * Phase 1 — tape → SAN:
 *   speed = min(totalTapeThruMBs, fastNetCapMBs) × networkFactor × uncertaintyFactor
 *
 * Phase 2 — SAN → objects (10 streams, capped at LAN):
 *   sanStreamSpeedMBs = min(san.streamSpeedMBs, lanCapMBs / san.streamCount)
 *   phase2SpeedMBs    = sanStreamSpeedMBs × san.streamCount × networkFactor
 *   (uncertaintyFactor applied in phase1 only — it models tape read variance)
 *
 * Returns total minutes including STARTUP_MINUTES per non-empty asset group.
 */
export function computeKonkurentTime(
  input: SimulationInput,
  networkFactor: number,
  engineerFactor: number,
): number {
  void engineerFactor

  const tapeThru = totalTapeThruMBs(input)
  const fastNetCap = gbpsToMBs(input.fastNetworkGbps)
  const lanCap = gbpsToMBs(input.lanGbps)

  // Phase 1: full tape throughput (not divided by 10) capped at fast network
  const phase1BaseSpeedMBs = Math.min(tapeThru, fastNetCap)

  // Phase 2: SAN stream speed capped at LAN bandwidth per stream
  const sanStreamSpeedMBs = Math.min(
    input.san.streamSpeedMBs,
    lanCap / input.san.streamCount,
  )
  const phase2BaseSpeedMBs = sanStreamSpeedMBs * input.san.streamCount

  const groups = orderedAssetGroups(input)
  if (groups.length === 0) return 0

  let total = 0
  for (const { groupDataMB } of groups) {
    // uncertaintyFactor: stochastic draw injected by the simulation runner in Plan 04.
    const phase1SpeedMBs = phase1BaseSpeedMBs * networkFactor
    const phase2SpeedMBs = phase2BaseSpeedMBs * networkFactor

    const phase1Min = computeAssetTransferMinutes(groupDataMB, phase1SpeedMBs, 1.0)
    const phase2Min = computeAssetTransferMinutes(groupDataMB, phase2SpeedMBs, 1.0)

    total += phase1Min + phase2Min + STARTUP_MINUTES
  }

  return total
}
