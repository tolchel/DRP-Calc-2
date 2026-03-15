# Architecture Research

**Domain:** React SPA — multi-step wizard + Monte Carlo simulation engine + KDE visualization
**Researched:** 2026-03-15
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        UI Layer (React)                          │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ WizardShell  │  │ ResultsPage  │  │   ScenarioManager    │   │
│  │ (routing +   │  │ (charts +    │  │   (save/load/export) │   │
│  │  progress)   │  │  metrics)    │  │                      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                     │               │
│  ┌──────┴────────────────────────────────────────┴───────────┐  │
│  │              Wizard State (useReducer + Context)          │  │
│  └──────────────────────────┬────────────────────────────────┘  │
├─────────────────────────────┼────────────────────────────────────┤
│                  Computation Boundary                            │
├─────────────────────────────┼────────────────────────────────────┤
│                             │ postMessage / Comlink              │
│                    ┌────────┴────────┐                           │
│                    │   Web Worker    │                           │
│                    │  (Monte Carlo   │                           │
│                    │   engine +      │                           │
│                    │   KDE calc)     │                           │
│                    └────────┬────────┘                           │
├─────────────────────────────┼────────────────────────────────────┤
│                   Persistence Layer                              │
│                             │                                    │
│                    ┌────────┴────────┐                           │
│                    │  localStorage   │                           │
│                    │  (scenarios as  │                           │
│                    │   JSON blobs)   │                           │
│                    └─────────────────┘                           │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `WizardShell` | Step routing, progress bar, navigation guards | React component with step index state |
| `Step1AssetsForm` | Asset configuration input (DBs, servers, NAS, workstations) | react-hook-form controlled form |
| `Step2InfraForm` | Infrastructure config (tape libraries, SAN, engineers, network) | react-hook-form controlled form |
| `WizardContext` | Shared form state across all steps, simulation trigger | useReducer + Context |
| `SimulationService` | Thin bridge — serializes form state, dispatches to worker, receives results | Custom hook `useSimulation` |
| `MonteCarloWorker` | Trial generation for both Кибербакап and Конкурент scenarios | Web Worker (pure JS, no DOM) |
| `KDECalculator` | Bandwidth selection (Silverman's rule), density array computation | Pure function inside worker |
| `ResultsPage` | Orchestrates all result views | Container component |
| `DensityChart` | Overlaid KDE curves for both scenarios using recharts AreaChart | Presentational component |
| `MetricsPanel` | Best / median / worst time display for each scenario | Presentational component |
| `TimelineChart` | Per-asset-type recovery timeline | Presentational component |
| `ScenarioManager` | Save named scenario, load list, delete, trigger export | Feature component |
| `ExportService` | PNG via recharts-to-png + html2canvas; CSV from trial arrays | Utility module |
| `useLocalStorage` | Generic typed persistence hook | Custom hook |

## Recommended Project Structure

```
src/
├── components/
│   ├── wizard/
│   │   ├── WizardShell.tsx          # step routing, progress bar
│   │   ├── Step1AssetsForm.tsx      # asset configuration
│   │   ├── Step2InfraForm.tsx       # infra configuration
│   │   └── WizardContext.tsx        # useReducer + Context provider
│   ├── results/
│   │   ├── ResultsPage.tsx          # results orchestrator
│   │   ├── DensityChart.tsx         # KDE overlay chart (recharts)
│   │   ├── MetricsPanel.tsx         # best/median/worst cards
│   │   └── TimelineChart.tsx        # per-asset timeline
│   └── common/
│       ├── ProgressBar.tsx
│       └── LoadingOverlay.tsx       # shown while worker runs
├── workers/
│   └── monteCarlo.worker.ts         # Web Worker entry point
├── engine/
│   ├── monteCarlo.ts                # trial generation, pure functions
│   ├── kde.ts                       # KDE bandwidth + density array
│   ├── recovery.ts                  # recovery model (wave ordering, parallelism)
│   └── types.ts                     # shared simulation input/output types
├── services/
│   ├── scenarioStorage.ts           # serialize/deserialize scenarios to localStorage
│   └── exportService.ts             # PNG + CSV export
├── hooks/
│   ├── useSimulation.ts             # bridge to worker; returns { run, result, isRunning }
│   └── useLocalStorage.ts           # generic typed persistence
├── App.tsx
└── main.tsx
```

### Structure Rationale

- **`workers/`:** Isolated entry point for the Web Worker. Vite resolves it separately with `new Worker(new URL(..., import.meta.url), { type: 'module' })`. Keeping it outside `engine/` makes the boundary explicit.
- **`engine/`:** Pure TypeScript functions with no React or browser dependencies. These are imported by the worker. The same types are imported by the UI for type safety across the boundary.
- **`services/`:** Side-effecting utilities (localStorage, DOM capture) that don't belong in hooks or components.
- **`hooks/`:** React-lifecycle wrappers over services and workers. Components call hooks, not services directly.

## Architectural Patterns

### Pattern 1: Web Worker Isolation for Monte Carlo

**What:** The simulation engine runs entirely inside a Web Worker. The main thread serializes form state to a plain JSON message, posts it to the worker, and awaits results via `onmessage`. The worker returns computed trial arrays and KDE density points.

**When to use:** Any computation that blocks the UI for >50ms. At 10k–200k iterations the Monte Carlo engine easily exceeds 500ms on average hardware — the worker is mandatory, not optional.

**Trade-offs:** Worker cannot access DOM or React state. All inputs must be serializable. Progress updates require additional `postMessage` calls from inside the worker loop.

**Example:**
```typescript
// workers/monteCarlo.worker.ts
import { runSimulation } from '../engine/monteCarlo'

self.onmessage = (e: MessageEvent<SimulationInput>) => {
  const result = runSimulation(e.data)
  self.postMessage(result)
}

// hooks/useSimulation.ts
export function useSimulation() {
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/monteCarlo.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  const run = useCallback((input: SimulationInput): Promise<SimulationResult> => {
    return new Promise((resolve) => {
      workerRef.current!.onmessage = (e) => resolve(e.data)
      workerRef.current!.postMessage(input)
    })
  }, [])

  return { run }
}
```

### Pattern 2: useReducer + Context for Wizard State

**What:** A single `useReducer` at the top of the wizard holds all form state for both steps plus the simulation result. Context provides dispatch and state to child step components.

**When to use:** Multi-step forms where step components need read/write access to shared data. Prefer over Zustand because the state lifecycle is entirely contained within the wizard component subtree — no global store needed.

**Trade-offs:** Context re-renders all consumers on any state change. Acceptable here because the wizard is a focused flow with few concurrent consumers. If additional feature areas (outside the wizard) need wizard state, migrate to Zustand.

**Example:**
```typescript
// components/wizard/WizardContext.tsx
type WizardState = {
  step: 1 | 2 | 'results'
  assets: AssetsFormData
  infra: InfraFormData
  simulationResult: SimulationResult | null
}

type Action =
  | { type: 'SET_ASSETS'; payload: AssetsFormData }
  | { type: 'SET_INFRA'; payload: InfraFormData }
  | { type: 'SET_RESULT'; payload: SimulationResult }
  | { type: 'GO_TO_STEP'; payload: WizardState['step'] }

const WizardContext = createContext<{ state: WizardState; dispatch: Dispatch<Action> } | null>(null)
```

### Pattern 3: Scenario Persistence as Named JSON Blobs

**What:** Each saved scenario is a JSON-serialized snapshot of `WizardState` (excluding simulation result, which is re-computed on load). Stored under a namespaced key: `drp-calc:scenarios`.

**When to use:** Any time user inputs must survive page refreshes. localStorage handles the full scenario list with no backend.

**Trade-offs:** localStorage is synchronous and limited to ~5MB per origin. Scenario objects are small (<<1KB each); storing 100 scenarios is safe. Do NOT persist full trial arrays to localStorage — they are large and must be recomputed.

**Example:**
```typescript
// services/scenarioStorage.ts
const KEY = 'drp-calc:scenarios'

export function saveScenario(name: string, data: WizardFormData): void {
  const existing = loadAllScenarios()
  const updated = { ...existing, [name]: { ...data, savedAt: Date.now() } }
  localStorage.setItem(KEY, JSON.stringify(updated))
}
```

## Data Flow

### Wizard → Simulation → Results Pipeline

```
[User fills Step 1]
    ↓ dispatch SET_ASSETS
[WizardContext state updated]
    ↓
[User fills Step 2]
    ↓ dispatch SET_INFRA
[WizardContext state updated]
    ↓
[User clicks "Run Simulation"]
    ↓
[useSimulation.run(serialized WizardState)]
    ↓ postMessage
[Web Worker: runSimulation()]
  ├── simulate Кибербакап trials (10k-200k)
  ├── simulate Конкурент trials (10k-200k)
  ├── computeKDE(кибербакап trials)
  └── computeKDE(конкурент trials)
    ↓ postMessage results
[useSimulation receives SimulationResult]
    ↓ dispatch SET_RESULT
[WizardContext stores result]
    ↓ navigate to results
[ResultsPage reads result from context]
  ├── DensityChart renders KDE arrays via recharts AreaChart
  ├── MetricsPanel reads percentile values from result
  └── TimelineChart renders per-asset-type median timelines
```

### State Management

```
WizardContext (useReducer)
    ↓ (React Context)
Step1AssetsForm     Step2InfraForm     ResultsPage
    ↓ dispatch           ↓ dispatch         ↓ reads only
                    WizardContext state
```

### Key Data Flows

1. **Form → Worker:** `AssetsFormData + InfraFormData` serialized to `SimulationInput` (plain object, no class instances). Worker receives via `postMessage`.
2. **Worker → UI:** `SimulationResult` contains `{ кибербакапTrials: number[], конкурентTrials: number[], кибербакапKDE: KDEPoint[], конкурентKDE: KDEPoint[], percentiles: {...} }`. Returned via `postMessage`. Trial arrays are used for CSV export. KDE arrays feed recharts directly.
3. **UI → localStorage:** `WizardFormData` (input fields only, not simulation output) serialized on save. Deserialized on load, re-run triggers fresh simulation.
4. **Chart → PNG:** `recharts-to-png` wraps the `DensityChart` ref in a `useCurrentPng` hook. PNG blob is downloaded via an anchor element.
5. **Trials → CSV:** `SimulationResult.кибербакапTrials` and `конкурентTrials` are converted to CSV in `exportService.ts` and downloaded.

## Suggested Build Order

Build order follows data dependencies: you cannot build a chart without simulation output, and you cannot trigger simulation without form input.

| Phase | What to Build | Why First |
|-------|---------------|-----------|
| 1 | `engine/` (monteCarlo.ts, kde.ts, recovery.ts, types.ts) | Pure functions, zero dependencies, fully testable in isolation |
| 2 | `workers/monteCarlo.worker.ts` + `hooks/useSimulation.ts` | Validate worker boundary early; integration bugs are expensive to find late |
| 3 | `WizardContext` (state shape + reducer) | Form components depend on context; define the contract before the forms |
| 4 | `Step1AssetsForm` + `Step2InfraForm` | Inputs that feed the engine |
| 5 | `ResultsPage` + `DensityChart` + `MetricsPanel` | Consumes simulation output |
| 6 | `ScenarioManager` + `useLocalStorage` + `scenarioStorage.ts` | Persistence layer; can be added after core flow works |
| 7 | `exportService.ts` (PNG + CSV) | Last — depends on a working chart component |

## Scaling Considerations

This is a single-user desktop SPA. "Scaling" means handling larger simulation inputs and maintaining UI responsiveness, not user growth.

| Concern | At 10k trials | At 200k trials | Mitigation |
|---------|---------------|----------------|------------|
| Worker blocking | ~50ms | ~500ms+ | Show `LoadingOverlay` while worker runs; do not block UI |
| Memory (trial arrays) | ~80KB per scenario pair | ~1.6MB per scenario pair | Keep in memory during session; never persist to localStorage |
| KDE computation | Fast | May add 50-100ms | Run inside worker alongside trial generation |
| recharts rendering | Fast (<1000 points) | SVG may struggle if passing raw trials | Always pass KDE-smoothed density array (100-300 points) to recharts, never raw trials |
| localStorage quota | Negligible | Negligible | Input-only serialization keeps payloads tiny |

## Anti-Patterns

### Anti-Pattern 1: Running Monte Carlo on the Main Thread

**What people do:** Call the simulation function synchronously inside a click handler or useEffect.
**Why it's wrong:** At 10k+ iterations this freezes the browser tab for hundreds of milliseconds. The UI becomes unresponsive — no loading state, no progress updates, no cancel.
**Do this instead:** Always run simulation inside a Web Worker via `useSimulation`. Show a loading overlay while the worker is running.

### Anti-Pattern 2: Persisting Trial Arrays to localStorage

**What people do:** Serialize the full `SimulationResult` (including `trials: number[]`) to localStorage as part of the scenario.
**Why it's wrong:** 200k trials × 2 scenarios = ~3.2MB of floats. localStorage has a ~5MB limit per origin. One large scenario wipes out remaining storage.
**Do this instead:** Persist only `WizardFormData` (the user inputs). Re-run the simulation when a scenario is loaded. Simulation is fast enough (<1s) that this is imperceptible.

### Anti-Pattern 3: Passing Raw Trial Arrays to recharts

**What people do:** Map the `number[]` trial array directly into recharts `<AreaChart data={trials.map(v => ({ x: v, y: 1 }))}>`
**Why it's wrong:** 200k SVG path points will make the browser paint take seconds. The chart becomes illegible.
**Do this instead:** Always compute KDE density in the worker and pass the smoothed density array (100–300 points) to recharts. The KDE curve is what users need to see anyway.

### Anti-Pattern 4: Storing All Wizard State in a Single Top-Level useState

**What people do:** Put `step1Data`, `step2Data`, and `simulationResult` into one `useState` object at the App level.
**Why it's wrong:** Merging partial updates is error-prone (`setState(prev => ({ ...prev, step1: { ...prev.step1, field: value } })`). Makes action semantics invisible.
**Do this instead:** Use `useReducer` with explicit action types. The reducer centralizes all state transition logic in one place.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| React UI ↔ Web Worker | `postMessage` / `onmessage` (structured clone) | No Comlink needed for this use case — single function call with one input, one output |
| `engine/` ↔ `workers/` | Direct import | Worker imports pure functions from `engine/`; types shared |
| `WizardContext` ↔ Step forms | React Context + dispatch | Step forms call `dispatch`, never touch localStorage directly |
| `ResultsPage` ↔ `exportService` | Direct function call | `exportService.downloadPng(ref)` and `exportService.downloadCsv(trials)` |
| `ScenarioManager` ↔ `scenarioStorage` | Direct function call | `scenarioStorage.saveScenario(name, data)` |

### Note on Comlink

Comlink is a valid option for the worker bridge but adds a dependency for marginal benefit here. The simulation has exactly one input type and one output type — plain `postMessage` is simpler. Use Comlink only if the worker needs to expose multiple named functions (e.g., a separate progress callback alongside the main result).

## Sources

- [React + Web Workers: Handle Heavy Tasks Without Blocking the UI](https://medium.com/@ramankumawat119/react-web-workers-handle-heavy-tasks-without-blocking-the-ui-bb4c83788739) — MEDIUM confidence (community article, verified against Vite docs)
- [Web Workers, Comlink, Vite and TanStack Query — johnnyreilly.com](https://johnnyreilly.com/web-workers-comlink-vite-tanstack-query) — MEDIUM confidence (detailed implementation example)
- [Vite Features: Web Workers](https://vite.dev/guide/features) — HIGH confidence (official Vite documentation)
- [State Management in 2025: When to Use Context, Redux, Zustand — DEV Community](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k) — MEDIUM confidence
- [React State Management Trends 2025 — Makers' Den](https://makersden.io/blog/react-state-management-in-2025) — MEDIUM confidence (verified pattern recommendation)
- [recharts-to-png — npm](https://www.npmjs.com/package/recharts-to-png) — HIGH confidence (official npm package documentation)
- [web.dev: Use web workers to run JavaScript off the browser's main thread](https://web.dev/articles/off-main-thread) — HIGH confidence (Google web.dev, authoritative)

---
*Architecture research for: React SPA with Monte Carlo simulation engine and KDE visualization (DRP-Calc-2)*
*Researched: 2026-03-15*
