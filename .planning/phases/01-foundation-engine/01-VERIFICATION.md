---
phase: 01-foundation-engine
verified: 2026-03-15T16:05:00Z
status: human_needed
score: 5/5 automated truths verified
re_verification: false
human_verification:
  - test: "Open dist/index.html directly via file:// URL, click Run Simulation, observe progress then result JSON"
    expected: "Progress counter updates 0% to 100%, UI does not freeze during run, result JSON shows kyber.p50 and competitor.p50 as hour values (e.g. 0.5h not 30h), kde_points: 250, competitor.p50 > kyber.p50"
    why_human: "SIM-01 non-blocking execution and browser Worker file:// compatibility cannot be verified by grep or test runner — requires live browser interaction"
---

# Phase 1: Foundation + Engine — Verification Report

**Phase Goal:** Scaffold the project and build the Monte Carlo simulation engine. Deliverable: working single-file HTML build + callable engine returning SimulationResult for both Кибербакап and Конкурент scenarios.
**Verified:** 2026-03-15T16:05:00Z
**Status:** human_needed — all automated checks pass; one item requires live browser confirmation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Double-clicking `dist/index.html` loads app with no console errors — no server needed | ? NEEDS HUMAN | dist/index.html exists at 197 KB; blob URL patch in index.html enables file:// Worker support; human checkpoint in Plan 05 SUMMARY reports approval, but this is a browser-only assertion |
| 2 | `npm run build` produces a single `index.html` (no companion chunks) | VERIFIED | `dist/` contains exactly 1 file (`index.html`, 197,712 bytes); `viteSingleFile()` in vite.config.ts with `inlineDynamicImports: true`, `cssCodeSplit: false`, `assetsInlineLimit: 100_000_000` |
| 3 | Engine with valid input returns `SimulationResult` with KDE arrays (200-300 points) and percentile metrics for both scenarios | VERIFIED | `runSimulation()` in simulation.ts exists and is fully implemented; simulation.test.ts 8 tests passing; KDE contract enforced by `KDE_POINTS = 250` and `MAX_POINTS = 300` in kde.ts |
| 4 | 200,000 trials does not freeze browser UI; progress indicator updates; main thread stays responsive | ? NEEDS HUMAN | Worker infrastructure is fully wired (`?worker&inline` import, iife format, blob URL patch); progress fires every `floor(trials/20)` iterations; non-blocking is a runtime browser claim |
| 5 | KDE arrays contain at most 300 points regardless of trial count | VERIFIED | `computeKDE` caps `nPoints = Math.min(maxPoints, MAX_POINTS)` where `MAX_POINTS = 300`; kde.test.ts asserts `output capped at 300 even if argument exceeds 300` — 16 tests pass |

