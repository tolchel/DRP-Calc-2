---
phase: 03-persistence-polish
plan: 01
subsystem: testing
tags: [vitest, typescript, localStorage, tdd, wave-0]

# Dependency graph
requires:
  - phase: 02-wizard-results
    provides: WizardFormData type (data field shape for SavedScenario)
provides:
  - SavedScenario interface with id, name, date, data fields
  - useScenarios RED test stubs (SCEN-01, SCEN-03, SCEN-04)
  - ComparisonScreen RED test stub for mergeKDEs (SCEN-05)
affects: [03-02-useScenarios-hook, 03-03-comparison-screen, 03-04-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 TDD: write RED stubs before any implementation"
    - "@vitest-environment jsdom per-file override for localStorage tests"
    - "Test pure hook functions via renderHook from @testing-library/react"

key-files:
  created:
    - src/types/scenario.ts
    - src/hooks/useScenarios.test.ts
    - src/components/ComparisonScreen.test.ts
  modified: []

key-decisions:
  - "SavedScenario.data typed as WizardFormData (inputs only, never SimulationResult) — prevents localStorage quota errors"
  - "@testing-library/react already in devDependencies — used renderHook for hook stubs rather than raw localStorage manipulation"
  - "ComparisonScreen.test.ts uses node environment (no jsdom override) — mergeKDEs is a pure function, no DOM access needed"

patterns-established:
  - "Wave 0 RED: both test files fail with import resolution error — intentional, correct RED state"
  - "Test stubs use real assertions (not todo()) so failures are meaningful once implementation lands"

requirements-completed: [SCEN-01, SCEN-03, SCEN-04, SCEN-05]

# Metrics
duration: 1min
completed: 2026-03-15
---

# Phase 3 Plan 01: Type Contract and Wave 0 Test Stubs Summary

**SavedScenario TypeScript interface defined and Nyquist Wave 0 RED stubs written for useScenarios hook and mergeKDEs pure function**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-15T16:49:28Z
- **Completed:** 2026-03-15T16:50:46Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `src/types/scenario.ts` exporting `SavedScenario` interface — sole source of truth for localStorage entry shape
- Written `useScenarios.test.ts` with 5 RED stubs covering save, sort-newest-first, remove, corrupt-data-guard, and name-fallback behaviors
- Written `ComparisonScreen.test.ts` with 3 RED stubs covering mergeKDEs structure, ascending x-sort, and zero-density outside range

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SavedScenario type** - `45f18bd` (feat)
2. **Task 2: Write Wave 0 test stubs (RED)** - `e67bbf8` (test)

## Files Created/Modified

- `src/types/scenario.ts` - SavedScenario interface: id (UUID), name (string), date (ISO 8601), data (WizardFormData)
- `src/hooks/useScenarios.test.ts` - 5 vitest stubs for SCEN-01/03/04, jsdom environment, uses renderHook
- `src/components/ComparisonScreen.test.ts` - 3 vitest stubs for SCEN-05 mergeKDEs pure function

## Decisions Made

- `@testing-library/react` was already in devDependencies (confirmed in package.json) — used `renderHook` to test the hook interface directly rather than pure-function alternatives
- `ComparisonScreen.test.ts` uses default node vitest environment since `mergeKDEs` is a pure function with no DOM dependencies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 contract established: Plan 02 (useScenarios hook) and Plan 03 (ComparisonScreen) can now implement against these test contracts
- Both test files will turn GREEN once Plan 02 creates `src/hooks/useScenarios.ts` and Plan 03 creates `src/components/ComparisonScreen.tsx` with `mergeKDEs`
- TypeScript compiles cleanly (no new type errors introduced)

---
*Phase: 03-persistence-polish*
*Completed: 2026-03-15*
