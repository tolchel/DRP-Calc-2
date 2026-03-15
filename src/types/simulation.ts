// All time values in SimulationResult are in HOURS — enforced at buildResult() boundary
// Never expose minutes/seconds in these types

export interface TapeLibrary {
  driveCount: number          // >= 1
  driveThroughputMBs: number  // default 300
}

export interface AssetGroup {
  type: 'db' | 'server' | 'fs' | 'ws'
  count: number
  avgSizeGB: number
}

export interface SimulationInput {
  assets: AssetGroup[]
  tapeLibraries: TapeLibrary[]
  san: {
    maxSpeedGBs: number       // default 4
    streamCount: number       // default 10
    streamSpeedMBs: number    // default 400
  }
  fastNetworkGbps: number     // Скоростная сеть, default 10
  lanGbps: number             // ЛВС, default 1
  engineerCount: number       // N, minimum 1
  uncertaintyPct: number      // 0–1 range (0.15 = 15%)
  trials: number              // 10_000–200_000
}

export interface KDEPoint {
  x: number       // recovery time in HOURS — never minutes or seconds
  density: number // probability density (unitless)
}

export interface ScenarioResult {
  kde: KDEPoint[]  // 200–300 points, x values in HOURS
  p10: number      // 10th percentile, hours
  p50: number      // median, hours
  p90: number      // 90th percentile, hours
  min: number      // best case trial, hours
  max: number      // worst case trial, hours
}

export interface SimulationResult {
  kyberbackup: ScenarioResult
  competitor: ScenarioResult
}