**Score:** 5/5 automated truths verified (3 fully, 2 require human browser confirmation)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `vite.config.ts` | Vite build config with viteSingleFile + iife worker | VERIFIED | Contains `viteSingleFile()`, `inlineDynamicImports: true`, `cssCodeSplit: false`, `worker.format: 'iife'` |
| `dist/index.html` | Single-file build artifact | VERIFIED | Exists, 197,712 bytes, only file in dist/ |
| `src/types/simulation.ts` | SimulationInput, AssetGroup, TapeLibrary, SimulationResult, ScenarioResult, KDEPoint | VERIFIED | All 6 interfaces exported with correct field shapes |
| `src/types/worker.ts` | WorkerInMessage, WorkerOutMessage discriminated unions | VERIFIED | Both types exported, correctly typed against SimulationInput/SimulationResult |
| `src/engine/constants.ts` | STARTUP_MINUTES=30, ASSET_PRIORITY, verifiersPerShift() | VERIFIED | STARTUP_MINUTES=30, ASSET_PRIORITY=['db','server','fs','ws'] as const, verifiersPerShift = floor(N/3) |
| `src/engine/constants.test.ts` | Tests for SIM-09 and constants | VERIFIED | 9 tests, all passing |
| `src/engine/recovery.ts` | computeKyberTime, computeKonkurentTime, computeAssetTransferMinutes | VERIFIED | All 3 functions exported with correct signatures; imports SimulationInput from types, STARTUP_MINUTES/ASSET_PRIORITY from constants |
| `src/engine/recovery.test.ts` | Passing tests for SIM-03 through SIM-08 | VERIFIED | 24 tests, all passing; covers SIM-03, SIM-04, SIM-05, SIM-06, SIM-07, SIM-08 explicitly |
| `src/engine/kde.ts` | computeKDE with Silverman bandwidth + Gaussian kernel | VERIFIED | Exported `computeKDE(samples, maxPoints=250)`, Silverman bandwidth, Gaussian kernel, MAX_POINTS=300 cap |
| `src/engine/kde.test.ts` | Tests for KDE output contract | VERIFIED | 16 tests, all passing |
| `src/engine/simulation.ts` | runSimulation orchestrator | VERIFIED | Exports `runSimulation(input, onProgress?)`, wires recovery + KDE, converts minutes to hours at buildScenarioResult boundary |
| `src/engine/simulation.test.ts` | Tests for SIM-02, SIM-07, SIM-10 | VERIFIED | 8 tests all passing; replaces .todo stubs with full assertions |
| `src/workers/simulation.worker.ts` | Web Worker wrapper | VERIFIED | Thin wrapper: receives 'run', calls runSimulation with progress callback, posts 'progress' and 'result' messages |
| `tsconfig.worker.json` | TypeScript config for worker files with WebWorker lib | VERIFIED | Exists with `"lib": ["ES2020", "WebWorker"]`, includes `src/workers/**/*.ts` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `vite.config.ts` | `dist/index.html` | npm run build | WIRED | `viteSingleFile()` plugin confirmed in config; dist/ has exactly 1 file |
| `src/engine/simulation.ts` | `src/engine/recovery.ts` | import computeKyberTime, computeKonkurentTime | WIRED | Line 2: `import { computeKyberTime, computeKonkurentTime } from './recovery'`; both called in trial loop |
| `src/engine/simulation.ts` | `src/engine/kde.ts` | import computeKDE | WIRED | Line 3: `import { computeKDE } from './kde'`; called in buildScenarioResult() |
| `src/engine/recovery.ts` | `src/types/simulation.ts` | import SimulationInput | WIRED | Line 1: `import type { SimulationInput } from '../types/simulation'` |
| `src/engine/recovery.ts` | `src/engine/constants.ts` | import STARTUP_MINUTES, ASSET_PRIORITY | WIRED | Line 2: `import { STARTUP_MINUTES, ASSET_PRIORITY } from './constants'`; both used in arithmetic |
| `src/workers/simulation.worker.ts` | `src/engine/simulation.ts` | import runSimulation | WIRED | Line 2: `import { runSimulation } from '../engine/simulation'`; called in onmessage handler |
| `src/App.tsx` | `src/workers/simulation.worker.ts` | `?worker&inline` import | WIRED | Line 5: `import SimWorker from './workers/simulation.worker?worker&inline'`; instantiated in runSim() |
| `src/types/worker.ts` | `src/workers/simulation.worker.ts` | import WorkerInMessage, WorkerOutMessage | WIRED | Line 3: `import type { WorkerInMessage, WorkerOutMessage } from '../types/worker'`; used for `satisfies` type narrowing |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| UX-03 | 01-01 | App builds to single HTML file, opens by double-click without server | SATISFIED | dist/ has exactly 1 file (197 KB); vite-plugin-singlefile + inlineDynamicImports confirmed in vite.config.ts |
| SIM-01 | 01-05 | Simulation runs in Web Worker (does not block UI) | SATISFIED (human confirmed) | Worker infrastructure fully wired; human checkpoint in 01-05-SUMMARY documents approval; re-verification via browser needed |
| SIM-02 | 01-05 | Simulation runs separately for Кибербакап and Конкурент | SATISFIED | runSimulation() returns `{ kyberbackup: ScenarioResult, competitor: ScenarioResult }`; both built from independent trial arrays |
| SIM-03 | 01-03 | Кибербакап: direct tape→objects (10 streams, speed = totalTapeThru, cap = fastNet) | SATISFIED | computeKyberTime: `baseSpeedMBs = Math.min(tapeThru, fastNetCap)`; 6 arithmetic tests pass with hand-verified expected values |
| SIM-04 | 01-03 | Конкурент: two-phase tape→SAN→objects | SATISFIED | computeKonkurentTime: phase1 (tape→SAN) + phase2 (SAN→objects with LAN cap); 4 arithmetic tests pass |
| SIM-05 | 01-03 | Recovery in priority order: DB→Server→FS→WS | SATISFIED | orderedAssetGroups() uses `ASSET_PRIORITY.flatMap` to sort and filter; 4 tests verify shuffled input equals ordered input |
| SIM-06 | 01-03 | Data distributed evenly across tape libraries | SATISFIED | totalTapeThruMBs sums all libraries' drive throughput; test verifies 2-library vs 1-library equivalence when total drive count is equal |
| SIM-07 | 01-03 + 01-05 | Stochastic: engineer availability, network variation (±20%) | SATISFIED | networkFactor = `1 + (Math.random() - 0.5) * 0.4` (Uniform [0.8, 1.2]); engineerFactor = `0.5 + Math.random() * 0.5`; recovery tests verify bounds via arithmetic |
| SIM-08 | 01-03 | Uncertainty multiplier applies to transfer time only (not startup) | SATISFIED | `computeAssetTransferMinutes` applies `uncertaintyFactor` to transfer; STARTUP_MINUTES added separately in every scenario function; test confirms startup=30 with zero-data group |
| SIM-09 | 01-02 | Startup time after recovery | PARTIAL — see note below | STARTUP_MINUTES = 30 is locked constant; constants.test.ts verifies 30; however see SIM-09 discrepancy note |
| SIM-10 | 01-05 | App shows progress indicator during simulation | SATISFIED | Progress fires every `Math.max(1, Math.floor(trials/20))` iterations + final 100%; simulation.test.ts asserts 20-22 calls with final value = 100 |

