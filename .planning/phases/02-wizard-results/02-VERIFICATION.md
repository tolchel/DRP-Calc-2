---
phase: 02-wizard-results
verified: 2026-03-15T16:00:00Z
status: gaps_found
score: 20/21 must-haves verified
re_verification: false
gaps:
  - truth: "Asset breakdown table shows base time and average-from-trials per asset type"
    status: failed
    reason: "VIZ-04 requires 'базовое время, среднее из триалов' (base time, average from trials) per asset type. The implemented table shows input data (count, avgSizeGB, total GB) rather than simulation timing per asset type. ScenarioResult has no per-asset-type time fields — the engine does not emit them, so the data is structurally absent."
    artifacts:
      - path: "src/components/ResultsPage.tsx"
        issue: "Asset breakdown table columns are Тип системы / Количество / Объём на актив (ГБ) / Общий объём (ГБ). No time columns present."
      - path: "src/types/simulation.ts"
        issue: "ScenarioResult exports p10, p50, p90, min, max, kde — all aggregate, no per-asset breakdown. The engine type contract cannot supply per-asset timing to the Results page."
    missing:
      - "ScenarioResult needs per-asset breakdown field (e.g. assetBreakdown: { type: string; baseTimeH: number; avgTrialTimeH: number }[]) if this data is required"
      - "Alternatively, the requirement text can be officially re-scoped: treat VIZ-04 as 'input breakdown table (counts + volumes)' and update REQUIREMENTS.md accordingly"
human_verification:
  - test: "Verify KDE density charts render correctly with tooltips"
    expected: "Two side-by-side charts (blue Кибербакап, purple Конкурент) render KDE curves. Hovering any point shows 'Время: X.XXч' and 'Плотность: X.XXXX'. Green dashed 'Лучший' and red dashed 'Худший' vertical lines appear."
    why_human: "recharts rendering depends on browser layout engine; cannot be verified by grep or tsc."
  - test: "Verify Кибербакап p50 is visually lower than Конкурент p50"
    expected: "The Кибербакап curve peaks at a lower X-axis (hours) value than the Конкурент curve — demonstrating the tool's core sales proposition."
    why_human: "Requires running the simulation and observing rendered chart output."
  - test: "Verify back-navigation preserves form state"
    expected: "Entering values in Step 1, advancing to Step 2, clicking '← Назад' returns to Step 1 with all asset values intact."
    why_human: "React state preservation requires browser interaction to confirm."
---

# Phase 2: Wizard + Results Verification Report

