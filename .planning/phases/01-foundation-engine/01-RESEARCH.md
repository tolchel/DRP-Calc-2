# Phase 1: Foundation + Engine - Research

**Researched:** 2026-03-15
**Domain:** Vite + React + vite-plugin-singlefile scaffold; Web Worker Monte Carlo engine; KDE bandwidth
**Confidence:** MEDIUM-HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**IT Engineer Concurrency Model**
- Concurrent verifiers per shift = floor(N ÷ 3), where N = engineer count entered by user
- If N < 3, some shifts have zero engineers → 8-hour pause in verification during those shifts
- Minimum allowed input = 1 (0 is forbidden in the form)
- Verification is sequential: 1 engineer handles 1 object at a time
- Engineer begins verifying an object immediately after its data transfer completes — does not wait for the full wave
- Data transfer for the next wave runs in parallel with engineer verification of the current wave

**Startup Time After Recovery**
- Fixed 30 minutes for ALL asset types (БД, Сервер, ФС, РС) — no stochastic variation
- Hardcoded constant in the engine — not configurable via UI
- The uncertainty multiplier (SIM-07/SIM-08) applies to data transfer time, not startup time

**Simulation Pairing (Кибербакап vs Конкурент)**
- Both scenarios computed in one shared trial loop — same random draws per trial
- Shared stochastic factors: network speed variation (±20%) and engineer availability reduction
- Scenarios differ only in recovery logic (direct tape→objects vs two-phase tape→SAN→objects)
- This ensures fair comparison: the difference comes from logic, not random noise

**Progress Reporting**
- Worker posts progress every 5% completion (20 messages total per simulation run)
- Message format: `{ type: 'progress', percent: N }` where N is 0–100
- Single unified progress 0–100% covers both scenarios together (Кибербакап runs first 0–50%, Конкурент 50–100%)
- Final message: `{ type: 'result', data: SimulationResult }`

### Claude's Discretion
- Project folder structure (src/engine/, src/workers/, src/types/)
- KDE bandwidth selection (Sheather-Jones implementation details)
- TypeScript strict mode settings and tsconfig
- Vite config for vite-plugin-singlefile

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-03 | App builds to a single HTML file via vite-plugin-singlefile; opens by double-click on Windows 11 with no server | vite-plugin-singlefile v2.3.0 + Vite build config section covers this |
| SIM-01 | Monte Carlo runs in a Web Worker (non-blocking UI) | Vite `?worker&inline` syntax + postMessage pattern covers this |
| SIM-02 | Simulation computed separately for Кибербакап and Конкурент | Shared trial loop architecture with per-scenario accumulators |
| SIM-03 | Кибербакап: direct tape → objects (10 streams, total drive throughput, cap = fast net) | Engine arithmetic documented in architecture patterns |
| SIM-04 | Конкурент: two-phase tape → SAN → objects (total drives, cap = fast net; then SAN → objects, cap = LAN) | Engine arithmetic documented in architecture patterns |
| SIM-05 | Recovery priority order: БД → Серверы → ФС → РС | Asset priority list as ordered constant in engine |
| SIM-06 | Data distributed evenly across all tape libraries | Per-library data = total / libraryCount arithmetic |
| SIM-07 | Stochastic: engineer availability reduction, startup delays, network speed ±20% | Three independent uniform draws per trial; network factor = 1 + Uniform(-0.2, 0.2) |
| SIM-08 | Uncertainty multiplier applied as wave-level factor (one value per wave per trial) | One draw per wave from uncertainty distribution; applied to transfer time only |
| SIM-09 | Startup time: LOCKED as 30 min constant for all types | STARTUP_MINUTES = 30 hardcoded constant |
| SIM-10 | Progress indicator during simulation | Worker postMessage every 5%; React state update on main thread |
</phase_requirements>

---

## Summary

This phase establishes the full technical foundation for the DRP Calculator: a Vite + React + TypeScript project that builds to a single self-contained `dist/index.html`, plus a Monte Carlo simulation engine running in a Web Worker. No UI is built — only the scaffold, build pipeline, and engine logic.