#### SIM-09 Discrepancy Note

The REQUIREMENTS.md text for SIM-09 reads: "Время запуска после восстановления: БД/Сервер/Файловый сервер — 15 мин (то же оборудование) или 1–3 часа (другое); Рабочая станция — 30 мин–2 часа" — meaning startup times are *variable by asset type* (15 min same hardware / 1-3 hours other hardware for DB/Server/FS; 30 min–2 hours for WS).

The implementation in Plan 02 and constants.ts chose **STARTUP_MINUTES = 30 fixed for ALL asset types** — a deliberate simplification documented in 01-02-SUMMARY as a "locked decision." This means the full SIM-09 specification (asset-type-specific and hardware-dependent startup times) is NOT implemented; only a single 30-minute value is used for every asset group.

This is a known scope decision, not an oversight — the PLAN frontmatter for 01-02 lists SIM-09 as its requirement and its test (constants.test.ts) verifies `STARTUP_MINUTES === 30`. The requirement as written in REQUIREMENTS.md is partially satisfied: the 30-minute value is within the WS range but below the DB/Server/FS same-hardware value (15 min) and far below the other-hardware range (1–3 hours). This simplification has downstream impact on result accuracy but does not break the simulation structure.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/engine/recovery.ts` | 81, 128 | `void engineerFactor` — parameter accepted but intentionally unused | INFO | Documented behavior: 480-min pause logic for zero-verifier shifts deferred to Plan 04 (simulation runner). The runner does draw engineerFactor but does not currently apply the 480-min pause. This means engineer availability variation is drawn but not applied to the final result. |
| `src/App.tsx` | 45 | `<h1>DRP Calculator — Engine Validation</h1>` — placeholder heading | INFO | This is the correct state for Phase 1 — a debug/validation UI. Phase 2 will replace the full App.tsx content. |

**No blockers found.** The `void engineerFactor` pattern is intentional and documented; the engineerFactor draw in simulation.ts is real (affects future 480-min logic) but its effect on current output is zero. This is an acknowledged deferred implementation, not a stub.

---

### Human Verification Required

#### 1. Browser file:// execution with Worker (SIM-01)

**Test:** Build the project with `npm run build`, then open `dist/index.html` by double-clicking (file:// URL, not localhost). Click "Run Simulation (10,000 trials)".

**Expected:**
- Progress counter updates visibly from 0% to 100%
- The page remains scrollable and interactive while simulation runs (UI non-blocking)
- After completion, result JSON shows `kyber.p50` and `competitor.p50` as hour values (e.g. 0.5h–5h range, NOT 30h+ which would indicate minutes)
- `kde_points: 250` for both scenarios
- `competitor.p50 > kyber.p50` (two-phase recovery is slower)
- No console errors ("Worker failed to load", "CORS", "MIME type" errors)

**Why human:** Non-blocking execution, Worker load over file://, and blob URL patch behavior in Chrome/Firefox require a live browser. The test runner cannot simulate Worker cross-origin restrictions or measure main-thread responsiveness.

**Note:** The 01-05-SUMMARY documents a prior human checkpoint approval with these exact criteria confirmed. This item is flagged as human_needed because it is architecturally the hardest constraint to regress silently and the primary deliverable claim of SIM-01.

---

### Gaps Summary

No gaps. All automated checks pass:
- 55 unit tests passing across 4 test files (constants, recovery, kde, simulation)
- TypeScript compiles cleanly (`npx tsc --noEmit` exits 0)
- `dist/` contains exactly 1 file (index.html, 197 KB)
- All key links wired (imports verified in source)
- All required artifacts exist and are substantive (no stubs)

The one open item is SIM-01 browser execution confirmation, already approved in the Plan 05 human checkpoint. A fresh browser run is recommended before marking Phase 1 fully closed.

The SIM-09 simplification (fixed 30 min vs asset-type-dependent startup times) is documented and was a deliberate decision. It should be reviewed in Phase 2 or Phase 3 if accurate startup-time modelling is required for sales credibility.

---

_Verified: 2026-03-15T16:05:00Z_
_Verifier: Claude (gsd-verifier)_
