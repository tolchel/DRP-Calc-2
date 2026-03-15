import type { AssetGroup, SimulationInput, TapeLibrary } from './simulation'

// ── Sub-types ──────────────────────────────────────────────────────────────

export interface LibraryConfig {
  id: string                  // React key — set to 'lib-1', 'lib-2', etc. at creation time
  name: string                // Editable label shown in Step 2, e.g. "Библиотека 1"
  driveCount: number          // >= 1, default 1
  driveThroughputMBs: number  // default 300
}

export interface SanConfig {
  maxSpeedGBs: number     // default 4
  streamCount: number     // default 10
  streamSpeedMBs: number  // default 400
}

export interface AssetFormRow {
  count: number      // number of assets of this type
  avgSizeGB: number  // average size per asset in GB
}

// ── Wizard form state ──────────────────────────────────────────────────────

export interface WizardFormData {
  assets: {
    db: AssetFormRow
    server: AssetFormRow
    fs: AssetFormRow
    ws: AssetFormRow
  }
  libraries: LibraryConfig[]    // always >= 1 element
  san: SanConfig
  engineerCount: number         // default 3, minimum 1
  fastNetworkGbps: number       // Скоростная сеть, default 10
  lanGbps: number               // ЛВС, default 1
  /**
   * Stored as percentage (0-100). wizardToSimInput divides by 100 before passing to engine.
   */
  uncertaintyPct: number        // default 15 (UI shows as %; SimulationInput expects 0-1)
  trials: number                // default 10_000
}

// ── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_WIZARD_DATA: WizardFormData = {
  assets: {
    db:     { count: 0, avgSizeGB: 0 },
    server: { count: 0, avgSizeGB: 0 },
    fs:     { count: 0, avgSizeGB: 0 },
    ws:     { count: 0, avgSizeGB: 0 },
  },
  libraries: [
    { id: 'lib-1', name: 'Библиотека 1', driveCount: 1, driveThroughputMBs: 300 },
  ],
  san: {
    maxSpeedGBs: 4,
    streamCount: 10,
    streamSpeedMBs: 400,
  },
  engineerCount: 3,
  fastNetworkGbps: 10,
  lanGbps: 1,
  uncertaintyPct: 15,
  trials: 10_000,
}

// ── Mapper ─────────────────────────────────────────────────────────────────

/**
 * Converts WizardFormData (UI representation) to SimulationInput (engine representation).
 * - Empty asset rows (count=0 AND avgSizeGB=0) are filtered out.
 * - uncertaintyPct is divided by 100: 15 → 0.15.
 */
export function wizardToSimInput(form: WizardFormData): SimulationInput {
  const assetKeys = ['db', 'server', 'fs', 'ws'] as const

  const assets: AssetGroup[] = assetKeys
    .filter(key => !(form.assets[key].count === 0 && form.assets[key].avgSizeGB === 0))
    .map(key => ({
      type: key,
      count: form.assets[key].count,
      avgSizeGB: form.assets[key].avgSizeGB,
    }))

  const tapeLibraries: TapeLibrary[] = form.libraries.map(lib => ({
    driveCount: lib.driveCount,
    driveThroughputMBs: lib.driveThroughputMBs,
  }))

  return {
    assets,
    tapeLibraries,
    san: form.san,
    fastNetworkGbps: form.fastNetworkGbps,
    lanGbps: form.lanGbps,
    engineerCount: form.engineerCount,
    uncertaintyPct: form.uncertaintyPct / 100,
    trials: form.trials,
  }
}
