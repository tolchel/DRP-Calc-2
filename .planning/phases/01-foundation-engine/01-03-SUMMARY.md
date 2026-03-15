---
phase: 01-foundation-engine
plan: 03
subsystem: engine
tags: [typescript, vitest, tdd, recovery-engine, monte-carlo, arithmetic]

# Dependency graph
requires:
  - phase: 01-02
    provides: SimulationInput type, STARTUP_MINUTES/ASSET_PRIORITY/verifiersPerShift from constants.ts, recovery.test.ts .todo stubs

provides:
  - computeKyberTime(input, networkFactor, engineerFactor): number — Кибербакап recovery time in minutes
  - computeKonkurentTime(input, networkFactor, engineerFactor): number — Конкурент two-phase recovery time in minutes
  - computeAssetTransferMinutes(groupDataMB, effectiveSpeedMBs, uncertaintyFactor): number — shared transfer helper
  - recovery.test.ts: 24 passing tests covering SIM-03 through SIM-08

affects:
  - 01-04
  - 01-05

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stochastic factors (networkFactor, engineerFactor, uncertaintyFactor) are pre-drawn by the simulation runner and injected as parameters — pure functions stay deterministic and testable"
    - "uncertaintyFactor applied in computeAssetTransferMinutes only — never touches STARTUP_MINUTES (SIM-08)"
    - "orderedAssetGroups() uses ASSET_PRIORITY.flatMap to enforce db→server→fs→ws order (SIM-05)"
    - "count=0 groups skipped entirely; avgSizeGB=0 contributes zero transfer time + STARTUP_MINUTES"
    - "gbpsToMBs() helper centralizes Gbps→MB/s conversion (no repeated magic division by 8)"

key-files:
  created:
    - src/engine/recovery.ts
    - src/engine/recovery.test.ts (replaced .todo stubs with full test suite)
  modified: []

key-decisions:
  - "engineerFactor is accepted by computeKyberTime/computeKonkurentTime as a parameter signature placeholder — the 480-min pause logic is deferred to Plan 04's simulation runner which has the outer loop context needed to apply it per-group"
  - "uncertaintyFactor hardcoded to 1.0 inside the pure functions — Plan 04's Monte Carlo runner will draw per-trial per-group values and inject via the helper; functions stay deterministic for unit testing"
  - "Конкурент phase2 uncertaintyFactor not applied (only networkFactor) — uncertainty models tape read variance (phase 1); SAN→objects path is treated as deterministic at this layer"

patterns-established:
  - "Pure function pattern: all arithmetic functions take only input + pre-drawn stochastic factors, no side effects, no RNG calls — enables deterministic unit tests and makes Monte Carlo injection clean"
  - "Shared helper computeAssetTransferMinutes is exported — Plan 04 runner can call it directly with its own drawn uncertaintyFactor instead of going through the scenario functions"

requirements-completed: [SIM-03, SIM-04, SIM-05, SIM-06, SIM-07, SIM-08]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 1 Plan 03: Recovery Arithmetic Summary

**Кибербакап and Конкурент recovery time formulas implemented as pure deterministic TypeScript functions with 24 passing TDD tests covering all arithmetic correctness requirements (SIM-03 through SIM-08)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T12:14:36Z
- **Completed:** 2026-03-15T12:17:30Z
- **Tasks:** 2 (RED + GREEN/REFACTOR)
- **Files modified:** 1 created, 1 replaced

## Accomplishments

- All three public functions implemented and verified: computeKyberTime, computeKonkurentTime, computeAssetTransferMinutes
- 24 deterministic test assertions passing — SIM-03 through SIM-08 all green
- ASSET_PRIORITY order enforced via orderedAssetGroups() without any hardcoded strings in recovery.ts
- No magic numbers — all constants imported from constants.ts (STARTUP_MINUTES, ASSET_PRIORITY)
- npx tsc --noEmit exits 0 — no type errors across full project

## Task Commits

Each task was committed atomically:

1. **RED: Write failing tests for recovery arithmetic** - `a0f30ed` (test)
2. **GREEN: Implement recovery.ts + REFACTOR cleanup** - `e3835c8` (feat)

**Plan metadata:** _(docs commit follows)_

_Note: TDD plan — RED commit intentionally fails (import error), GREEN commit is the implementation._

## Files Created/Modified

- `src/engine/recovery.ts` — Three exported functions: computeKyberTime, computeKonkurentTime, computeAssetTransferMinutes; four private helpers: gbpsToMBs, totalTapeThruMBs, orderedAssetGroups
- `src/engine/recovery.test.ts` — Replaced 8 .todo stubs with 24 full test assertions covering all SIM-03 through SIM-08 requirements

## Key Arithmetic Formulas Confirmed Working

### Кибербакап (SIM-03)
- Input: 2 libs × 1 drive × 300 MB/s, 1 db asset 100 GB, fastNet=10 Gbps, networkFactor=1.0
- totalTapeThru = 600 MB/s; effectiveSpeed = min(600/10, 1250) = 60 MB/s
- transferMin = 102400 / (60 × 60) = 28.444... min
- **Total = 58.444... min** (verified by test to 4 decimal places)

### Конкурент (SIM-04)
- Same input as above; lanGbps=1 → lanCap=125 MB/s
- Phase 1: speed = min(600, 1250) = 600 MB/s; phase1Min = 102400/(600×60) = 2.844...
- Phase 2: sanStream = min(400, 125/10) = 12.5 MB/s; phase2Speed = 12.5×10 = 125 MB/s; phase2Min = 102400/(125×60) = 13.653...
- **Total = 46.497... min** (verified by test to 4 decimal places)

## Decisions Made

- **engineerFactor as signature placeholder:** The function signature includes `engineerFactor` for interface consistency with Plan 04's runner, but the 480-min pause logic requires the outer simulation loop context (verifiersPerShift, group count). Deferred to Plan 04.
- **uncertaintyFactor hardcoded 1.0 in pure functions:** The Monte Carlo runner in Plan 04 will draw per-trial per-group values and pass them to computeAssetTransferMinutes directly. Functions stay pure/deterministic for unit testing.
- **Конкурент phase2 uses networkFactor only (no uncertaintyFactor):** Uncertainty models tape read variance which occurs in phase 1. SAN→objects transfer is treated as a deterministic network path at this layer. This is consistent with the plan spec.

## Deviations from Plan

None — plan executed exactly as written. Both RED and GREEN phases completed in one attempt each. All 6 test cases from the implementation guide were covered.

## Issues Encountered

None — all 24 tests passed on first GREEN implementation. TypeScript compiled cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04 (Monte Carlo simulation runner) can import all three functions directly from `src/engine/recovery.ts`
- The stochastic injection pattern is ready: runner draws networkFactor/engineerFactor once per trial, draws uncertaintyFactor once per asset group per trial, then calls computeKyberTime/computeKonkurentTime (for startup-inclusive totals) or computeAssetTransferMinutes directly (for per-group transfer time with drawn uncertainty)
- computeAssetTransferMinutes is exported to enable the runner to apply its own drawn uncertaintyFactor per-group — no need to route through the scenario functions for that
- 4 .todo stubs remain in simulation.test.ts (SIM-02, SIM-03/04, SIM-07, SIM-10) — these will go green after Plans 04-05 implement runSimulation

## Self-Check: PASSED

All expected files found on disk. Both task commits (a0f30ed, e3835c8) verified in git log.

---
*Phase: 01-foundation-engine*
*Completed: 2026-03-15*
