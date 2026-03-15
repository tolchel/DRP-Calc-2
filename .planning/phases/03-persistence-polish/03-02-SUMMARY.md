---
phase: 03-persistence-polish
plan: 02
subsystem: testing
tags: [vitest, typescript, localStorage, react, hooks, tdd]

# Dependency graph
requires:
  - phase: 03-persistence-polish
    plan: 01
    provides: SavedScenario type + useScenarios RED test stubs
  - phase: 02-wizard-results
    provides: WizardFormData type (data field shape for SavedScenario)
provides:
  - useScenarios hook with save/remove/scenarios interface
  - isValidScenario type-guard exported for unit-testing
  - loadFromStorage pure helper exported for unit-testing
  - persist helper (localStorage.setItem with try/catch, not exported)
affects: [03-03-comparison-screen, 03-04-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Functional setState (prev => ...) prevents stale closure in same-act() save calls"
    - "loadFromStorage passed as initializer function to useState (not called eagerly)"
    - "crypto.randomUUID() used for id generation — no import, available in all modern browsers"
    - "persist() wraps setItem in try/catch and logs error without rethrowing"

key-files:
  created:
    - src/hooks/useScenarios.ts
  modified: []

key-decisions:
  - "Functional setState used in save() and remove() to avoid stale closure — initial naive closure approach failed test that called save twice in one act()"
  - "persist() called inside setScenarios updater function so it always sees the latest state"

patterns-established:
  - "Hooks that mutate arrays use functional setState (prev => ...) not closure over state variable"

requirements-completed: [SCEN-01, SCEN-03, SCEN-04]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 3 Plan 02: useScenarios Hook Summary

**useScenarios hook with localStorage CRUD using functional setState to prevent stale closures; isValidScenario type-guard filters corrupt entries on load**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T16:52:29Z
- **Completed:** 2026-03-15T16:55:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `src/hooks/useScenarios.ts` with full hook implementation: isValidScenario, loadFromStorage, persist, useScenarios
- All 5 RED stubs from Plan 01 now pass GREEN (save, sort-newest-first, remove, corrupt-data-guard, name-fallback)
- Zero TypeScript errors; full 60-test suite passes with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement useScenarios hook (GREEN)** - `d0f27e7` (feat)

## Files Created/Modified

- `src/hooks/useScenarios.ts` - useScenarios hook + isValidScenario type-guard + loadFromStorage + persist helpers; exports useScenarios, isValidScenario, loadFromStorage

## Decisions Made

- Functional setState (`prev => ...`) required in `save()` and `remove()` to avoid stale closure — initial implementation using closure over `scenarios` state variable failed the test that calls `save` twice within a single `act()` block. Switching to functional updaters ensures each call sees the latest accumulated state.
- `persist()` is called inside the `setScenarios` updater so it always receives the up-to-date array before writing to localStorage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale closure in save() causing second save to overwrite first**
- **Found during:** Task 1 (Implement useScenarios hook GREEN)
- **Issue:** Initial implementation closed over `scenarios` variable. Two `save()` calls within the same `act()` batch both captured `scenarios = []`, so the second call produced `[entry2]` instead of `[entry2, entry1]`. Test `scenarios[1]` was `undefined`.
- **Fix:** Replaced direct closure with functional setState (`setScenarios(prev => ...)`) in both `save()` and `remove()`. Moved `persist()` call inside the updater function to receive the correct latest array.
- **Files modified:** src/hooks/useScenarios.ts
- **Verification:** All 5 tests pass GREEN including the sort-newest-first test
- **Committed in:** d0f27e7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Fix essential for correctness. No scope creep.

## Issues Encountered

None beyond the stale-closure bug that was auto-fixed inline.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `useScenarios` hook is fully implemented and tested — Plan 03 (ScenarioDrawer / ComparisonScreen) can import and use it directly
- SCEN-01 (save), SCEN-03 (sorted list), SCEN-04 (delete) have full unit coverage
- ComparisonScreen RED stubs remain (Plan 03 scope) — expected pre-existing failure

---
*Phase: 03-persistence-polish*
*Completed: 2026-03-15*