The two most critical technical risks are (1) vite-plugin-singlefile compatibility with Web Workers (workers must be imported with `?worker&inline` to avoid emitting separate chunks that break the single-file contract), and (2) the Sheather-Jones KDE bandwidth, which has no native JavaScript implementation and must be hand-ported from the Botev 2010 algorithm. Both are well-understood and solvable — the patterns are documented below.

The simulation engine must be structured as a pure synchronous function (`runSimulation(input): SimulationResult`) wrapped by a thin Web Worker file. This separation enables Vitest unit testing of the engine without Worker complexity, while the worker layer handles progress reporting and non-blocking execution.

**Primary recommendation:** Scaffold first with `npm create vite@latest` (react-ts template), validate the single-file build with a trivial `<h1>` before writing any engine code, then build engine synchronously with full unit tests before wiring up the Worker.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite | 6.x (latest) | Build tool, dev server | Official React tooling default 2025 |
| react | 19.x | UI framework (placeholder in Phase 1) | Project decision |
| react-dom | 19.x | React DOM renderer | Paired with React |
| typescript | 5.x | Type safety | Project decision — strict mode |
| vite-plugin-singlefile | 2.3.0 | Inline all JS/CSS into dist/index.html | Only production-ready plugin for this use case |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 3.x | Unit testing | Engine tests (pure functions, no DOM needed) |
| @testing-library/react | 16.x | React component testing | Phase 2+ UI tests; install now for forward compatibility |
| @types/react | 19.x | TypeScript types for React | Required for TypeScript + React |
| @types/react-dom | 19.x | TypeScript types for React DOM | Required for TypeScript + React DOM |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vite-plugin-singlefile | Manual rollupOptions + assetsInlineLimit | Plugin handles edge cases; manual is fragile |
| ?worker&inline import | new Worker(new URL(..., import.meta.url)) | Standard syntax emits separate chunk; breaks single-file |
| Hand-ported Sheather-Jones KDE | Silverman/Scott NRD rule-of-thumb | SJ is more accurate for non-normal distributions; required by spec |
| Hand-ported Sheather-Jones KDE | fast-kde npm package | fast-kde uses NRD bandwidth only, not SJ |
| Vitest | Jest | Vitest shares Vite config; zero extra setup cost |

**Installation:**
```bash
npm create vite@latest drp-calc -- --template react-ts
cd drp-calc
npm install vite-plugin-singlefile
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

> Note: recharts (needed in Phase 2) may need `--legacy-peer-deps` with React 19. Do NOT install it in Phase 1 — validate compatibility at Phase 2 start.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── types/           # Shared TypeScript interfaces (SimulationInput, SimulationResult, etc.)
├── engine/          # Pure synchronous simulation functions (no Worker dependency)
│   ├── simulation.ts    # runSimulation(input): SimulationResult — main entry point
│   ├── recovery.ts      # per-scenario recovery time arithmetic
│   ├── kde.ts           # KDE computation + bandwidth selection
│   └── constants.ts     # STARTUP_MINUTES, ASSET_PRIORITY, etc.
├── workers/         # Worker wrapper only — thin shell around engine
│   └── simulation.worker.ts
├── App.tsx          # Placeholder in Phase 1 (can be <h1>)
└── main.tsx         # React entry point
```

### Pattern 1: Worker Import with Inline Query (CRITICAL for single-file build)
**What:** Import worker with `?worker&inline` so Vite bundles it as a base64 blob, not a separate file
**When to use:** Any time a Worker must survive the vite-plugin-singlefile build
**Example:**
```typescript
// src/App.tsx or wherever the worker is instantiated
// Source: https://vite.dev/guide/features#web-workers
import SimWorker from './workers/simulation.worker?worker&inline'

const worker = new SimWorker()
worker.postMessage({ type: 'run', data: simulationInput })
worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
  if (e.data.type === 'progress') setProgress(e.data.percent)
  if (e.data.type === 'result') setResult(e.data.data)
}
```

