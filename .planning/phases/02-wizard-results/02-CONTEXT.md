# Phase 2: Wizard + Results - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

A 3-step wizard (Активы → Инфраструктура → Результаты) that collects `SimulationInput`, triggers the simulation engine, and displays two side-by-side scenario panels with KDE density charts and metrics. No persistence (localStorage/scenarios) in this phase — that is Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Wizard navigation and step rendering
- Steps-style progress bar fixed at top of page showing: Активы → Инфраструктура → Результаты (with step numbers)
- Navigation via Back/Next buttons at bottom of each step — matches Screen_2 pattern (Назад / Далее: Результаты)
- Single top-level state object in App.tsx holds all wizard form data (`WizardFormData`) — no state lost when navigating between steps
- Step 3 (Результаты) shows empty state if simulation hasn't run yet
- "Next" button on Step 1 is disabled until total volume > 0 (ASSET-04)

### Step 1 — Asset form layout
- Follow Screen_1 design exactly: one card per asset type (Базы данных, Серверы, Файловые хранилища, Рабочие станции)
- Each card has two fields side by side: "Количество активов" + "Средний объём на актив (ГБ)"
- Per-card subtotal shown below fields: "Общий объём: X.X ГБ"
- Fixed blue footer at bottom of step: "Общий объём данных для восстановления: X.XX ГБ (Y.YY ТБ)"
- The "+ Добавить новый тип актива" button visible in Screen_1 is a v2 feature (ASSET-EXT-01) — do NOT implement in Phase 2

### Step 2 — Infrastructure form layout
- Hybrid: use Screen_2 visual style (clean cards, grouped sections) but include ALL fields from REQUIREMENTS.md
- **Summary info box at top** (from Screen_2): shows total data volume and data per library — computed from Step 1 + library count
- **Libraries section** (card per library):
  - Fields per library: Название (editable name), Количество драйвов (≥1), Пропускная способность драйва (МБ/с, default 300)
  - First library always present and cannot be deleted (INFRA-01, INFRA-02)
  - "+ Добавить библиотеку" button at bottom (INFRA-02)
  - Each additional library has a delete (×) button
  - INFRA-08: show calculated data per library inline in the summary box
- **Additional parameters section** (below libraries, grouped):
  - СХД: макс. скорость (ГБ/с), количество потоков, скорость потока (МБ/с) — INFRA-03
  - Количество IT-инженеров (INFRA-04)
  - Скоростная сеть (Гбит/с) + ЛВС (Гбит/с) — INFRA-05
  - Поправка на неопределённость (%, 0–100) — INFRA-06
  - Количество итераций Monte Carlo (10 000–200 000) — INFRA-07
- Validation errors shown inline in Russian (INFRA-09)

### Results page layout
- Two side-by-side panels: left = Кибербакап, right = Конкурент
- Each panel contains:
  - 4 metric cards (matching Screen_Report color scheme): Лучший сценарий (green), Худший сценарий (red), Вероятность лучшего (blue), Среднее значение (purple)
  - KDE density chart (recharts `AreaChart`) with filled area, vertical dashed lines for best/worst, hover tooltip
  - Chart axes: X = "Время восстановления (часы)", Y = "Плотность вероятности"
  - Legend: green dot "Лучший сценарий", red dot "Худший сценарий", colored fill "Распределение вероятности"
- Shared asset breakdown table below both panels (VIZ-04): columns Тип системы / Количество / Объём на актив (ГБ) / Общий объём (ГБ)
- "Вернуться к настройкам" back button to return to Step 2

### Visual style (from screens)
- White background, light grey card borders, no heavy shadows
- Blue accent for CTAs ("Далее: Результаты" button)
- Metric card values in large colored numbers (green/red/blue/purple per metric type)
- lucide-react icons for any iconography (UX-02)
- Russian labels throughout

### Claude's Discretion
- Exact Tailwind/CSS class choices and spacing values
- Component file structure within src/
- recharts `AreaChart` config details (margins, tick formatting, animation)
- TypeScript shape for `WizardFormData` (how Step 1 and Step 2 inputs are typed before assembling `SimulationInput`)
- How progress bar step states (active/completed/pending) are styled

</decisions>

<specifics>
## Specific Ideas

- Screen_1: shows "+" add-asset button at bottom in dashed-border style — reuse this dashed-border style for the "+ Добавить библиотеку" button in Step 2
- Screen_2: shows a summary info box (light grey, rounded) at the top of Step 2 — include this with total volume and per-library volume
- Screen_Report: metric card layout shows value as large bold colored number with unit label below — replicate this pattern for both scenario panels
- Screen_Report chart: area fill + vertical dashed lines with dot + label (Лучший / Худший) — this is the exact chart style to implement
- The "Назад" button in Screen_2 is plain/outline style; "Далее: Результаты" is filled blue — follow this CTA hierarchy

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/types/simulation.ts`: `SimulationInput`, `ScenarioResult`, `SimulationResult`, `KDEPoint` — all Phase 2 components must use these types directly; the shape is locked
- `src/workers/simulation.worker.ts`: Worker communication already wired via `?worker&inline` import pattern
- `src/App.tsx`: Worker lifecycle pattern (useRef, postMessage, onmessage, terminate) — Phase 2 keeps this pattern inside a dedicated hook or the parent component

### Established Patterns
- Worker import: must use `?worker&inline` syntax (NOT `new Worker(new URL(...))`) — required for file:// origin (UX-03)
- All time values in `ScenarioResult` are in HOURS — chart x-axis must display hours directly
- KDE points: 200–300 points per scenario, x in hours — feed directly to recharts data array

### Integration Points
- `SimulationInput` is the exact data contract between the wizard forms and the worker — `WizardFormData` must map 1:1 to `SimulationInput` at the "Run simulation" step
- recharts and lucide-react are NOT yet installed — Phase 2 must install both (`--legacy-peer-deps` may be needed with React 19 per STATE.md blocker note)
- The current App.tsx is a validation scaffold — Phase 2 replaces it entirely with the 3-step wizard

</code_context>

<deferred>
## Deferred Ideas

- "+ Добавить новый тип актива" (custom asset types) — Phase 3 or v2 (ASSET-EXT-01)
- Save/load scenarios to localStorage — Phase 3 (SCEN-01 through SCEN-05)
- Export PNG / CSV — v2 (EXPORT-01, EXPORT-02)

</deferred>

---

*Phase: 02-wizard-results*
*Context gathered: 2026-03-15*
