---
phase: 01-foundation-engine
plan: 05
subsystem: engine
tags: [webworker, monte-carlo, vite, vitest, typescript, simulation, kde]

# Dependency graph
requires:
  - phase: 01-foundation-engine/01-03
    provides: computeKyberTime, computeKonkurentTime — recovery arithmetic modules
  - phase: 01-foundation-engine/01-04
    provides: computeKDE — KDE module with Silverman bandwidth
provides:
  - runSimulation(input, onProgress?) orchestrator wiring recovery + KDE into SimulationResult
  - Web Worker (simulation.worker.ts) thin wrapper posting 'progress' + 'result' messages
  - App.tsx engine validation UI proving non-blocking execution end-to-end
  - Worker inline build pattern: vite ?worker&inline + iife format + blob URL patch for file:// support
affects:
  - 02-ui-wizard (worker instantiation pattern, WorkerInMessage/WorkerOutMessage types)
  - 03-output-display (SimulationResult shape, ScenarioResult.kde x-axis in hours)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Web Worker import via ?worker&inline Vite query — bundles worker into single dist/index.html"
    - "Worker format must be iife (not es) for file:// origin compatibility"
    - "Blob URL patch in index.html converts data: URL to blob: URL at runtime — required for Chrome file:// Worker()"
    - "Shared random draws per trial: same networkFactor and engineerFactor for both scenarios — fair comparison"
    - "Unit conversion boundary: recovery.ts returns minutes; buildScenarioResult divides by 60 before KDE"
    - "Progress fires every floor(trials/20) iterations + final 100% = 20-21 messages per run (SIM-10)"

key-files:
  created:
    - src/engine/simulation.ts
    - src/engine/simulation.test.ts
    - src/workers/simulation.worker.ts
    - tsconfig.worker.json
  modified:
    - src/App.tsx
    - vite.config.ts
    - index.html
    - src/engine/recovery.ts
    - src/engine/recovery.test.ts

key-decisions:
  - "Worker iife format chosen over es — es modules fail in file:// origin due to Chrome CORS on data: URLs"
  - "Blob URL patch in index.html: converts data:text/javascript base64 to blob: URL before Worker() call"
  - "Кибербакап speed = min(tapeThru, fastNetCap) — erroneous /10 divisor removed; correct value 600 MB/s not 60 MB/s"
  - "Shared networkFactor + engineerFactor draws per trial: fair apples-to-apples comparison between scenarios"
  - "KDE_POINTS constant = 250 (within 200-300 contract); defined in simulation.ts not types"
  - "Unit conversion at buildScenarioResult boundary — recovery.ts stays in minutes, SimulationResult always hours"

patterns-established:
  - "Phase 2 worker instantiation: import SimWorker from './workers/simulation.worker?worker&inline'; const w = new SimWorker()"
  - "Phase 2 message sending: worker.postMessage({ type: 'run', data: input } satisfies WorkerInMessage)"
  - "Phase 2 progress handling: e.data.type === 'progress' → e.data.percent (0-100)"
  - "Phase 2 result handling: e.data.type === 'result' → e.data.data is SimulationResult"

requirements-completed: [SIM-01, SIM-02, SIM-10]

# Metrics
duration: ~45min
completed: 2026-03-15
---

# Phase 1 Plan 05: Simulation Orchestrator + Web Worker Summary

**Monte Carlo engine wired end-to-end: runSimulation orchestrator + iife Web Worker inlined into single-file dist/index.html, with blob URL patch enabling file:// execution — human-verified non-blocking at 10,000 trials**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-15T12:18:48Z
- **Completed:** 2026-03-15T15:58:00Z
- **Tasks:** 2 auto + 1 human-verify checkpoint
- **Files modified:** 9

## Accomplishments

- runSimulation orchestrator wiring recovery.ts + kde.ts into SimulationResult with 20-step progress callback
- Web Worker wrapper bundled inline via Vite ?worker&inline — dist/ remains exactly 1 file (197 kB)
- Human-verified: progress 0%→100%, UI non-blocking, kyber.p50 < competitor.p50, kde_points: 250
- Fixed Кибербакап speed formula: removed erroneous /10 divisor (600 MB/s not 60 MB/s)
- Solved Worker file:// origin problem: iife format + blob URL patch in index.html
- 55 tests passing across all 4 test files (constants, recovery, kde, simulation)

## Task Commits

Each task was committed atomically:

1. **Task 1: Simulation orchestrator (TDD RED)** - `faeabba` (test)
2. **Task 1: Simulation orchestrator (TDD GREEN)** - `658b0d4` (feat)
3. **Task 2: Web Worker + App.tsx wiring** - `aff61b9` (feat)
4. **Post-checkpoint fixes: file:// support + formula correction** - `a4e68bd` (fix)

## Files Created/Modified

- `src/engine/simulation.ts` — runSimulation orchestrator, KDE_POINTS=250 constant, buildScenarioResult with minutes→hours conversion
- `src/engine/simulation.test.ts` — 8 tests: both scenarios, KDE units in hours, progress count, network factor bounds
- `src/workers/simulation.worker.ts` — thin Web Worker wrapper: receives 'run', posts 'progress' + 'result'
- `tsconfig.worker.json` — TypeScript config for worker files with WebWorker lib
- `src/App.tsx` — engine validation UI: Run button, progress display, result JSON (debug only, replaced in Phase 2)
- `vite.config.ts` — worker format changed from 'es' to 'iife' for file:// compatibility
- `index.html` — blob URL patch script converting data: URL before Worker() constructor call
- `src/engine/recovery.ts` — Кибербакап speed formula corrected: min(tapeThru, fastNetCap) not min(tapeThru/10, fastNetCap)
- `src/engine/recovery.test.ts` — expected values updated to match corrected 600 MB/s throughput