> WARNING: The standard `new Worker(new URL('./worker.ts', import.meta.url))` syntax emits a separate chunk file. In single-file builds this chunk is NOT inlined by vite-plugin-singlefile and the app will fail to load the worker when opened via `file://`. Use `?worker&inline` exclusively.

### Pattern 2: Engine as Pure Synchronous Function
**What:** Simulation logic lives in `src/engine/simulation.ts` as a regular exported function callable directly in tests — no Worker API dependency
**When to use:** Always — the Worker file is a thin wrapper that calls this function
**Example:**
```typescript
// src/engine/simulation.ts
export function runSimulation(input: SimulationInput): SimulationResult {
  const results: TrialResult[] = []
  const progressInterval = Math.floor(input.trials / 20) // every 5%

  for (let i = 0; i < input.trials; i++) {
    // shared random draws for both scenarios
    const networkFactor = 1 + (Math.random() - 0.5) * 0.4  // ±20%
    const uncertaintyFactor = 1 + Math.random() * input.uncertaintyPct
    const engineerFactor = Math.random()  // engineer availability reduction

    const kyberTime = computeKyberTime(input, networkFactor, uncertaintyFactor, engineerFactor)
    const konkurentTime = computeKonkurentTime(input, networkFactor, uncertaintyFactor, engineerFactor)
    results.push({ kyberTime, konkurentTime })

    // progress callback (only used when running in worker)
    if (onProgress && i % progressInterval === 0) {
      onProgress(Math.round((i / input.trials) * 100))
    }
  }
  return buildResult(results)
}
```

```typescript
// src/workers/simulation.worker.ts  — thin wrapper
import { runSimulation } from '../engine/simulation'

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  if (e.data.type === 'run') {
    const result = runSimulation(e.data.data, (percent) => {
      self.postMessage({ type: 'progress', percent } satisfies WorkerOutMessage)
    })
    self.postMessage({ type: 'result', data: result } satisfies WorkerOutMessage)
  }
}
```

### Pattern 3: Typed Worker Messages (discriminated union)
**What:** A discriminated union type ensures the main thread and worker never disagree on message shape
**When to use:** All postMessage calls — prevents runtime shape errors across the thread boundary
**Example:**
```typescript
// src/types/worker.ts
export type WorkerInMessage =
  | { type: 'run'; data: SimulationInput }

export type WorkerOutMessage =
  | { type: 'progress'; percent: number }
  | { type: 'result'; data: SimulationResult }
```

### Pattern 4: vite.config.ts for Single-File Build
**What:** Combine vite-plugin-singlefile with rollup options that prevent chunk splitting
**When to use:** Required to satisfy UX-03 and the double-click constraint
**Example:**
```typescript
// vite.config.ts
// Source: https://github.com/richardtallent/vite-plugin-singlefile (v2.3.0)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    // viteSingleFile's useRecommendedBuildConfig:true handles most of this,
    // but be explicit to prevent future breakage:
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    // Raise limit so all assets inline (default is 4KB which is too small)
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
  worker: {
    // Workers also need to be in a bundleable format
    format: 'es',
  },
})
```

### Pattern 5: KDE with Sheather-Jones Bandwidth (hand-port)
**What:** Compute a smooth KDE curve (≤300 points) from raw trial results using the Botev 2010 ISJ bandwidth
**When to use:** Required for VIZ-01 in Phase 2; the bandwidth function must be implemented in Phase 1 as part of the engine's `buildResult()` output
**Implementation approach:**

No JavaScript library implements Sheather-Jones/ISJ bandwidth. The algorithm must be hand-ported. The steps from the Botev et al. (2010) paper, implementable in ~80 lines of TypeScript:

1. Normalize data to [0,1] range
2. Compute the discrete cosine transform (DCT) of a histogram approximation
3. Apply the iterative fixed-point solver to find optimal bandwidth `t*`
4. Evaluate Gaussian kernel at the optimal bandwidth on a fixed grid
5. Inverse DCT to obtain the density values
6. Map x-axis back to original data range

