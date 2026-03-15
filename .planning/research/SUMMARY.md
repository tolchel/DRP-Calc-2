# Project Research Summary

**Project:** Калькулятор восстановления (DRP-Calc-2)
**Domain:** Local React SPA — Monte Carlo disaster recovery simulator + sales demo tool
**Researched:** 2026-03-15
**Confidence:** MEDIUM-HIGH

## Executive Summary

DRP-Calc-2 is a client-side-only React SPA that a Russian-speaking sales team uses to demonstrate Кибербакап's recovery time advantage over a generic competitor during customer meetings. The tool takes asset and infrastructure parameters across a two-step wizard form, runs a Monte Carlo simulation (10k–200k trials) for two competing recovery models, and presents the results as overlaid KDE density curves plus headline best/median/worst metrics. All data stays in the browser — no server, no auth, no deployment surface — and the built `dist/` folder is distributed directly to salespeople running Windows 11.

The recommended approach is a focused React 19 + Vite 8 + TypeScript 5 SPA with recharts for visualization and a Web Worker for all simulation math. The architecture has a clear computation boundary: pure TypeScript simulation and KDE functions run inside the worker, React components consume pre-processed arrays of 200–300 KDE points, and localStorage holds only input parameters (never raw trial arrays). This stack is well-established, the patterns are documented, and the key libraries (recharts, comlink, html-to-image, papaparse) are maintained and compatible. One deployment-specific risk — Vite's ES module output failing over `file://` protocol — must be addressed before any feature work begins by adding `vite-plugin-singlefile` to the build.

The top risks are all preventable if the build order follows data dependencies: validate the `file://` distribution method first, define the simulation math (including the shared-wave uncertainty multiplier for correlated variables) before touching UI, and enforce the KDE data contract (never raw trials to recharts) before building the visualization layer. None of the pitfalls require exotic knowledge — they are well-documented failure modes with straightforward mitigations. The Monte Carlo + two-product comparison chart combination is a genuine differentiator; no publicly available DR calculator combines probabilistic output with local save/load.

---

## Key Findings

### Recommended Stack

The stack is a lean, purpose-fit set of well-maintained libraries with minimal configuration overhead. Vite 8 with the `react-ts` template scaffolds everything in one command. Tailwind CSS v4 integrates as a Vite plugin with no config files. No state management library is needed — `useReducer` + Context handles the two-step wizard scope, and `usehooks-ts` provides a typed `useLocalStorage` hook for scenario persistence. The one deliberate dependency addition beyond the obvious is `comlink` for the Web Worker RPC layer, which makes multi-function worker interfaces clean if the simulation needs to expose separate methods (e.g., a progress callback alongside the main result).

See `.planning/research/STACK.md` for full version compatibility matrix and installation commands.

**Core technologies:**
- React 19 + TypeScript 5 + Vite 8: SPA foundation — scaffolded in one command, React Compiler removes manual memoization overhead relevant for simulation-heavy re-renders
- recharts 3.8.x: KDE density charts and timeline views — fixed by project spec; use `ComposedChart` with two `Area` series fed pre-computed KDE arrays, never raw trials
- comlink 4.4.2: Web Worker RPC layer — wraps `postMessage` in async/await, use with Vite's native Worker URL pattern (no plugin needed)
- Tailwind CSS 4.x: Utility styling via Vite plugin — fits the white/grey minimalist spec with zero config files
- html-to-image ~1.11.x: PNG chart export — preferred over html2canvas for SVG-heavy recharts output
- papaparse 5.x: CSV export of trial data — raw library sufficient (no React wrapper needed for export-only use)
- usehooks-ts 3.x: Typed `useLocalStorage` hook — eliminates persistence boilerplate
- lucide-react 0.577.x: Icon set — always import named icons, never the barrel
- vite-plugin-singlefile: Single-file build output — mandatory for `file://` distribution on Windows 11

