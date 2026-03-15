---
phase: 03-persistence-polish
plan: 04
subsystem: ui
tags: [react, recharts, localstorage, kde, comparison, vitest]

# Dependency graph
requires:
  - phase: 03-persistence-polish
    provides: useScenarios hook, ScenarioDrawer component, Wave 0 test stubs
  - phase: 02-wizard-results
    provides: ResultsPage, useSimulation hook, KDEPoint/SimulationResult types
provides:
  - ComparisonScreen component with 4-curve KDE ComposedChart and metrics table
  - mergeKDEs named export (linearly-interpolated union of 4 KDE arrays)
  - ResultsPage save widget (text field + Сохранить button, inline below scenario panels)
  - App.tsx fully wired: onSave prop, step-4 ComparisonScreen, comparison navigation
  - Human-verified all 5 Phase 3 flows: save, load, delete, comparison, page-reload persistence
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two independent useSimulation() instances for sequential comparison (simA then simB)"
    - "mergeKDEs: collect unique x values via Set, sort ascending, interpolate per curve"
    - "Empty-dep useEffect for mount-time simulation trigger, guarded second useEffect for sequential start"

key-files:
  created:
    - src/components/ComparisonScreen.tsx
  modified:
    - src/components/ResultsPage.tsx
    - src/App.tsx

key-decisions:
  - "Two separate useSimulation() hook instances run sequentially in ComparisonScreen — simB starts only after simA.result && !simA.isRunning"
  - "mergeKDEs uses linear interpolation; points outside a curve's x range return 0 density (not extrapolated)"
  - "Save widget placed inline in ResultsPage (below scenario panels, above asset breakdown table) — drawer saveWidget slot unused"

patterns-established:
  - "Sequential async simulation: guard second effect on simA.isRunning + simA.result flags"
  - "mergeKDEs as named export enables unit testing separate from component rendering"

requirements-completed: [SCEN-01, SCEN-05]

# Metrics
duration: 10min
completed: 2026-03-15
---

# Phase 3 Plan 04: Comparison Screen + Save Widget Summary

**ComparisonScreen with 4-curve recharts KDE overlay (mergeKDEs interpolation) and inline ResultsPage save widget, completing the full Phase 3 scenario persistence and comparison feature set**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-15
- **Completed:** 2026-03-15
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 3

## Accomplishments
- ComparisonScreen renders 4 KDE curves (Кибербакап/Конкурент × A/B) using recharts ComposedChart with blue/orange solid/dashed styling
- mergeKDEs exports a pure function that unions x-values from 4 KDE arrays and linearly interpolates density values — tested GREEN by ComparisonScreen.test.ts
- ResultsPage save widget lets user type a scenario name and click "Сохранить" to persist to localStorage via useScenarios.save()
- App.tsx fully wired: onSave prop connects ResultsPage to saveScenario, step-4 renders real ComparisonScreen, onBack returns to step 3 or step 1
- All 5 Phase 3 flows human-verified: save, load, delete, comparison (4 curves + metrics table + Назад), and page-reload localStorage persistence

## Task Commits

Each task was committed atomically:

1. **Task 1: Build ComparisonScreen with mergeKDEs (GREEN test)** - `542a961` (feat)
2. **Task 2: Add save widget to ResultsPage; finalize App.tsx wiring** - `d7f8ed9` (feat)
3. **Task 3: Human verify complete Phase 3 feature set** - `da73976` (chore)

**Plan metadata:** _(docs commit — created with this summary)_

## Files Created/Modified
- `src/components/ComparisonScreen.tsx` - New: 4-curve KDE comparison screen with mergeKDEs export, sequential simulation, metrics table
- `src/components/ResultsPage.tsx` - Extended: inline save widget (text field + Сохранить button + local saveName state)
- `src/App.tsx` - Extended: onSave prop to ResultsPage, real ComparisonScreen on step 4, comparison navigation

## Decisions Made
- Two independent useSimulation() instances for sequential comparison: simA mounts first, simB guarded by `simA.result && !simA.isRunning` — avoids shared state complexity
- mergeKDEs returns 0 density for x values outside a curve's range (no extrapolation) — matches plan spec and test contract
- Save widget is canonical placement in ResultsPage, not in the drawer saveWidget slot — per CONTEXT.md locked design

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 3 fully complete: all 5 requirements (SCEN-01 through SCEN-05) delivered and human-verified
- Application is feature-complete for the v1.0 milestone
- dist/index.html single-file build confirmed working across all phases

## Self-Check: PASSED
- FOUND: .planning/phases/03-persistence-polish/03-04-SUMMARY.md
- FOUND: 542a961 (Task 1 commit)
- FOUND: d7f8ed9 (Task 2 commit)
- FOUND: da73976 (Task 3 commit)

---
*Phase: 03-persistence-polish*
*Completed: 2026-03-15*