**Phase Goal:** Build the complete 3-step wizard UI and Results page — users can enter assets and infrastructure data, run a Monte Carlo simulation, and see a dual-scenario results page with KDE density charts and metric cards.
**Verified:** 2026-03-15T16:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | recharts and lucide-react are importable without peer-dep errors | VERIFIED | package.json has recharts@^3.8.0, lucide-react@^0.577.0 in dependencies; tsc exits 0 |
| 2 | WizardFormData captures all fields from Step 1 and Step 2 | VERIFIED | src/types/wizard.ts exports WizardFormData with assets, libraries, san, engineerCount, fastNetworkGbps, lanGbps, uncertaintyPct, trials |
| 3 | useSimulation hook manages worker lifecycle, progress, and result state | VERIFIED | src/hooks/useSimulation.ts: run/cancel/progress/result/isRunning exported; imports simulation.worker?worker&inline; worker terminated on unmount |
| 4 | User sees four asset cards with count, avgSizeGB, per-card subtotal | VERIFIED | Step1Assets.tsx: maps over ASSET_KEYS db/server/fs/ws; computes subtotals; renders "Общий объём: X.X ГБ" per card |
| 5 | Blue footer shows grand total in GB and TB | VERIFIED | Step1Assets.tsx line 121: bg-blue-600 div shows totalGB.toFixed(2) and totalTB.toFixed(2) |
| 6 | Next button disabled when total volume is zero | VERIFIED | Step1Assets.tsx line 54: isNextDisabled = totalGB === 0; button has disabled={isNextDisabled} and opacity-50 cursor-not-allowed |
| 7 | Summary box shows total volume and per-library volume | VERIFIED | Step2Infrastructure.tsx line 51–57: "Общий объём данных: X ГБ" and "Объём на библиотеку: X ГБ" (perLibraryGB = totalVolumeGB / libraryCount) |
| 8 | First library cannot be deleted; additional libraries have delete button | VERIFIED | Step2Infrastructure.tsx line 73: {index > 0 && <X button>} — first library has no delete control |
| 9 | Add Library button appends new LibraryConfig | VERIFIED | Step2Infrastructure.tsx line 120–127: dashed-border button calls addLibrary(); generates id=lib-${Date.now()}, name=Библиотека N+1 |
| 10 | All infrastructure parameter fields present with correct defaults and validation | VERIFIED | SAN (3 fields), engineer count, fastNetworkGbps, lanGbps, uncertaintyPct (0–100), trials (10k–200k) all present with correct min/max/step attributes |
| 11 | Russian inline validation errors for drive count and iteration bounds | VERIFIED | Line 99: "Количество драйвов должно быть ≥ 1"; line 239: "Введите значение от 10 000 до 200 000" |
| 12 | 3-step progress bar at top with active/completed/pending states | VERIFIED | ProgressBar.tsx: STEPS array with Активы/Инфраструктура/Результаты; Check icon for completed; bg-blue-600 for active; bg-gray-100 for pending |
| 13 | App.tsx holds single WizardFormData state and routes steps correctly | VERIFIED | App.tsx: useState<WizardFormData>(DEFAULT_WIZARD_DATA); currentStep 1/2/3 conditional render; useSimulation() destructured |
| 14 | Submitting Step 2 triggers simulation and advances to Step 3 | VERIFIED | App.tsx line 43: onNext={() => { run(formData); setCurrentStep(3) }} |
| 15 | Back from Step 2 returns to Step 1 (values preserved — single state owner) | VERIFIED | App.tsx onBack={() => setCurrentStep(1)}; formData never reset on back navigation |
| 16 | Two scenario panels: Кибербакап (left) and Конкурент (right) | VERIFIED | ResultsPage.tsx: grid grid-cols-2 gap-6; ScenarioPanel with title="Кибербакап"/text-blue-700 and title="Конкурент"/text-purple-700 |
| 17 | Each panel shows 4 metric cards: Лучший/Худший/Вероятность лучшего/Среднее | VERIFIED | ScenarioPanel metricCards array: min(green), max(red), p10(blue), p50(purple); all rendered with formatHours() |
| 18 | Each panel has recharts KDE chart with X-axis in hours and dashed lines for best/worst | VERIFIED | ComposedChart with dataKey="x" tickFormatter Xч; ReferenceLine x={scenario.min} green dashed; ReferenceLine x={scenario.max} red dashed |
| 19 | Hovering chart shows time value and density at cursor | VERIFIED | Tooltip with labelFormatter "Время: Xч" and formatter "Плотность" — wired to recharts Tooltip component |
| 20 | Back button returns to Step 2 with form values intact | VERIFIED | ResultsPage onBack prop calls () => setCurrentStep(2); formData state unchanged |
| 21 | Asset breakdown table shows timing data per asset type (base time, avg from trials) | FAILED | Table shows input data (count, volume) only. No per-asset timing. ScenarioResult has no per-asset fields. VIZ-04 requirement partially re-interpreted in Plan 05. |