The alternative (acceptable if SJ proves complex): **Silverman's rule of thumb** `h = 1.06 * σ * n^(-1/5)`. This is MEDIUM quality (assumes normality) but produces acceptable curves for unimodal recovery time distributions. The spec says "Sheather-Jones" — implement SJ, but flag Silverman as a documented fallback.

KDE output contract (max 300 points):
```typescript
export interface KDEPoint { x: number; density: number }

function computeKDE(samples: number[], maxPoints = 300): KDEPoint[] {
  // evaluate at min(maxPoints, samples.length) equidistant x values
  // bandwidth from SJ algorithm (or Silverman fallback)
  // return array of { x, density } pairs
}
```

### Anti-Patterns to Avoid
- **Standard Worker constructor with URL:** `new Worker(new URL('./worker.ts', import.meta.url))` — emits a separate chunk not inlined by vite-plugin-singlefile; breaks `file://` loading
- **Putting Worker API calls in engine functions:** Engine (`simulation.ts`) must be callable without any Worker context; never call `self.postMessage` inside engine files
- **Passing raw trial arrays across Worker boundary:** 200,000 float pairs = ~3.2MB transfer; always post `SimulationResult` (KDE arrays + percentiles) not raw trial data
- **Dynamic imports in worker:** `import()` inside a worker conflicts with `?worker&inline` inlining; use static imports only
- **Storing SimulationResult in localStorage:** Trial arrays would exceed the 5MB quota; only store `SimulationInput` (Phase 3 concern, but shape it correctly now)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Inlining assets into HTML | Custom rollup plugin | vite-plugin-singlefile 2.3.0 | Handles CSS, JS, worker chunks, fonts; 6,100+ dependents |
| Test runner | Jest config from scratch | Vitest (shares vite.config.ts) | Zero-config with Vite projects; same transform pipeline |
| Worker type safety | Runtime type checks | Discriminated union types + `satisfies` | Compile-time guarantee; zero runtime cost |

**Key insight:** The only thing that must be hand-rolled in this phase is the Sheather-Jones KDE bandwidth, because no JavaScript library implements it. Everything else has a well-maintained solution.

---

## Common Pitfalls

