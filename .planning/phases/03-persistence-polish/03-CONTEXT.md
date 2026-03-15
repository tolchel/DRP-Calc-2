# Phase 3: Persistence + Polish - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Scenario save/load via localStorage, comparison of two saved scenarios overlaid on one chart. No new simulation logic — Phase 3 wraps `WizardFormData` persistence around the existing wizard and results UI. The deliverable: a salesperson can name and save a customer config, reload it instantly in a future session, delete old scenarios, and overlay two configs for side-by-side comparison.

</domain>

<decisions>
## Implementation Decisions

### Results page layout
- Keep the existing two-panel layout from Phase 2: Кибербакап panel (left) + Конкурент panel (right), each with their own 4 metric cards and KDE chart.
- No redesign of the results page beyond adding the save widget and scenario drawer.

### Step 2 fields
- Keep all current fields as implemented in Phase 2 (библиотеки + СХД + инженеры + сети + поправка + итерации).
- Screen_2 mockup shows a simplified version — this was an early draft. Current implementation is the correct one.

### Scenario drawer (panel placement)
- A "Сценарии ☰" button in the page header opens a right-side drawer overlay.
- Drawer contents (top to bottom):
  - Header: "Сценарии" + close button
  - "Сохранить текущий" section: shown only on results page (see Save trigger below)
  - Divider
  - List of saved scenarios, sorted by date descending (newest first)
  - Each row: scenario name, date, "→" (load) button, "×" (delete) button
- Drawer is accessible from ALL steps (header is always visible), but save widget only shows on results page.
- Deletion requires confirmation (inline confirm on the row: replace buttons with "Удалить?" + "Да" / "Нет").

### Save trigger and naming
- Save is only possible from the results page (after simulation has run).
- Inline save widget on results page: a text field pre-filled with empty string + "Сохранить" button.
- Placement: below the scenario panels, above the asset breakdown table.
- On save: scenario is added to localStorage, drawer list updates, field resets to empty.
- Saved data: only `WizardFormData` (inputs) — never `SimulationResult` trial arrays (prevents localStorage quota errors — locked decision from STATE.md).

### Load scenario behavior
- Clicking "→" on a scenario: loads `WizardFormData` into form state, auto-triggers simulation, closes drawer, navigates to results page.
- One click = instant results. No intermediate step review.

### Comparison mode (SCEN-05)
- In the drawer, each scenario row has a checkbox.
- When exactly 2 scenarios are checked, a "Сравнить выбранные (2)" button appears at the bottom of the drawer.
- Clicking it opens a dedicated comparison screen (new `currentStep` or route, e.g. step 4).
- Comparison screen layout:
  - Title: "Сравнение: [Сценарий A] vs [Сценарий B]"
  - One large KDE chart with 4 curves: Кибербакап-A (синий), Конкурент-A (синий пунктир), Кибербакап-B (оранжевый), Конкурент-B (оранжевый пунктир)
  - Legend identifies all 4 curves
  - Metrics table below: 2 rows (Сценарий A / Сценарий B), columns = Лучший, Худший, Медиана for both Кибербакап and Конкурент
  - "Назад" button returns to results page (or Step 1 if no active result)
- Comparison requires running both scenarios' simulations — trigger both in sequence on entry, show progress.

### Visual style
- Drawer uses the same white/grey aesthetic as the rest of the app (white background, grey borders, lucide-react icons).
- Use lucide-react: `PanelRight` or `Menu` for drawer toggle, `X` for close/delete, `ChevronRight` for load, `Save` for save button.
- All labels in Russian.

### Claude's Discretion
- Exact Tailwind classes for drawer animation (slide-in transition)
- localStorage key naming and schema versioning strategy
- How to handle schema migration if `WizardFormData` shape changes in future (can use try/catch + discard invalid entries)
- Comparison chart color palette (as long as 4 curves are visually distinguishable)
- Whether comparison runs both simulations sequentially or in parallel (sequential is simpler)

</decisions>

<specifics>
## Specific Ideas

- Drawer mockup chosen: button "Сценарии ☰" in header → side panel with list + "Сохранить текущий" at top
- Comparison: user checks 2 scenarios in drawer → "Сравнить выбранные (2)" → dedicated comparison screen with 4 KDE curves on one chart
- "One click = instant results" for load: auto-run simulation, go straight to results — no intermediate step review
- Deletion UX: inline confirmation on the row itself (no modal), consistent with minimal design

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/types/wizard.ts`: `WizardFormData` + `DEFAULT_WIZARD_DATA` — this is exactly what gets serialized to localStorage; shape is already defined
- `src/hooks/useSimulation.ts`: `run(formData)` + `result` + `isRunning` — load flow calls `run()` directly after hydrating form state
- `src/components/ResultsPage.tsx`: receives `result` + `formData` + `onBack` — comparison screen will need a variant that accepts two results + two formData objects
- `lucide-react`: already installed — use `PanelRight`, `X`, `ChevronRight`, `Save`, `Trash2` icons

### Established Patterns
- All form state lives in `App.tsx` (`useState<WizardFormData>`) — drawer load action calls `setFormData()` + triggers `run()` + `setCurrentStep(3)`
- `WizardFormData` stored as percentage for uncertaintyPct (0–100), not fraction — serialize as-is, no conversion needed
- localStorage keys: use a single key `drp_scenarios` holding a JSON array of `{ id, name, date, data: WizardFormData }`

### Integration Points
- `App.tsx` needs a drawer component as a sibling to `<main>` (overlays the whole page)
- Comparison screen needs access to `useSimulation` twice (or a dual-simulation hook) — simplest approach: two separate `useSimulation` instances in a dedicated comparison component
- `currentStep` in App.tsx currently typed as `1 | 2 | 3` — extend to include `4` for comparison screen, or use a separate `comparisonMode` boolean flag

</code_context>

<deferred>
## Deferred Ideas

- Export PNG of chart — v2 (EXPORT-01), explicitly deferred in Phase 2 CONTEXT.md
- Export CSV of trial data — v2 (EXPORT-02)
- Custom asset types (+ Добавить новый тип актива) — v2 (ASSET-EXT-01), visible as disabled button in Screen_1

</deferred>

---

*Phase: 03-persistence-polish*
*Context gathered: 2026-03-15*
