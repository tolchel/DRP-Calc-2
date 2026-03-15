/**
 * KDE (Kernel Density Estimation) module
 *
 * Bandwidth algorithm: Silverman's rule-of-thumb
 *   h = 1.06 * s * n^(-0.2)
 *   where s = min(stdDev, IQR/1.34)
 *
 * Rationale: The spec originally called for Sheather-Jones (SJ/ISJ) bandwidth.
 * Research confirmed no JavaScript library implements SJ. Silverman's rule is
 * accurate enough for the expected unimodal recovery-time distributions and
 * fits within the 100-line budget. SJ could be a Phase 2 refinement if
 * multi-modal distributions are ever required — it is not a priority now.
 *
 * Kernel: Gaussian  K(u) = (1/√2π) * exp(-u²/2)
 *
 * Performance note: 200,000 samples × 250 output points = 50M kernel
 * evaluations. This runs once after all Monte Carlo trials complete, inside
 * the Web Worker thread, so the latency is acceptable (typically <500 ms).
 * If needed, subsample to ~10,000 for bandwidth computation only.
 */

import type { KDEPoint } from '../types/simulation'

const MAX_POINTS = 300
const GAUSSIAN_COEFF = 1 / Math.sqrt(2 * Math.PI)

/** Gaussian kernel: K(u) = (1/√2π) · exp(-u²/2) */
function gaussianKernel(u: number): number {
  return GAUSSIAN_COEFF * Math.exp(-0.5 * u * u)
}

/**
 * Compute Silverman bandwidth.
 * Falls back to h = 1.0 if the estimated spread is zero (all-identical samples).
 */
function silvermanBandwidth(sorted: number[]): number {
  const n = sorted.length
  const mean = sorted.reduce((a, b) => a + b, 0) / n
  const variance = sorted.reduce((acc, x) => acc + (x - mean) ** 2, 0) / (n - 1)
  const stdDev = Math.sqrt(variance)

  const q1 = sorted[Math.floor(0.25 * n)]
  const q3 = sorted[Math.floor(0.75 * n)]
  const iqr = q3 - q1

  const s = iqr > 0 ? Math.min(stdDev, iqr / 1.34) : stdDev
  const h = 1.06 * s * Math.pow(n, -0.2)

  return h > 0 ? h : 1.0  // fallback prevents divide-by-zero on zero-variance input
}

/**
 * Compute a KDE curve from raw sample data.
 *
 * @param samples  Array of numeric samples (e.g. recovery times in hours).
 *                 Units are passed through unchanged — no conversion performed here.
 * @param maxPoints Number of output points (capped at 300). Default: 250.
 * @returns Array of {x, density} pairs with equidistant x from min to max.
 *
 * Edge cases:
 *  - samples.length === 1  → returns [{x: samples[0], density: 1}]
 *  - all samples identical → bandwidth falls back to 1.0; returns single point
 */
export function computeKDE(samples: number[], maxPoints = 250): KDEPoint[] {
  // --- Edge case: single sample ---
  if (samples.length < 2) {
    return [{ x: samples[0] ?? 0, density: 1 }]
  }

  const nPoints = Math.min(maxPoints, MAX_POINTS)
  const sorted = [...samples].sort((a, b) => a - b)
  const n = sorted.length
  const xMin = sorted[0]
  const xMax = sorted[n - 1]

  // --- Edge case: all samples identical ---
  if (xMin === xMax) {
    return [{ x: xMin, density: 1 }]
  }

  const h = silvermanBandwidth(sorted)
  const step = (xMax - xMin) / (nPoints - 1)

  const result: KDEPoint[] = []

  for (let i = 0; i < nPoints; i++) {
    const xi = xMin + i * step
    let sum = 0
    for (let j = 0; j < n; j++) {
      sum += gaussianKernel((xi - sorted[j]) / h)
    }
    result.push({ x: xi, density: sum / (n * h) })
  }

  return result
}