### Pitfall 1: Worker Emitting as Separate Chunk (Single-File Breakage)
**What goes wrong:** Using `new Worker(new URL('./worker.ts', import.meta.url))` syntax (Vite's recommended standard approach) causes the worker to be emitted as a separate `.js` chunk alongside `index.html`. vite-plugin-singlefile does not inline worker chunks. The app fails silently when opened via `file://` because the browser cannot resolve the relative worker URL.
**Why it happens:** vite-plugin-singlefile inlines the main bundle and CSS, but separate worker chunks are a Vite build artifact it cannot intercept.
**How to avoid:** Always use `import SimWorker from './simulation.worker?worker&inline'`. The `inline` query bakes the worker as a base64 Blob URL directly into the main bundle.
**Warning signs:** `dist/` directory contains files other than `index.html` after build. Run `ls dist/` as a build verification step.

### Pitfall 2: UI Freeze at High Trial Count
**What goes wrong:** Posting 200,000 progress messages (one per trial) blocks the Worker's own event loop and saturates the main thread's message queue.
**Why it happens:** postMessage is not free — each message crosses the thread boundary with serialization cost.
**How to avoid:** Post exactly 20 progress messages (every 5% = every `trials / 20` iterations). The locked decision specifies this exactly. Never post more frequently.
**Warning signs:** CPU profiler shows main thread >90% during simulation; UI renders more than 20 progress updates for a 10,000-trial run.

### Pitfall 3: recharts Peer Dependency Conflict with React 19
**What goes wrong:** `npm install recharts` fails or emits peer dependency errors because recharts declares a peer dependency on React 16/17/18.
**Why it happens:** recharts has not fully updated its peer deps for React 19 as of early 2026.
**How to avoid:** Do NOT install recharts in Phase 1. Validate at Phase 2 start with `npm install recharts --legacy-peer-deps`. A newer recharts release may resolve this — check changelog at Phase 2.
**Warning signs:** npm exits with `ERESOLVE unable to resolve dependency tree`.

### Pitfall 4: TypeScript `lib` Missing `WebWorker` Types
**What goes wrong:** `self.postMessage` inside the worker file shows TypeScript error: "Property 'postMessage' does not exist on type 'Window & typeof globalThis'".
**Why it happens:** The default `tsconfig.app.json` targets the DOM lib, not the Worker lib.
**How to avoid:** Create a `tsconfig.worker.json` that extends the main config but sets `"lib": ["ES2020", "WebWorker"]`. Or use `/// <reference lib="webworker" />` at the top of the worker file.
**Warning signs:** Red squiggles on `self.postMessage` in any `.worker.ts` file.

### Pitfall 5: KDE x-axis in Wrong Units
**What goes wrong:** KDE x-axis shows values in seconds or minutes when the chart expects hours.
**Why it happens:** Engine internally accumulates time in minutes or seconds for arithmetic convenience, but `SimulationResult.kde` must expose hours for the results chart.
**How to avoid:** Define the unit contract in `SimulationResult` types explicitly (`x: number // hours`), convert at the `buildResult()` boundary in the engine, never in the chart component.
**Warning signs:** KDE peaks appear at x=480 instead of x=8 for an 8-hour recovery scenario.

---

## Code Examples

Verified patterns from official sources:

### Vite Worker with Inline Query
```typescript
// Source: https://vite.dev/guide/features#web-workers
// ?worker&inline — inlines as base64; no separate file emitted
import SimWorker from './workers/simulation.worker?worker&inline'

export function useSimulationWorker() {
  const workerRef = useRef<InstanceType<typeof SimWorker> | null>(null)

  const run = useCallback((input: SimulationInput, onProgress: (p: number) => void) => {
    workerRef.current?.terminate()
    const worker = new SimWorker()
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      if (e.data.type === 'progress') onProgress(e.data.percent)
      if (e.data.type === 'result') {
        // handle result
        worker.terminate()
      }
    }
    worker.postMessage({ type: 'run', data: input } satisfies WorkerInMessage)
  }, [])

  return { run }
}
```

### SimulationInput and SimulationResult Types
```typescript
// src/types/simulation.ts
export interface TapeLibrary {
  driveCount: number          // ≥ 1
  driveThroughputMBs: number  // default 300
}

export interface SimulationInput {
  assets: AssetGroup[]
  tapeLibraries: TapeLibrary[]
  san: { maxSpeedGBs: number; streamCount: number; streamSpeedMBs: number }
  fastNetworkGbps: number     // Скоростная сеть
  lanGbps: number             // ЛВС
  engineerCount: number       // N, minimum 1
  uncertaintyPct: number      // 0–1 (0.15 = 15%)
  trials: number              // 10_000–200_000
}

export interface AssetGroup {
  type: 'db' | 'server' | 'fs' | 'ws'
  count: number
  avgSizeGB: number
}

export interface KDEPoint {
  x: number       // recovery time in HOURS
  density: number // probability density
}

export interface ScenarioResult {
  kde: KDEPoint[]          // 200–300 points
  p10: number              // 10th percentile, hours
  p50: number              // median, hours
  p90: number              // 90th percentile, hours
  min: number              // best case, hours
  max: number              // worst case, hours
}

export interface SimulationResult {
  kyberbackup: ScenarioResult
  competitor: ScenarioResult
}
```

### Vitest Config (co-located in vite.config.ts)
```typescript
// vite.config.ts — add test block
// Source: https://vitest.dev/config/
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  test: {
    environment: 'node',  // engine tests are pure; no DOM needed
    globals: true,
    include: ['src/**/*.test.ts'],
  },
  // ... build config as above
})
```

### Engineer Concurrency Formula
```typescript
// src/engine/constants.ts
export const STARTUP_MINUTES = 30   // fixed for ALL asset types — do not make configurable
export const ASSET_PRIORITY = ['db', 'server', 'fs', 'ws'] as const

// src/engine/recovery.ts
export function verifiersPerShift(engineerCount: number): number {
  return Math.floor(engineerCount / 3)  // locked decision
}

// If verifiersPerShift(N) === 0, the shift has NO verification capacity
// → add 8 hours (480 minutes) to recovery time for that asset group
```

### Silverman Bandwidth Fallback (if SJ proves intractable)
```typescript
// src/engine/kde.ts
function silvermanBandwidth(data: number[]): number {
  const n = data.length
  const mean = data.reduce((a, b) => a + b, 0) / n
  const variance = data.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)
  const stdDev = Math.sqrt(variance)
  // IQR-based adjustment for robustness
  const sorted = [...data].sort((a, b) => a - b)
  const iqr = sorted[Math.floor(0.75 * n)] - sorted[Math.floor(0.25 * n)]
  const s = Math.min(stdDev, iqr / 1.34)
  return 1.06 * s * Math.pow(n, -0.2)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `new Worker(new URL(...))` for Vite workers | `?worker&inline` import for single-file builds | Vite 3+ | Standard syntax emits separate chunk; inline query needed for file:// constraint |
| vite-plugin-singlefile v1.x | v2.3.0 (July 2025) — `removeViteModuleLoader` option added | v2.0 (2024) | Cleaner output; `useRecommendedBuildConfig` still defaults true |
| `worker.rollupOptions` | `worker.rolldownOptions` (Vite 6 migrated to Rolldown) | Vite 6 (2025) | `rollupOptions` deprecated but still works; prefer `rolldownOptions` |
| React 18 | React 19 — `useRef()` always requires argument, `JSX` namespace removed | React 19 (2024) | `useRef<T>(null)` not `useRef<T>()` |

**Deprecated/outdated:**
- `worker.rollupOptions`: Use `worker.rolldownOptions` in Vite 6+
- `createRoot` from `react-dom` (React 18+) replaced `ReactDOM.render` — already the standard; do not use old API

---

## Open Questions

1. **Sheather-Jones bandwidth complexity**
   - What we know: No JavaScript library implements ISJ. The Botev 2010 algorithm requires a DCT-based fixed-point solver. Several Python/MATLAB implementations exist that can be ported.
   - What's unclear: Exact implementation effort. The DCT portion requires a type-2 DCT which can be approximated or computed via FFT-style approach.
   - Recommendation: Allocate a dedicated task for the KDE bandwidth function with a Silverman fallback. If the SJ port takes >3 hours, ship Silverman for Phase 1 (accurate enough for engine validation), schedule SJ as a Phase 2 refinement. Document the choice.

2. **recharts + React 19 peer dependency**
   - What we know: recharts declares peers for React 16/17/18. React 19 was released late 2024.
   - What's unclear: Whether recharts has released a React 19-compatible version by the time Phase 2 begins.
   - Recommendation: Check `npm info recharts peerDependencies` at Phase 2 start. If unresolved, use `--legacy-peer-deps`. Do not block Phase 1 on this.

3. **Worker inline size limit**
   - What we know: `?worker&inline` encodes the worker as base64 inside the HTML. A 200k-iteration engine with KDE math could produce a large worker bundle.
   - What's unclear: Whether the inlined base64 worker size causes browser issues (memory or parse time) when opening from file://.
   - Recommendation: Run a build + file-size check as part of UX-03 validation. If `index.html` exceeds ~10MB, profile for tree-shaking opportunities.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vite.config.ts` (test block) — see Wave 0 |
| Quick run command | `npx vitest run src/engine` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-03 | `dist/` contains only `index.html` after build | smoke | `npm run build && [ $(ls dist/ | wc -l) -eq 1 ]` | ❌ Wave 0 (shell check) |
| SIM-01 | Worker exists and responds with progress + result messages | integration | Manual smoke in browser | ❌ Wave 0 |
| SIM-02 | `runSimulation()` returns both `kyberbackup` and `competitor` fields | unit | `npx vitest run src/engine/simulation.test.ts` | ❌ Wave 0 |
| SIM-03 | Кибербакап time = correct arithmetic for given input | unit | `npx vitest run src/engine/simulation.test.ts` | ❌ Wave 0 |
| SIM-04 | Конкурент time = correct arithmetic for given input | unit | `npx vitest run src/engine/simulation.test.ts` | ❌ Wave 0 |
| SIM-05 | Asset priority order enforced (БД processed before Серверы, etc.) | unit | `npx vitest run src/engine/recovery.test.ts` | ❌ Wave 0 |
| SIM-06 | Per-library data = totalData / libraryCount | unit | `npx vitest run src/engine/recovery.test.ts` | ❌ Wave 0 |
| SIM-07 | Network factor stays within [0.8, 1.2] across 1000 trials | unit | `npx vitest run src/engine/simulation.test.ts` | ❌ Wave 0 |
| SIM-08 | Uncertainty applied to transfer time, not startup time | unit | `npx vitest run src/engine/recovery.test.ts` | ❌ Wave 0 |
| SIM-09 | Startup time = 30 min exactly for all asset types | unit | `npx vitest run src/engine/constants.test.ts` | ❌ Wave 0 |
| SIM-10 | Progress callback fires exactly 20 times per run (5% intervals) | unit | `npx vitest run src/engine/simulation.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/engine`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + `ls dist/ | wc -l` equals 1 before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/engine/simulation.test.ts` — covers SIM-02, SIM-03, SIM-04, SIM-07, SIM-10
- [ ] `src/engine/recovery.test.ts` — covers SIM-05, SIM-06, SIM-08
- [ ] `src/engine/constants.test.ts` — covers SIM-09
- [ ] `vite.config.ts` test block — framework install: `npm install -D vitest`
- [ ] Build smoke check: `npm run build && ls dist/` (verify single file) — covers UX-03

---

## Sources

### Primary (HIGH confidence)
- https://vite.dev/guide/features#web-workers — Worker import syntax, `?worker&inline` query
- https://vite.dev/config/worker-options — `worker.format`, `worker.rolldownOptions`
- https://github.com/richardtallent/vite-plugin-singlefile (v2.3.0, July 2025) — Plugin API, `useRecommendedBuildConfig`, `removeViteModuleLoader`
- https://vitest.dev/config/ — Vitest configuration options

### Secondary (MEDIUM confidence)
- https://vite.dev/config/build-options — `assetsInlineLimit`, `cssCodeSplit`, `rollupOptions` (verified against official docs)
- https://kdepy.readthedocs.io/en/latest/bandwidth.html — ISJ algorithm description (official Python library docs, used to characterize port effort)
- https://arxiv.org/abs/1011.2602 — Botev et al. 2010 original paper (primary algorithmic reference for SJ/ISJ KDE)

### Tertiary (LOW confidence — flag for validation)
- WebSearch result: recharts peer dependency issue with React 19 — needs verification at Phase 2 start with `npm info recharts peerDependencies`
- WebSearch result: `inlineDynamicImports: true` needed in rollupOptions alongside vite-plugin-singlefile — verify in actual build

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm/official docs (vite-plugin-singlefile 2.3.0, Vite 6, React 19)
- Architecture: HIGH — Worker inline pattern from official Vite docs; engine/worker separation is standard pattern
- KDE/bandwidth: MEDIUM — SJ algorithm understood conceptually; JS port effort is estimated, not verified
- Pitfalls: MEDIUM — Worker chunk separation pitfall confirmed via official docs + plugin README; recharts peer dep is WebSearch-only

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable stack; vite-plugin-singlefile and recharts peer dep status may shift sooner)