## Decisions Made

**Worker format: iife over es**
Vite's default `?worker&inline` produces an es module as a data: URL. Chrome rejects `new Worker(data:...)` from a file:// origin with a MIME type error. Changing `build.worker.format` to `iife` produces an iife-wrapped script that Chrome accepts from data: URLs — but only after applying a blob URL conversion patch.

**Blob URL patch in index.html**
Even with iife format, Chrome's Worker() constructor rejects data: URLs in file:// context. The patch in index.html intercepts the native Worker constructor, detects data: URL arguments, converts them to blob: URLs via fetch+blob, and calls the real Worker with the blob: URL. This is the minimal viable fix for file:// distribution.

**Кибербакап speed formula correction**
Plan 03 implementation had `Math.min(tapeThru / 10, fastNetCap)` where `/10` was erroneous — not specified in the algorithm spec. Correct formula is `Math.min(tapeThru, fastNetCap)`. This raised throughput from 60 MB/s to 600 MB/s, changing expected test values significantly. All 55 tests updated and passing.

**Shared random draws for fair comparison**
Both kyberbackup and competitor scenarios draw the same networkFactor and engineerFactor per trial. This gives an apples-to-apples comparison — the difference in p50 values reflects only the algorithmic difference, not random noise asymmetry.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Кибербакап formula: erroneous /10 divisor in speed calculation**
- **Found during:** Task 3 checkpoint (human verification revealed competitor.p50 > kyber.p50 but values were implausibly small)
- **Issue:** `Math.min(tapeThru / 10, fastNetCap)` — the `/10` was not in the spec, reduced tape throughput from 600 to 60 MB/s
- **Fix:** Changed to `Math.min(tapeThru, fastNetCap)` and updated all affected test expected values
- **Files modified:** src/engine/recovery.ts, src/engine/recovery.test.ts
- **Verification:** 55 tests pass; browser shows kyber.p50 in plausible hour range
- **Committed in:** a4e68bd (post-checkpoint fix commit)

**2. [Rule 3 - Blocking] Web Worker fails in file:// origin with default Vite es format**
- **Found during:** Task 3 checkpoint (human verification — Worker load failure in file:// context)
- **Issue:** `?worker&inline` default produces es module as data: URL; Chrome rejects Worker(data:...) from file:// origin
- **Fix 1:** vite.config.ts: `build.worker.format = 'iife'`
- **Fix 2:** index.html: blob URL patch script converting data: URL to blob: URL before Worker() construction
- **Files modified:** vite.config.ts, index.html
- **Verification:** dist/index.html opens from file:// — progress updates and result JSON visible in browser
- **Committed in:** a4e68bd (post-checkpoint fix commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes essential for correctness and file:// distribution requirement. No scope creep.

## Human Verification

**Checkpoint approved 2026-03-15 after verifying:**
- Progress updates 0% → 100% visible in UI
- UI non-blocking during simulation run
- Result JSON shows kyber.p50 and competitor.p50 as hour values (not minutes)
- kde_points: 250 for both scenarios
- competitor.p50 > kyber.p50 (two-phase recovery is slower, as expected)

## Phase 2 Worker Integration Patterns

Phase 2 (UI Wizard) should use these exact patterns to instantiate and communicate with the simulation worker:

```typescript
// Import (CRITICAL: must use ?worker&inline — do NOT use new Worker(new URL(...)) syntax)
import SimWorker from './workers/simulation.worker?worker&inline'

// Instantiate
const worker = new SimWorker()

// Send run message
worker.postMessage({ type: 'run', data: input } satisfies WorkerInMessage)

// Handle messages
worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
  if (e.data.type === 'progress') {
    setProgress(e.data.percent)  // 0-100, fires ~20 times
  }
  if (e.data.type === 'result') {
    setResult(e.data.data)  // SimulationResult with kyberbackup + competitor
    worker.terminate()
  }
}
```

**SimulationResult shape for Phase 2:**
```typescript
// All x values in hours, all percentiles in hours
result.kyberbackup.p50   // median recovery hours
result.kyberbackup.kde   // KDEPoint[] with 250 points, x in hours
result.competitor.p50    // always > kyberbackup.p50
```

## Issues Encountered

Worker file:// origin compatibility required two fixes working in combination (iife format alone not sufficient — blob URL patch also required). Chrome behavior differs from Firefox; the blob URL patch approach is the most portable solution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Complete simulation engine ready: runSimulation → SimulationResult (KDE + percentiles, both scenarios)
- Worker integration patterns documented for Phase 2
- All 55 engine tests passing
- Single-file dist/index.html (197 kB) confirmed working from file:// origin
- Phase 2 can immediately build the wizard form on top of the existing App.tsx stub

**Blocker carried forward:** recharts requires `--legacy-peer-deps` with React 19 — noted in STATE.md, verify at Phase 2 setup.

---
*Phase: 01-foundation-engine*
*Completed: 2026-03-15*
