---
name: gsd:help
description: Project orientation for DRP Calculator 2 — current state, commands, architecture, and what to work on next.
---

# DRP Calculator 2 — Project Help

Read this file, then reply with a concise orientation summary covering: current status, the most important open work, and the key commands needed to get going. Keep the reply under 200 words.

## What This Project Is

A sales demo tool for Кибербакап (Cyberbackup). A salesperson enters a customer's IT infrastructure parameters; the app runs a Monte Carlo simulation and shows a side-by-side comparison of recovery times for two scenarios — **Кибербакап** (direct tape → assets) vs **Конкурент** (two-phase tape → SAN → assets). Кибербакап always wins.

Deployed as a single `dist/index.html` — no server, opens via `file://` on Windows 11.

## Dev Commands

```bash
npm install          # first time
npm run dev          # dev server (Vite 7 — do NOT upgrade to Vite 8)
npm run build        # produces dist/index.html (~600 KB, self-contained)
npm run test         # Vitest; 63 tests, all must pass
npx tsc -b --noEmit  # type-check without building
```

## Current Status

**Milestone v1.0 complete.** All three phases shipped:

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation + Engine (Monte Carlo, Web Worker, KDE) | ✅ Done |
| 2 | Wizard + Results (3-step form, KDE charts, metrics) | ✅ Done |
| 3 | Persistence + Polish (localStorage, scenario save/load/compare) | ✅ Done |

63 tests pass, 0 TypeScript errors.

## Known Open Issues (from DRP_calc2.md)

### Critical Bugs
1. **`uncertaintyPct` not applied** — `src/engine/recovery.ts` passes hardcoded `1.0` instead of `1 + Uniform(0, uncertaintyPct)`.
2. **Wrong metric card labels** — "Вероятность лучшего" shows p10 (not probability); "Среднее значение" shows p50 (not mean). Fix in `src/components/ResultsPage.tsx`.

### Model Improvements
3. Pipeline overlap (transfer + verification run concurrently in reality — model currently over-estimates)
4. Per-asset-type `STARTUP_MINUTES` (currently 30 min flat for all types)

### UX
5. KDE x-axis tick formatter doesn't apply `formatHours` when values > 100 h — fix `tickFormatter` in `src/components/ResultsPage.tsx`.

## Key Architecture Facts

- **Everything in hours** — engine does all math in hours; `STARTUP_MINUTES=30` is converted at use.
- **Web Worker** — Monte Carlo runs in `src/workers/simulation.worker.ts` off the UI thread.
- **Vite 7 only** — `vite-plugin-singlefile` incompatible with Vite 8. This is a permanent constraint.
- **No backend** — `localStorage` only for scenario persistence.
- **Fair comparison** — both scenarios share the same `networkFactor` and `engineerFactor` random draws per trial.
- **Recovery order** — fixed: БД → Серверы → Файловые хранилища → Рабочие станции.

## File Map

```
src/engine/
  constants.ts      ASSET_PRIORITY, STARTUP_MINUTES, network defaults
  recovery.ts       Transfer-time arithmetic for Кибербакап and Конкурент
  simulation.ts     Monte Carlo orchestrator
  kde.ts            Silverman bandwidth + Gaussian kernel

src/workers/
  simulation.worker.ts  Web Worker entry — runs simulation, posts progress

src/hooks/
  useSimulation.ts   Worker lifecycle (run / cancel / progress / result)
  useScenarios.ts    localStorage CRUD for saved scenarios

src/components/
  ResultsPage.tsx         KDE charts + metric cards + breakdown table
  ComparisonScreen.tsx    Overlay up to 4 saved scenarios
  ScenarioDrawer.tsx      Animated side panel for scenario management
  steps/Step1Assets.tsx
  steps/Step2Infrastructure.tsx

src/types/
  simulation.ts     SimulationInput, ScenarioResult, KDEPoint
  wizard.ts         WizardFormData, wizardToSimInput
  scenario.ts       SavedScenario

.planning/          GSD planning artefacts (phases, plans, research)
DRP_calc2.md        Full TZ + design decisions + open issues log
```

## Planning System

Plans live in `.planning/phases/<phase>/`. `STATE.md` tracks the current position. `PROJECT.md` holds the project brief and key decisions table. When starting new work, read `STATE.md` first to know where to resume.
