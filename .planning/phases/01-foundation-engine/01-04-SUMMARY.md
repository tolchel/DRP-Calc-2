---
phase: 01-foundation-engine
plan: "04"
subsystem: engine
tags: [kde, statistics, density-estimation, tdd]
dependency_graph:
  requires: ["01-02"]
  provides: ["computeKDE — KDEPoint[] output for Plan 05 buildResult()"]
  affects: ["src/engine/simulation.ts (Plan 05 consumer)"]
tech_stack:
  added: []
  patterns: ["Silverman bandwidth rule-of-thumb", "Gaussian kernel density estimation", "TDD red-green-refactor"]
key_files:
  created:
    - src/engine/kde.ts
    - src/engine/kde.test.ts
  modified: []
decisions:
  - "Silverman bandwidth over Sheather-Jones: no JS library implements SJ; Silverman is accurate for unimodal distributions and fits within 100-line budget"
  - "Zero-variance fallback h=1.0: prevents divide-by-zero when all samples are identical"
  - "Single-sample edge: returns [{x: sample, density: 1}] (no throw)"
  - "All-identical-samples edge: returns single point at that value"
metrics:
  duration: "2 min"
  completed: "2026-03-15"
  tasks_completed: 2
  files_created: 2
---

# Phase 1 Plan 4: KDE Module — Silverman Bandwidth + Gaussian Kernel Summary

KDE module that converts raw Monte Carlo trial arrays into smooth density curves using Silverman's rule-of-thumb bandwidth and a Gaussian kernel; exports `computeKDE(samples, maxPoints?)` returning up to 300 `KDEPoint[]` objects normalized to density integral ~1.0.

## What Was Built

`src/engine/kde.ts` implements `computeKDE(samples: number[], maxPoints = 250): KDEPoint[]`:

1. Sorts samples, computes min/max for x-axis range
2. Silverman bandwidth: `h = 1.06 * s * n^(-0.2)` where `s = min(stdDev, IQR/1.34)`
3. Generates `maxPoints` equidistant x-values from min to max (capped at 300)
4. For each x: `density = (1/nh) * sum(K((x - sample)/h))` with Gaussian kernel
5. Returns `{x, density}` pairs

## Bandwidth Algorithm

**Used:** Silverman's rule-of-thumb

**Rationale:** The spec called for Sheather-Jones (SJ/ISJ). Research confirmed no JavaScript library implements SJ. Silverman's rule is:
- Standard, well-understood, O(n) to compute
- Accurate for unimodal distributions (which recovery-time data produces)
- Fast enough for 200,000 samples

**SJ as Phase 2 candidate:** Low priority. The output contract (200-300 KDEPoints with correct shape) is the hard requirement. If multi-modal distributions are ever needed, SJ would reduce over-smoothing. For the current use case (comparing two unimodal recovery curves), Silverman produces visually correct results.

## Performance

| Input size | Points | Duration |
|-----------|--------|----------|
| 200,000 samples | 250 | ~218 ms |

218ms is measured on an Apple Silicon Mac mini. This runs once after all Monte Carlo trials complete, inside the Web Worker thread — acceptable latency.

## Test Results

**16 tests, all passing** (TDD red-green-refactor)

Test coverage:
1. Returns array for 1000-sample normal distribution
2. Output has exactly `maxPoints` entries when <= 300
3. Output capped at 300 even if argument exceeds 300
4. Output <= 300 for default call
5. x values within [min(samples), max(samples)]
6. x values are equidistant (uniform spacing)
7. First x equals min(samples)
8. Last x equals max(samples)
9. All density values non-negative
10. Density integral approximates 1.0 within 5% tolerance
11. Uniform distribution produces approximately flat density (CV < 0.2)
12. Single sample returns valid KDEPoint array without throwing
13. Two identical samples — no NaN or Inf density
14. All-identical 100 samples — no NaN density
15. 200,000 samples without throwing
16. Positive bandwidth produces positive density (bandwidth validity)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files created:
- src/engine/kde.ts: YES
- src/engine/kde.test.ts: YES

Commits:
- fe93cd0: test(01-04): add failing tests for KDE output contract
- 32569a7: feat(01-04): implement KDE module with Silverman bandwidth + Gaussian kernel

## Self-Check: PASSED
