---
phase: 02-wizard-results
plan: 01
subsystem: ui
tags: [recharts, lucide-react, typescript, react-hooks, web-worker]

# Dependency graph
requires:
  - phase: 01-foundation-engine
    provides: SimulationInput, SimulationResult, WorkerInMessage, WorkerOutMessage types and simulation.worker
provides:
  - WizardFormData type contract bridging form UI to SimulationInput
  - LibraryConfig, SanConfig, AssetFormRow sub-types for form fields
  - DEFAULT_WIZARD_DATA constant with all sensible defaults
  - wizardToSimInput() pure mapper (uncertaintyPct/100 conversion included)
  - useSimulation hook with worker lifecycle management (run, cancel, progress, result, isRunning)
  - recharts and lucide-react installed as runtime dependencies
affects:
  - 02-wizard-results (all downstream plans use WizardFormData and useSimulation)
  - 02-02, 02-03, 02-04, 02-05 plans

# Tech tracking
tech-stack:
  added:
    - recharts@3.8.0 (charting library, installed with --legacy-peer-deps for React 19)
    - lucide-react@0.577.0 (icon library)
  patterns:
    - WizardFormData as form-layer type, wizardToSimInput() as boundary mapper
    - useRef<InstanceType<typeof SimWorker> | null> pattern for web worker handle
    - ?worker&inline import syntax for file:// origin compatibility

key-files:
  created:
    - src/types/wizard.ts
    - src/hooks/useSimulation.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "recharts installed with --legacy-peer-deps due to React 19 peer conflict — confirmed working"
  - "uncertaintyPct stored as percentage (0-100) in WizardFormData; wizardToSimInput divides by 100 before engine call"
  - "Asset rows with count=0 AND avgSizeGB=0 filtered out in wizardToSimInput — avoids zero-size assets in simulation"
  - "cancel() preserves last result (does not null it out) — allows re-display of previous run while idle"

patterns-established:
  - "Pattern: WizardFormData -> wizardToSimInput() -> SimulationInput at hook boundary"
  - "Pattern: useRef for worker handle; useState for progress/result/isRunning"

requirements-completed: [INFRA-01, INFRA-06, INFRA-07, UX-01, UX-02]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 2 Plan 01: Foundation Types and useSimulation Hook Summary

**recharts + lucide-react installed, WizardFormData type contract defined with wizardToSimInput mapper, and useSimulation hook built with full worker lifecycle**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T15:12:06Z
- **Completed:** 2026-03-15T15:15:00Z
- **Tasks:** 3
- **Files modified:** 4 (package.json, package-lock.json, src/types/wizard.ts, src/hooks/useSimulation.ts)

## Accomplishments
- Installed recharts@3.8.0 and lucide-react@0.577.0 as runtime dependencies
- Defined WizardFormData with full type contracts for all form fields (assets, libraries, san, network, uncertainty, trials)
- Exported DEFAULT_WIZARD_DATA constant with Russian library name and all defaults
- Implemented wizardToSimInput() pure mapper with empty-row filtering and percentToDecimal conversion
- Built useSimulation hook matching App.tsx worker pattern with run/cancel/progress/result/isRunning API

## Task Commits

Each task was committed atomically:

1. **Task 1: Install recharts and lucide-react** - `8716f10` (chore)
2. **Task 2: Define WizardFormData types and defaults** - `05b52ec` (feat)
3. **Task 3: Build useSimulation hook** - `40d2a2e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `package.json` - Added recharts and lucide-react to runtime dependencies
- `package-lock.json` - Updated lockfile with new packages
- `src/types/wizard.ts` - WizardFormData, LibraryConfig, SanConfig, AssetFormRow, DEFAULT_WIZARD_DATA, wizardToSimInput
- `src/hooks/useSimulation.ts` - useSimulation hook with worker lifecycle management

## Decisions Made
- recharts requires `--legacy-peer-deps` with React 19 — confirmed this blocker from STATE.md, used the flag, install succeeded
- uncertaintyPct division by 100 happens in wizardToSimInput(), not in the hook — keeps conversion at a single boundary point
- cancel() leaves result state unchanged — preserves last successful result for display while user adjusts inputs
- AssetFormRow with all-zero values filtered in wizardToSimInput() — prevents zero-asset groups reaching the engine

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- recharts and lucide-react ready for import in any Phase 2 component
- WizardFormData is the canonical form state type — Plans 02-02 through 02-05 can import it
- useSimulation hook ready to drop into the wizard's final step
- TypeScript compiles cleanly across the full project (tsc --noEmit exits 0)

---
*Phase: 02-wizard-results*
*Completed: 2026-03-15*
