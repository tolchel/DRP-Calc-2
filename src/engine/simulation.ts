import type { SimulationInput, SimulationResult, ScenarioResult } from '../types/simulation'
import { computeKyberTime, computeKonkurentTime, computeKyberBreakdown, computeKonkurentBreakdown } from './recovery'
import { computeKDE } from './kde'

const KDE_POINTS = 250  // within 200–300 contract

export function runSimulation(
  input: SimulationInput,
  onProgress?: (percent: number) => void,
): SimulationResult {
  const kyberTimes: number[] = []  // minutes during accumulation
  const konkurentTimes: number[] = []

  const progressInterval = Math.max(1, Math.floor(input.trials / 20))

  for (let i = 0; i < input.trials; i++) {
    // Shared random draws per trial (locked decision: same draws for fair comparison)
    const networkFactor = 1 + (Math.random() - 0.5) * 0.4  // Uniform(-0.2, 0.2) → [0.8, 1.2]
    const engineerFactor = 0.5 + Math.random() * 0.5        // Uniform(0.5, 1.0)

    kyberTimes.push(computeKyberTime(input, networkFactor, engineerFactor))
    konkurentTimes.push(computeKonkurentTime(input, networkFactor, engineerFactor))

    // Progress: fire every 5% (exactly 20 messages for full run)
    if (onProgress && i % progressInterval === 0) {
      onProgress(Math.round((i / input.trials) * 100))
    }
  }

  // Fire final 100% progress if not already fired
  if (onProgress) onProgress(100)

  return {
    kyberbackup: buildScenarioResult(kyberTimes),
    competitor: buildScenarioResult(konkurentTimes),
    kyberbreakdown: computeKyberBreakdown(input),
    competitorbreakdown: computeKonkurentBreakdown(input),
  }
}

function buildScenarioResult(minuteTrials: number[]): ScenarioResult {
  // UNIT CONVERSION: minutes → hours at this boundary
  const hourTrials = minuteTrials.map(m => m / 60)
  const sorted = [...hourTrials].sort((a, b) => a - b)
  const n = sorted.length

  return {
    kde: computeKDE(hourTrials, KDE_POINTS),
    p10: sorted[Math.floor(0.10 * n)],
    p50: sorted[Math.floor(0.50 * n)],
    p90: sorted[Math.floor(0.90 * n)],
    min: sorted[0],
    max: sorted[n - 1],
  }
}