**Score:** 20/21 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/wizard.ts` | WizardFormData, LibraryConfig, SanConfig, DEFAULT_WIZARD_DATA, wizardToSimInput | VERIFIED | All exports present; wizardToSimInput correctly divides uncertaintyPct by 100 (line 98) |
| `src/hooks/useSimulation.ts` | Worker lifecycle hook: run, cancel, progress, result, isRunning | VERIFIED | Full implementation; ?worker&inline import present; cleanup useEffect present |
| `src/components/steps/Step1Assets.tsx` | 4 asset cards + blue footer + disabled Next | VERIFIED | Named export Step1Assets; default export also present; 143 lines of substantive implementation |
| `src/components/steps/Step2Infrastructure.tsx` | Infrastructure form with library management | VERIFIED | Named export Step2Infrastructure; all 9 INFRA fields; library add/delete/edit; Russian validation |
| `src/components/ProgressBar.tsx` | 3-step progress bar with active/completed/pending | VERIFIED | Default export ProgressBar; 74 lines; lucide-react Check icon for completed steps |
| `src/App.tsx` | Root: WizardFormData state, step routing, simulation orchestration | VERIFIED | 79 lines; single formData state; useSimulation; renders Step1/Step2/ResultsPage/progress by step |
| `src/components/ResultsPage.tsx` | Dual scenario panels + KDE charts + asset table + back button | PARTIAL | Component is complete and wired; KDE charts present; asset table present but shows input data not timing data (VIZ-04 gap) |
| `dist/index.html` | Single-file build, no chunk files | VERIFIED | Only index.html in dist/ (566 kB); UX-03 single-file constraint preserved |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/hooks/useSimulation.ts | src/workers/simulation.worker.ts | ?worker&inline import | VERIFIED | Line 5: `import SimWorker from '../workers/simulation.worker?worker&inline'` |
| src/hooks/useSimulation.ts | src/types/wizard.ts | wizardToSimInput mapping | VERIFIED | Line 6: `import { wizardToSimInput }` — called in run() before postMessage |
| src/App.tsx | src/hooks/useSimulation.ts | useSimulation() hook destructure | VERIFIED | Line 4: `import { useSimulation }`, line 13: `const { run, progress, result, isRunning } = useSimulation()` |
| src/App.tsx | src/components/steps/Step1Assets.tsx | currentStep===1 conditional render | VERIFIED | Line 30–35: `{currentStep === 1 && <Step1Assets ...>}` |
| src/App.tsx | src/components/steps/Step2Infrastructure.tsx | currentStep===2 conditional render | VERIFIED | Line 37–44: `{currentStep === 2 && <Step2Infrastructure ...>}` — named import corrected from Plan 05 |
| src/App.tsx | src/components/ResultsPage.tsx | replaces ResultsPlaceholder when currentStep===3 | VERIFIED | Line 58–63: `result ? <ResultsPage ...>` — ResultsPlaceholder fully removed |
| src/components/ResultsPage.tsx | recharts | ComposedChart with KDEPoint[] data | VERIFIED | Line 1–10: named imports from 'recharts'; ComposedChart with data={scenario.kde} |
| src/components/ResultsPage.tsx | src/engine/constants.ts | ASSET_PRIORITY for table row order | VERIFIED | Line 13: `import { ASSET_PRIORITY } from '../engine/constants'`; used at line 178 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ASSET-01 | 02-02 | 4 asset types with count + avgSizeGB | SATISFIED | Step1Assets: 4 cards with both fields |
| ASSET-02 | 02-02 | Per-type subtotal calculation | SATISFIED | subtotals computed at line 27–32; displayed per card |
| ASSET-03 | 02-02 | Grand total volume shown | SATISFIED | Blue footer: totalGB + totalTB displayed |
| ASSET-04 | 02-02 | Next disabled when total=0 | SATISFIED | isNextDisabled = totalGB === 0 |
| INFRA-01 | 02-03 | Tape library params: name, driveCount, throughput | SATISFIED | Library cards with editable name, driveCount input, driveThroughputMBs input |
| INFRA-02 | 02-03 | Add/delete libraries; first undeletable | SATISFIED | addLibrary(); deleteLibrary(); index > 0 guard |
| INFRA-03 | 02-03 | SAN params: maxSpeedGBs, streamCount, streamSpeedMBs | SATISFIED | SAN section with 3 inputs, correct min/step |
| INFRA-04 | 02-03 | Engineer count | SATISFIED | engineerCount input, min=1 |
| INFRA-05 | 02-03 | fastNetworkGbps + lanGbps | SATISFIED | Two network speed inputs with step=0.1 |
| INFRA-06 | 02-01, 02-03 | uncertaintyPct 0–100%, default 15% | SATISFIED | Input with min=0 max=100; DEFAULT_WIZARD_DATA.uncertaintyPct=15 |
| INFRA-07 | 02-01, 02-03 | Monte Carlo iterations 10k–200k, default 10k | SATISFIED | Input with min=10000 max=200000 step=1000; DEFAULT_WIZARD_DATA.trials=10_000 |
| INFRA-08 | 02-03 | Volume per library shown | SATISFIED | perLibraryGB = totalVolumeGB / libraryCount displayed in summary box |
| INFRA-09 | 02-03 | Russian validation errors | SATISFIED | "Количество драйвов должно быть ≥ 1" and "Введите значение от 10 000 до 200 000" |
| VIZ-01 | 02-05 | KDE density chart with recharts | SATISFIED | ComposedChart with Area and KDEPoint[] data |
| VIZ-02 | 02-05 | X-axis=hours, Y-axis=density, vertical lines | SATISFIED | XAxis dataKey="x" type="number" with "ч" formatter; ReferenceLine for min/max |
| VIZ-03 | 02-05 | Metric cards: best/worst/median/p10 | SATISFIED | 4 colored cards per ScenarioPanel: min(green), max(red), p10(blue), p50(purple) |
| VIZ-04 | 02-05 | Table: asset breakdown with base time + avg from trials | BLOCKED | REQUIREMENTS.md: "базовое время, среднее из триалов". Implementation shows count/volume only. ScenarioResult has no per-asset timing fields. Plan 05 re-interpreted this as "counts and volumes" — that re-interpretation is not reflected in REQUIREMENTS.md. |
| VIZ-05 | 02-05 | Hover tooltip: time + density | SATISFIED | Tooltip with labelFormatter "Время: Xч" and formatter returning ["density value", "Плотность"] |
| UX-01 | 02-01, 02-04 | 3-step progress bar | SATISFIED | ProgressBar component with Активы/Инфраструктура/Результаты; sticky top-0 |
| UX-02 | 02-01, 02-04 | Minimalist design + lucide-react icons | SATISFIED | lucide-react Check in ProgressBar; lucide-react X in Step2Infrastructure; white bg-gray-50 design |

**Orphaned requirements check:** No additional Phase 2 requirements in REQUIREMENTS.md beyond those claimed by plans.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/components/steps/Step1Assets.tsx | 87, 103 | `placeholder="0"` | Info | HTML input placeholder attributes — not a stub. No impact. |

No actual anti-patterns found. No TODO/FIXME, no empty implementations, no placeholder components, no stub API handlers. ResultsPlaceholder was removed as required.

---

## Human Verification Required

### 1. KDE Chart Rendering and Tooltip

**Test:** Open dist/index.html, enter data in Step 1 (e.g., Базы данных: 5 assets, 200 GB each), proceed through Step 2, click "Далее: Результаты →".
**Expected:** Two recharts curves render (blue Кибербакап left, purple Конкурент right). Hovering either curve shows tooltip with "Время: X.XXч" and density value. Green dashed "Лучший" and red dashed "Худший" vertical lines are visible.
**Why human:** recharts rendering depends on browser layout; tsc only confirms types, not visual output.

### 2. Кибербакап vs Конкурент comparison

**Test:** After simulation completes, compare the two panels visually.
**Expected:** Кибербакап p50 (Среднее значение card) should show fewer hours than Конкурент p50 — the tool's core value proposition.
**Why human:** Requires live simulation execution with the Monte Carlo engine.

### 3. Back navigation state preservation

**Test:** Enter values in Step 1 (e.g., Серверы: 10 assets, 500 GB). Advance to Step 2. Click "← Назад". Inspect Step 1.
**Expected:** Серверы still shows 10 / 500. All other fields unchanged.
**Why human:** React state persistence requires browser interaction.

---

## Gaps Summary

**1 gap** blocking full VIZ-04 requirement coverage:

**VIZ-04 asset table timing data.** The requirement as written in REQUIREMENTS.md ("базовое время, среднее из триалов" — base time, average from trials per asset type) was re-interpreted during Plan 05 execution to mean "counts and volumes." The delivered table shows input data (count, avgSizeGB, total GB per asset type) — which is useful context on the results page — but does not show timing outputs per asset type. The engine's `ScenarioResult` type has no per-asset breakdown field; it only carries aggregate p10/p50/p90/min/max/kde. Fulfilling the original requirement would require engine changes (Phase 1 work) before this component can be updated.

**Two paths to resolution:**
1. **Update REQUIREMENTS.md** to officially re-scope VIZ-04 to "input breakdown table (counts + volumes)" — fast, reflects the pragmatic decision already made.
2. **Add per-asset timing to ScenarioResult** and engine output, then update the table — fulfills the original requirement but requires engine work.

The gap does not block usability of the tool; the core sales workflow (enter data → run simulation → see KDE comparison) is fully functional.

---

_Verified: 2026-03-15T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
