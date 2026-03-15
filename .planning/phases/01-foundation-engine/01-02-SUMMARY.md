---
phase: 01-foundation-engine
plan: 02
subsystem: infra
tags: [typescript, vitest, types, constants, tdd]

# Dependency graph
requires:
  - phase: 01-01
    provides: Vite 7 scaffold with vitest installed
provides:
  - SimulationInput, AssetGroup, TapeLibrary, SimulationResult, ScenarioResult, KDEPoint types
  - WorkerInMessage, WorkerOutMessage discriminated union types
  - STARTUP_MINUTES=30, ASSET_PRIORITY=['db','server','fs','ws'], verifiersPerShift() constant module
  - constants.test.ts: 9 passing tests (SIM-09 locked, asset priority order, engineer formula)
  - simulation.test.ts: 4 .todo stubs for SIM-02, SIM-03/04, SIM-07, SIM-10
  - recovery.test.ts: 8 .todo stubs for SIM-05, SIM-06, SIM-08
affects:
  - 01-03
  - 01-04
  - 01-05

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Types-only files: no implementation in src/types/ — enforced by comments and structure"
    - "All time values in SimulationResult/KDEPoint are in HOURS — comment-enforced at type definition"
    - "STARTUP_MINUTES=30 is locked — uncertainty multiplier applies to transfer time only, never startup"
    - "verifiersPerShift = floor(N/3) — zero-capacity shift signals 480 min pause in engine"
    - "it.todo() stubs used for tests that go green after Plans 03-05 implement the logic"

key-files:
  created:
    - src/types/simulation.ts
    - src/types/worker.ts
    - src/engine/constants.ts
    - src/engine/constants.test.ts
    - src/engine/simulation.test.ts
    - src/engine/recovery.test.ts
  modified: []

key-decisions:
  - "STARTUP_MINUTES=30 locked as non-configurable constant — uncertainty multiplier applies to transfer time only, not startup time (SIM-08/SIM-09)"
  - "ASSET_PRIORITY=['db','server','fs','ws'] locked in constants.ts — Plans 03+ must follow this exact order (SIM-05)"
  - "verifiersPerShift uses floor(N/3) formula — zero capacity (result=0) triggers 480-min pause in recovery engine"
  - "Prefixed _STUB_INPUT with underscore in simulation.test.ts to avoid noUnusedLocals TS error"

patterns-established:
  - "All exported types live in src/types/ — engine and worker files import from there, never define their own"
  - "Test stub pattern: it.todo() for tests that go green after later plans — zero false failures, full visibility"
  - "HOURS are the unit contract boundary: types carry HOURS, engine converts at buildResult() boundary"

requirements-completed: [SIM-09]

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 1 Plan 02: Shared Types, Constants, and Test Stubs Summary

**TypeScript interface contracts for SimulationInput/Result/Worker established in src/types/, constants module with STARTUP_MINUTES=30 and verifiersPerShift() locked, and 11 .todo test stubs created for all engine requirements (SIM-02 through SIM-10)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T12:10:56Z
- **Completed:** 2026-03-15T12:12:17Z
- **Tasks:** 2
- **Files modified:** 6 created, 0 modified

## Accomplishments

- All shared TypeScript contracts defined and compiling cleanly with `npx tsc --noEmit`
- constants.ts locked: STARTUP_MINUTES=30, ASSET_PRIORITY=['db','server','fs','ws'], verifiersPerShift() with floor(N/3) formula
- constants.test.ts: 9 assertions all passing (SIM-09 satisfied)
- 11 .todo stubs in simulation.test.ts and recovery.test.ts — ready to go green after Plans 03-05
- No "cannot find module" errors; vitest reports 1 passed | 2 skipped | 9 passed | 11 todo

## Task Commits

Each task was committed atomically:

1. **Task 1: Define shared TypeScript types and worker message contracts** - `256dcf1` (feat)
2. **Task 2: Create constants module and failing test stubs for all engine requirements** - `80d47d4` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/types/simulation.ts` - SimulationInput, AssetGroup, TapeLibrary, KDEPoint, ScenarioResult, SimulationResult interfaces (all times in HOURS)
- `src/types/worker.ts` - WorkerInMessage and WorkerOutMessage discriminated unions
- `src/engine/constants.ts` - STARTUP_MINUTES=30, ASSET_PRIORITY, verifiersPerShift()
- `src/engine/constants.test.ts` - 9 passing tests for SIM-09, ASSET_PRIORITY order, verifiersPerShift cases
- `src/engine/simulation.test.ts` - 4 .todo stubs: SIM-02, SIM-03/04, SIM-07, SIM-10
- `src/engine/recovery.test.ts` - 8 .todo stubs: SIM-05, SIM-06, SIM-08

## Decisions Made

- **STARTUP_MINUTES=30 locked non-configurable:** The comment in constants.ts explicitly states "do NOT make configurable" — this prevents accidental parameterization in Plans 03-05. Uncertainty applies to transfer time only (SIM-08).
- **Underscore prefix for _STUB_INPUT:** TypeScript strict mode `noUnusedLocals` would have rejected the STUB_INPUT constant in simulation.test.ts since it is unused until Plan 03+05 implement runSimulation. Prefixed with `_` to suppress the error without removing the constant.
- **ASSET_PRIORITY as const:** Using `as const` ensures the array type is readonly and the type `AssetType` is derived from it — prevents accidental mutation and gives narrower types throughout the engine.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added underscore prefix to _STUB_INPUT in simulation.test.ts**
- **Found during:** Task 2 (TypeScript compilation verification)
- **Issue:** `noUnusedLocals: true` in tsconfig.app.json would have caused `npx tsc --noEmit` to fail for STUB_INPUT declared but not yet used
- **Fix:** Renamed to `_STUB_INPUT` — TypeScript convention for intentionally unused variables, suppresses the error without removing the reference data
- **Files modified:** `src/engine/simulation.test.ts`
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** `80d47d4` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — TypeScript strict mode compliance)
**Impact on plan:** Minimal — single variable rename. Types and tests are otherwise exact matches to the plan specification.

## Issues Encountered

None — both tasks executed cleanly on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 03 and 04 can import types directly from `src/types/simulation.ts` and `src/types/worker.ts` — no exploration needed
- constants.ts is the source of truth for STARTUP_MINUTES, ASSET_PRIORITY, verifiersPerShift — Plans 03+ must import these, not redefine
- Test stubs in simulation.test.ts and recovery.test.ts will go GREEN as Plans 03-05 implement the corresponding functions
- vitest is healthy: 9 passing assertions, 11 todos, 0 failures

## Self-Check: PASSED

All 7 expected files found on disk. Both task commits (256dcf1, 80d47d4) verified in git log.

---
*Phase: 01-foundation-engine*
*Completed: 2026-03-15*