**What not to use:** Next.js/Remix (server overhead), Redux/Zustand (overkill scope), D3 directly (conflicts with recharts' virtual DOM), IndexedDB (overkill vs localStorage for <5KB scenario objects), `recharts-to-png` (known incompatibility with recharts v3).

### Expected Features

The tool has a clear MVP definition with two subsequent tiers. All P1 features are required for the core sales motion to work. P2 features address demo quality-of-life issues that will surface quickly in real use. P3 features require a backend investment not justified until v1 validates the concept.

See `.planning/research/FEATURES.md` for full feature dependency graph and competitor analysis.

**Must have — table stakes (v1 launch):**
- Two-step wizard form (Step 1: assets — DB/servers/file storage/workstations count + volume; Step 2: infrastructure — tape libraries, storage arrays, IT engineers, network params, uncertainty %)
- Progress bar between wizard steps
- Monte Carlo simulation engine for both Кибербакап and Конкурент models (default 50k trials)
- KDE density distribution chart with both scenarios overlaid (recharts, distinct colors)
- Best / Median / Worst case metrics panel (P5/P50/P95)
- Asset-type recovery timeline view (Gantt-style, priority order)
- Save and load named scenarios via localStorage
- Export chart as PNG
- Russian-language UI throughout
- Input validation with clear error states

**Should have — differentiators (v1.x after validation):**
- CSV export of trial data
- Uncertainty adjustment slider with live simulation re-run
- Real-time simulation progress feedback (percentage counter)
- IT engineer shift model (full parallelism calculation)

**Defer (v2+):**
- Backend persistence / scenario sync across devices — requires server, not justified for v1
- Workstation full modeling (bootable USB, imaging speed) — explicitly out of scope per PROJECT.md
- Financial cost overlay in rubles/dollars — risks diluting the recovery-time focus message

**Anti-features to avoid:** mobile/tablet optimization (desktop-first per spec), real-time collaborative editing (no server), animated/video export (high cost, low sales value).

### Architecture Approach

The architecture has one clean layering principle: pure computation is completely isolated from the React lifecycle. The `engine/` directory holds pure TypeScript functions (monteCarlo.ts, kde.ts, recovery.ts) with no browser or React dependencies — they are imported by the Web Worker, and their types are shared with the UI layer. The Web Worker is the only path simulation results travel from computation to UI; the main thread never runs the simulation loop. React state is managed with `useReducer` + Context scoped to the wizard subtree. Persistence is a thin service layer (`scenarioStorage.ts`) that serializes only form inputs to localStorage, never simulation output.

See `.planning/research/ARCHITECTURE.md` for full component diagram, data flow pipeline, and code examples.

**Major components:**
1. `WizardShell` + `WizardContext` (useReducer) — step routing, progress bar, shared form state across both steps
2. `Step1AssetsForm` + `Step2InfraForm` — data collection; unified form schema defined upfront to enable sessionStorage auto-save against back-button data loss
3. `MonteCarloWorker` + `KDECalculator` (in `engine/`) — pure simulation functions running in the Web Worker; returns KDE density arrays (200–300 points) and trial percentiles
4. `useSimulation` hook — thin bridge: serializes WizardState, dispatches to worker via postMessage/comlink, receives `SimulationResult`
5. `ResultsPage` with `DensityChart`, `MetricsPanel`, `TimelineChart` — consumes pre-computed KDE arrays; chart components wrapped in React.memo
6. `ScenarioManager` + `scenarioStorage.ts` — named save/load from localStorage; save schema stores only inputs, not trial arrays
7. `exportService.ts` — PNG via html-to-image targeting chart container div; CSV via papaparse from trial arrays

**Suggested build order (from ARCHITECTURE.md):** engine/ first → worker bridge → WizardContext schema → forms → results/charts → scenario persistence → export. This order ensures each phase has a runnable artifact before proceeding.

### Critical Pitfalls

Eight pitfalls identified; six are critical. Listed in priority order for prevention:

1. **Vite `file://` CORS blank page** — add `vite-plugin-singlefile` during project scaffolding, before writing any feature code. Validate by double-clicking `dist/index.html` on Windows. Recovery after the fact costs half a day and can break asset loading.

2. **UI thread blocking during simulation** — Web Worker is mandatory from day one, not a later optimization. 10k+ trials on the main thread freezes the demo. Use Vite's native `new Worker(new URL(..., import.meta.url), { type: 'module' })` pattern with comlink wrapping.

3. **Independent variable assumption in simulation math** — define the shared wave-level uncertainty multiplier before writing any trial generation code. Each trial samples one `waveUncertaintyMultiplier` for the entire wave, then each asset is perturbed around it. Retrofitting this after the simulation is written costs 1–2 days of math re-work and re-validation.

4. **Raw trial data passed to recharts** — enforce the KDE data contract (`trials → KDE(300 points) → recharts`) at the boundary between worker and UI. Never pass a `number[]` of length >1000 to any recharts `data` prop. Browser crash at 50k+ trials; recovery requires refactoring the entire simulation-to-chart data path.

5. **localStorage quota exceeded by raw trial storage** — save schema stores only `WizardFormData` (inputs), not `SimulationResult` (trials). Always wrap `localStorage.setItem` in try/catch surfacing a Russian-language error message. Define the save schema before writing any persistence code.

6. **Multi-step form data loss on back navigation** — use sessionStorage auto-save on every field change (distinct from named-scenario localStorage). Define a unified `WizardFormData` type covering both steps before building individual step components.

Additional pitfalls: wrong KDE bandwidth (use configurable constant, validate against bimodal distribution); React stale closure in Worker callback (use `useRef` for values read inside `onmessage` handlers).

---

## Implications for Roadmap

Based on research, the architecture's build order and pitfall prevention windows together dictate a clear 6-phase structure. The key constraint is that no phase can safely be skipped: charts require simulation output, simulation requires both form steps, and the distribution method must be validated before any of it is built.

### Phase 1: Project Foundation and Distribution Validation

**Rationale:** The `file://` CORS failure (Pitfall 6) is distribution-critical and invisible in development. If discovered after features are built, it can break asset loading when adding `vite-plugin-singlefile`. Validate first, before any code depends on the build output.

**Delivers:** Scaffolded project (Vite 8, React 19, TypeScript 5, Tailwind 4, lucide-react), `vite-plugin-singlefile` configured, confirmed that double-clicking `dist/index.html` on Windows loads without console errors. ESLint + react-hooks plugin configured.

**Addresses:** Distribution requirement (local `dist/` folder, no server).

**Avoids:** Pitfall 6 (file:// CORS blank page).

**Research flag:** Standard patterns — no research phase needed.

---

### Phase 2: Simulation Engine (Pure Functions + Web Worker)

**Rationale:** All downstream features (forms, charts, export) depend on simulation output. Building the engine first in `engine/` as pure TypeScript functions enables isolated testing before any UI exists. The Web Worker boundary must be established early — the correlated-variable math (Pitfall 4) is very expensive to retrofit after the simulation is wired to the UI.

**Delivers:** `engine/monteCarlo.ts` (trial generation for both Кибербакап and Конкурент models with shared wave uncertainty multiplier), `engine/kde.ts` (Silverman bandwidth + KDE density array), `engine/recovery.ts` (wave ordering + parallelism), `engine/types.ts` (shared `SimulationInput` / `SimulationResult` types), `workers/monteCarlo.worker.ts`, `hooks/useSimulation.ts` (worker bridge). Verified with 200k trials: no UI freeze, KDE output is 200–300 points.

**Uses:** comlink 4.4.2, Vite native Worker URL pattern.

**Implements:** Web Worker isolation pattern, KDE pre-computation pipeline.

**Avoids:** Pitfall 1 (UI thread blocking), Pitfall 3 (raw trials to recharts), Pitfall 4 (independent variable assumption).

**Research flag:** May benefit from `/gsd:research-phase` for the IT engineer shift parallelism model — the concurrency math for multi-engineer wave verification is not fully specified in PROJECT.md.

---

### Phase 3: Wizard Forms and State Management

**Rationale:** Forms feed the engine; no simulation can run without both steps complete. The `WizardContext` schema must be defined before individual step components so the unified `WizardFormData` type can drive sessionStorage auto-save (Pitfall 8) from the start.

**Delivers:** `WizardContext.tsx` (useReducer + Context, step routing), `Step1AssetsForm.tsx` (DB/servers/file storage/workstations count + avg volume), `Step2InfraForm.tsx` (tape libraries, storage arrays, IT engineers, network params, uncertainty %), `ProgressBar.tsx`, sessionStorage auto-save on field change. Input validation with Russian error messages.

**Implements:** useReducer + Context pattern for wizard state.

**Avoids:** Pitfall 8 (form data loss on back navigation).

**Research flag:** Standard patterns — no research phase needed.

---

### Phase 4: Results Visualization

**Rationale:** `ResultsPage` and its chart components are downstream of both the simulation engine and the forms. This phase consumes the `SimulationResult` type established in Phase 2. The KDE data contract (300-point arrays only) must be enforced here.

**Delivers:** `ResultsPage.tsx`, `DensityChart.tsx` (recharts `ComposedChart` with two `Area` series on a shared x-axis domain), `MetricsPanel.tsx` (P5/P50/P95 best/median/worst cards), `TimelineChart.tsx` (per-asset-type recovery timeline), `LoadingOverlay.tsx`. X-axis auto-formatted as hours/days. Both chart series share a merged x-axis domain so neither distribution is clipped.

**Uses:** recharts 3.8.x.

**Avoids:** Pitfall 2 (wrong KDE bandwidth — validate against bimodal distributions in this phase), Pitfall 3 (raw trials to recharts — enforced at the recharts data prop).

**Research flag:** KDE bandwidth tuning warrants visual validation against at least three distribution shapes (wide, narrow, bimodal) before this phase is considered done. No external research needed — internal validation task.

---

### Phase 5: Scenario Persistence and Export

**Rationale:** Scenario save/load and export are independent of each other but both depend on a working simulation + results flow. Building them after the core flow is exercised prevents the common mistake of baking raw trial arrays into the save schema.

**Delivers:** `services/scenarioStorage.ts` (save/load/delete named scenarios; stores WizardFormData only, never SimulationResult; try/catch with Russian quota error), `ScenarioManager.tsx` (scenario list UI, load triggers re-simulation), `services/exportService.ts` (PNG via html-to-image targeting chart container ref; CSV via papaparse with UTF-8 BOM for Windows Excel compatibility and Russian headers). Export buttons wired to ResultsPage.

**Uses:** usehooks-ts 3.x (`useLocalStorage`), html-to-image ~1.11.x, papaparse 5.x.

**Avoids:** Pitfall 5 (localStorage quota exceeded by raw trial storage).

**Research flag:** Standard patterns — no research phase needed.

---

### Phase 6: Polish and Demo Hardening

**Rationale:** After the core flow works end-to-end in Phases 1–5, this phase addresses UX quality items that matter for a live demo but don't block functional correctness. These are the items most likely to surface when the tool is tested against real demo scenarios.

**Delivers:** Real-time simulation progress indicator (percentage from Worker messages + cancel button that calls `worker.terminate()`), uncertainty slider with live re-run, simulation progress indicator for trial counts above 50k, viewport warning banner for small screens, scenario name prompt on save (no auto-timestamp names), tooltip/help text for uncertainty factor in Russian. Final Windows 11 acceptance test: 200k trials, back button, cancel button, file:// load, CSV opens in Excel.

**Addresses:** P2 features from FEATURES.md (uncertainty slider, simulation progress feedback).

**Avoids:** Pitfall 7 (stale closures in Worker callbacks — cancel button wires to `worker.terminate()`, progress state uses refs).

**Research flag:** Standard patterns — no research phase needed.

---

### Phase Ordering Rationale

- **Foundation before features:** `file://` distribution validation in Phase 1 prevents a late-stage deployment surprise with no easy recovery path.
- **Engine before UI:** Pure engine functions in Phase 2 can be tested in isolation; wiring the worker boundary early exposes integration bugs (Vite Worker URL syntax, comlink types) when the cost to fix them is lowest.
- **Forms before results:** Forms define the `WizardFormData` schema that the save/load system serializes; building forms before persistence ensures the schema is stable before it is persisted.
- **Core flow before polish:** Phase 6 items (uncertainty slider, progress indicator) are explicitly P2 in FEATURES.md — the tool is usable without them; adding them before the core is hardened wastes effort if any Phase 2–5 component requires redesign.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Simulation Engine):** The IT engineer shift concurrency model (how engineer count drives parallel wave-verification tasks) is not fully specified in the available research. The formula for concurrency reduction based on headcount needs definition before the recovery.ts model is written.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** vite-plugin-singlefile is documented and straightforward; Vite + React + Tailwind v4 scaffolding is well-covered.
- **Phase 3 (Wizard Forms):** useReducer + Context for multi-step wizard is a well-documented pattern with no domain-specific complexity.
- **Phase 4 (Visualization):** recharts ComposedChart with two Area series is documented; the only validation step is visual KDE tuning against real distribution shapes.
- **Phase 5 (Persistence + Export):** localStorage and html-to-image patterns are standard; the only gotcha (UTF-8 BOM for Excel) is called out explicitly in PITFALLS.md.
- **Phase 6 (Polish):** All items are refinements of existing functionality.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core libraries verified against official docs and npm; recharts React 19 peer dep requires `--legacy-peer-deps` flag (documented). Export tooling (html-to-image) is MEDIUM — community consensus, not an official benchmark. |
| Features | MEDIUM | Domain is specialized (DR sales tooling); feature set validated by comparing against Datto, Iternal, Braver, BSC Designer tools. Exhaustive coverage of all commercial DR calculators not claimed. Core MVP definition is HIGH confidence — directly derived from PROJECT.md spec. |
| Architecture | HIGH | Patterns verified against Vite official docs (Worker URL syntax), web.dev (off-main-thread), and multiple implementation examples. Component boundaries are idiomatic React; no exotic patterns. |
| Pitfalls | HIGH | Most pitfalls verified via official GitHub issues (recharts, Vite), MDN, and well-known React patterns. Recovery cost estimates are approximate. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **IT engineer shift concurrency formula:** The research describes the general structure (engineer count drives concurrency of asset-verification tasks) but does not specify the exact formula. This needs definition during Phase 2 planning — either derive from the PROJECT.md spec or treat as a configurable constant with a documented assumption.

- **Workstation recovery simplification:** Workstations are explicitly "temporarily not counted" per PROJECT.md. The simulation needs a placeholder model (contribute to timeline count but use simplified/fixed recovery time) with a tooltip explaining the simplification. The exact simplification approach was not specified in research.

- **recharts React 19 peer dep:** `npm install recharts --legacy-peer-deps` is required. This is a known, documented issue but should be verified at project setup — if recharts releases a React 19-compatible version before build starts, the flag may not be needed.

- **KDE bandwidth for bimodal distributions:** Research recommends ISJ (Improved Sheather-Jones) over Silverman's rule for skewed/bimodal distributions but does not provide a ready-to-use JavaScript implementation. Silverman's rule is acceptable for MVP if the bandwidth constant is configurable; the gap is whether the MVP bandwidth produces acceptable visual output for extreme parameter combinations. Validate during Phase 4.

---

## Sources

### Primary (HIGH confidence)
- React 19 blog: https://react.dev/blog/2024/12/05/react-19 — stable release, automatic memoization
- Vite Features — Web Workers: https://vite.dev/guide/features — native Worker URL syntax
- Tailwind CSS v4 blog: https://tailwindcss.com/blog/tailwindcss-v4 — Vite plugin setup
- recharts v3 migration guide: https://github.com/recharts/recharts/wiki/3.0-migration-guide — breaking changes
- comlink GitHub (Google Chrome Labs) — version 4.4.2, async Worker RPC
- usehooks-ts docs: https://usehooks-ts.com/react-hook/use-local-storage — typed localStorage hook
- web.dev off-main-thread: https://web.dev/articles/off-main-thread — Web Worker rationale
- MDN Storage quotas and eviction: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- recharts issues #1146, #1465, #1167 — SVG performance, large data, two-series axis alignment

### Secondary (MEDIUM confidence)
- Datto RTO Calculator, Iternal DR Calculator, Braver Technology, BSC Designer — competitor feature analysis
- html-to-image vs html2canvas: https://medium.com/better-programming/... — SVG export preference
- Vite file:// discussion #7587 — CORS limitation confirmation
- React stale closure: https://dmitripavlutin.com/react-hooks-stale-closures/ — Worker callback pattern
- Correlated variables in Monte Carlo: https://towardsdatascience.com/correlated-variables-in-monte-carlo-simulations — shared multiplier pattern
- KDE bandwidth: https://aakinshin.net/posts/kde-bw/ — ISJ vs Silverman comparison
- NN/g Wizard UI guidelines — multi-step form UX

### Tertiary (LOW confidence / inference)
- ISJ bandwidth selector: not implemented; research confirmed it is more accurate for non-normal data but no JS implementation was validated. Treat as a v1.x improvement target.

---

*Research completed: 2026-03-15*
*Ready for roadmap: yes*
