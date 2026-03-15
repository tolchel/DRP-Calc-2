// STARTUP_MINUTES: 30 minutes fixed for ALL asset types — do NOT make configurable
// Locked decision from /gsd:discuss-phase — uncertainty multiplier applies to transfer time only, not startup
export const STARTUP_MINUTES = 30

// Recovery priority order: БД → Серверы → Файловые хранилища → Рабочие станции
export const ASSET_PRIORITY = ['db', 'server', 'fs', 'ws'] as const
export type AssetType = (typeof ASSET_PRIORITY)[number]

// Concurrent verifiers per shift = floor(N / 3), where N = engineer count
// If verifiersPerShift === 0, the shift has NO verification capacity → add 480 min pause
export function verifiersPerShift(engineerCount: number): number {
  return Math.floor(engineerCount / 3)
}
