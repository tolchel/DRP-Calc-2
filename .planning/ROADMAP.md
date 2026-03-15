# Roadmap: Калькулятор восстановления

## Overview

Three phases delivering a working sales demo tool from scratch. Phase 1 validates the single-file distribution method and builds the pure simulation engine — the two riskiest bets — before any UI exists. Phase 2 builds the complete interactive user flow: wizard forms feeding the engine, results rendered to screen. Phase 3 locks in scenario persistence and export so salespeople can save, reload, and share outputs. Each phase ends with a runnable artifact.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation + Engine** - Validated single-file distribution and working Monte Carlo simulation engine with no UI (completed 2026-03-15)
- [x] **Phase 2: Wizard + Results** - Complete end-to-end user flow from asset/infra input through simulation to visualization (completed 2026-03-15)
- [ ] **Phase 3: Persistence + Polish** - Scenario save/load, export, and production demo hardening

## Phase Details

### Phase 1: Foundation + Engine
**Goal**: The project scaffolds, builds to a single distributable HTML file, and the Monte Carlo simulation engine produces correct output for both Кибербакап and Конкурент models
**Depends on**: Nothing (first phase)
**Requirements**: UX-03, SIM-01, SIM-02, SIM-03, SIM-04, SIM-05, SIM-06, SIM-07, SIM-08, SIM-09, SIM-10
**Success Criteria** (what must be TRUE):
  1. Double-clicking `dist/index.html` on Windows 11 loads the app in the browser with no console errors — no localhost server needed
  2. Running `npm run build` produces a single self-contained `index.html` file (no separate JS/CSS chunks alongside it)
  3. Calling the simulation engine with a valid input object returns a `SimulationResult` containing KDE arrays (200-300 points) and percentile metrics for both Кибербакап and Конкурент
  4. Running 200,000 trials does not freeze the browser UI — a progress indicator updates during simulation and the main thread remains responsive
  5. KDE arrays passed to the results layer contain at most 300 points regardless of trial count
**Plans**: 5 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold Vite + React + TS project; validate vite-plugin-singlefile single-file build (UX-03)
- [ ] 01-02-PLAN.md — Define all shared TypeScript types, constants, and failing test stubs (Nyquist Wave 0)
- [ ] 01-03-PLAN.md — TDD: Implement recovery arithmetic for Кибербакап and Конкурент scenarios
- [ ] 01-04-PLAN.md — TDD: Implement KDE module (Silverman bandwidth + Gaussian kernel)
- [ ] 01-05-PLAN.md — Wire simulation orchestrator, Web Worker wrapper, and browser smoke validation

### Phase 2: Wizard + Results
**Goal**: A salesperson can open the app, enter asset counts and infrastructure parameters across two steps, run the simulation, and see the density comparison chart with metrics
**Depends on**: Phase 1
**Requirements**: ASSET-01, ASSET-02, ASSET-03, ASSET-04, INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09, VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05, UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. User can fill in Step 1 (asset counts and volumes), advance to Step 2, navigate back without losing any entered values
  2. Step 2 accepts all infrastructure parameters — tape libraries (add/remove), storage array settings, IT engineer count, network speeds, uncertainty %, iteration count — with validation errors shown in Russian
  3. The "Next" button on Step 1 is disabled until at least one asset has a non-zero total volume
  4. After submitting Step 2, the results page shows overlaid KDE density curves for both scenarios with correct axis labels (hours on X, density on Y), vertical lines for best/worst, and hover tooltips
  5. The metrics panel displays best/median/worst case and the per-asset-type breakdown table for both scenarios
**Plans**: 5 plans

Plans:
- [ ] 02-01-PLAN.md — Install recharts + lucide-react; define WizardFormData types and defaults; build useSimulation hook
- [ ] 02-02-PLAN.md — Build Step 1 asset form: 4 cards with subtotals, blue grand-total footer, disabled Next guard
- [ ] 02-03-PLAN.md — Build Step 2 infrastructure form: library cards (add/remove), SAN/engineer/network/uncertainty/iterations fields
- [ ] 02-04-PLAN.md — Build ProgressBar component; rewrite App.tsx wizard shell with step routing and simulation trigger
- [ ] 02-05-PLAN.md — Build ResultsPage with two scenario panels (metric cards + KDE charts) and asset breakdown table; human verify

### Phase 3: Persistence + Polish
**Goal**: A salesperson can save a customer configuration by name, reload it in a future session, export the chart as PNG, and the tool survives edge cases that arise in live demos
**Depends on**: Phase 2
**Requirements**: SCEN-01, SCEN-02, SCEN-03, SCEN-04, SCEN-05
**Success Criteria** (what must be TRUE):
  1. User can save the current form inputs as a named scenario and see it appear in a list sorted by date
  2. User can click a saved scenario to restore all form values and re-run the simulation, with the results page updating to reflect the loaded configuration
  3. User can delete a scenario — a confirmation prompt appears before removal
  4. User can display two saved scenarios on the same density chart, with both KDE curves visible simultaneously
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — SavedScenario type + Wave 0 test stubs (RED)
- [ ] 03-02-PLAN.md — useScenarios localStorage CRUD hook
- [ ] 03-03-PLAN.md — ScenarioDrawer component + App.tsx integration
- [ ] 03-04-PLAN.md — ComparisonScreen (4-curve KDE) + ResultsPage save widget + human verify

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Engine | 5/5 | Complete   | 2026-03-15 |
| 2. Wizard + Results | 5/5 | Complete   | 2026-03-15 |
| 3. Persistence + Polish | 2/4 | In Progress|  |
