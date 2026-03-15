# Phase 3: Persistence + Polish - Research

**Researched:** 2026-03-15
**Domain:** localStorage persistence, React drawer/overlay pattern, recharts multi-series overlay
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Results page two-panel layout (Кибербакап left + Конкурент right) is unchanged — no redesign beyond adding save widget and drawer
- Step 2 fields remain exactly as implemented in Phase 2
- Scenario drawer: "Сценарии ☰" button in page header opens right-side overlay drawer; accessible from ALL steps; save widget shows ONLY on results page
- Drawer contents top-to-bottom: header + close button, "Сохранить текущий" section (results page only), divider, list sorted by date descending, each row has name + date + "→" (load) + "×" (delete)
- Deletion UX: inline row confirmation ("Удалить?" + "Да" / "Нет") — no modal
- Save trigger: results page only; inline widget below scenario panels / above asset breakdown table; text field + "Сохранить" button; resets to empty after save
- Saved data: ONLY `WizardFormData` inputs — never `SimulationResult` trial arrays (locked in STATE.md to prevent localStorage quota errors)
- Load behavior: clicking "→" loads `WizardFormData`, auto-runs simulation, closes drawer, navigates to results page — one click, instant results, no intermediate step review
- Comparison: checkbox on each scenario row; when exactly 2 checked → "Сравнить выбранные (2)" button at drawer bottom → dedicated comparison screen (step 4 or separate mode)
- Comparison screen: title "Сравнение: [A] vs [B]", one large KDE chart with 4 curves, legend, metrics table (2 rows × 6 metric columns), "Назад" button
- Comparison runs both simulations in sequence (not parallel — simpler)
- localStorage key: `drp_scenarios`, value: JSON array of `{ id, name, date, data: WizardFormData }`
- Visual style: white/grey aesthetic; icons from lucide-react: `PanelRight` or `Menu` (drawer toggle), `X` (close/delete), `ChevronRight` (load), `Save` (save button)
- All UI labels in Russian

### Claude's Discretion

- Exact Tailwind classes for drawer slide-in animation
- localStorage key naming and schema versioning strategy (try/catch + discard invalid entries approved)
- Comparison chart color palette (4 curves must be visually distinguishable)
- Whether comparison runs simulations sequentially or in parallel (sequential chosen per locked decision above)

### Deferred Ideas (OUT OF SCOPE)

- Export PNG of chart (EXPORT-01)
- Export CSV of trial data (EXPORT-02)
- Custom asset types (ASSET-EXT-01)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCEN-01 | User can save current configuration as a named scenario (localStorage, inputs only — not trials) | localStorage JSON serialization of `WizardFormData`; save widget in ResultsPage |
| SCEN-02 | User can load a saved scenario, restoring all form values | Hydrate `setFormData()` in App.tsx, call `run()`, navigate to step 3 |
| SCEN-03 | User sees list of saved scenarios sorted by date (newest first) | Read `drp_scenarios` from localStorage, sort by ISO date string desc |
| SCEN-04 | User can delete a scenario with inline row confirmation | Filter array in localStorage, re-serialize; inline "Удалить?" / "Да" / "Нет" replace row buttons |
| SCEN-05 | User can compare two saved scenarios — both KDE curves on one chart | Dedicated comparison screen; dual `useSimulation` instances; recharts `ComposedChart` with 4 `Line` series |
</phase_requirements>

---

## Summary

Phase 3 adds scenario persistence (localStorage read/write), a slide-in drawer UI, and a comparison screen. All dependencies are already installed — no new packages required. The work is entirely React component authoring and localStorage API usage; no new build tool concerns arise.

The largest engineering challenge is the comparison screen: two independent simulations must run sequentially, and their results must be plotted as 4 distinguishable curves on one recharts `ComposedChart`. The `useSimulation` hook already works for a single simulation; two instances in a dedicated component is the correct pattern.

The localStorage schema (`drp_scenarios` key, JSON array) is simple. The main robustness concern is corrupt/stale data from future schema changes — handled with `try/catch` + discard strategy, which is already approved.

**Primary recommendation:** Build in 4 tasks — (1) localStorage hook + types, (2) ScenarioDrawer component + App.tsx integration, (3) save widget in ResultsPage + load/delete wiring, (4) ComparisonScreen component.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | ^19.2.4 | Component rendering | Project baseline |
| TypeScript | ~5.9.3 | Type safety | Project baseline |
| Tailwind CSS | (via Vite) | Styling + drawer animation | Project baseline |
| lucide-react | ^0.577.0 | Icons | Already installed, used in Phase 2 |
| recharts | ^3.8.0 | KDE charts including comparison overlay | Already used in ResultsPage |
| localStorage (native) | Browser API | Scenario persistence | No library needed; 5 MB quota is ample for WizardFormData objects |

### No new packages required

Phase 3 uses zero new npm dependencies. All required capabilities (persistence, animation, charting, icons) are already available in the installed stack.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native localStorage | Zustand persist / Jotai persist | Overkill; adds a state library dep for a simple array of scenarios |
| CSS transition via Tailwind | Framer Motion / React Spring | No need; `translate-x-full` → `translate-x-0` with `transition-transform duration-300` is sufficient |
| Two `useSimulation` instances | Single hook with dual state | Two hook instances are clean and isolated; dual state in one hook creates entangled logic |

---

## Architecture Patterns

### Recommended New File Structure

```
src/
├── hooks/
│   ├── useSimulation.ts          # existing — unchanged
│   └── useScenarios.ts           # NEW: localStorage CRUD hook
├── components/
│   ├── ResultsPage.tsx           # existing — add save widget
│   ├── ProgressBar.tsx           # existing — unchanged
│   ├── ScenarioDrawer.tsx        # NEW: right-side overlay drawer
│   ├── ComparisonScreen.tsx      # NEW: 4-curve KDE chart + metrics table
│   └── steps/                   # existing — unchanged
├── types/
│   ├── wizard.ts                 # existing — unchanged
│   ├── simulation.ts             # existing — unchanged
│   └── scenario.ts               # NEW: SavedScenario interface
App.tsx                           # extend currentStep to 1|2|3|4, add drawer open state
```

### Pattern 1: localStorage CRUD hook (`useScenarios`)

**What:** A custom hook that owns all localStorage read/write operations, exposing a typed array and mutation functions. Components never call `localStorage` directly.

**When to use:** Any time a component needs to read the list, save, or delete.

**Shape:**

```typescript
// src/types/scenario.ts
export interface SavedScenario {
  id: string          // crypto.randomUUID() or Date.now().toString()
  name: string        // user-supplied label
  date: string        // ISO 8601, e.g. new Date().toISOString()
  data: WizardFormData
}

// src/hooks/useScenarios.ts
const STORAGE_KEY = 'drp_scenarios'

export function useScenarios() {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => load())
  // load(), save(name, formData), remove(id)
  // Returns: { scenarios, save, remove }
}

function load(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    // Validate each entry has required keys — discard malformed
    return parsed.filter(isValidScenario)
  } catch {
    return []
  }
}
```

**Sorting:** Sort by `date` descending in the hook before returning — `scenarios.sort((a, b) => b.date.localeCompare(a.date))`.

### Pattern 2: Drawer overlay (`ScenarioDrawer`)

**What:** A fixed-position right-side panel controlled by an `isOpen` boolean prop from App.tsx. Uses Tailwind CSS transition for slide animation.

**Animation classes:**

```typescript
// Overlay backdrop
<div
  className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300
    ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
  onClick={onClose}
/>

// Drawer panel
<div
  className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50
    transform transition-transform duration-300
    ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
>
  {/* drawer contents */}
</div>
```

**App.tsx changes needed:**

```typescript
// Extend step type
const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
const [drawerOpen, setDrawerOpen] = useState(false)
```

The drawer renders as a sibling to `<main>` inside the root `<div>`, so it overlays all steps regardless of which step is active.

### Pattern 3: Comparison screen (`ComparisonScreen`)

**What:** A dedicated screen (step 4) that receives two `SavedScenario` objects, runs both simulations, and renders a single recharts `ComposedChart` with 4 `Line` series.

**Dual simulation pattern:**

```typescript
// ComparisonScreen.tsx
export default function ComparisonScreen({ scenarioA, scenarioB, onBack }) {
  const simA = useSimulation()
  const simB = useSimulation()

  useEffect(() => {
    simA.run(scenarioA.data)
  }, [scenarioA.id])

  useEffect(() => {
    if (!simA.isRunning && simA.result) {
      simB.run(scenarioB.data)
    }
  }, [simA.isRunning, simA.result])

  const isLoading = simA.isRunning || simB.isRunning || !simA.result || !simB.result
  // ...
}
```

**4-curve recharts chart:**

```typescript
// Merge KDE x-axis: combine all x values, interpolate missing densities to 0
// Then render one ComposedChart with 4 Line series:

<ComposedChart data={mergedData}>
  <Line dataKey="kyberA" stroke="#2563eb" strokeWidth={2} dot={false} name="Кибербакап A" />
  <Line dataKey="competitorA" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Конкурент A" />
  <Line dataKey="kyberB" stroke="#f97316" strokeWidth={2} dot={false} name="Кибербакап B" />
  <Line dataKey="competitorB" stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Конкурент B" />
  <Legend />
</ComposedChart>
```

**Color palette (Claude's Discretion):**
- Кибербакап A: `#2563eb` (blue solid)
- Конкурент A: `#2563eb` (blue dashed `strokeDasharray="6 3"`)
- Кибербакап B: `#f97316` (orange solid)
- Конкурент B: `#f97316` (orange dashed)

This ensures scenario identity (color = scenario) and product identity (solid = Кибербакап, dashed = Конкурент).

### Anti-Patterns to Avoid

- **Calling `localStorage` directly in components:** Always go through `useScenarios` hook — keeps storage logic testable and centralized.
- **Storing `SimulationResult` in localStorage:** Locked decision — only `WizardFormData`. Trial arrays can be hundreds of KB.
- **Triggering both comparison simulations simultaneously:** The Web Worker is a single shared instance per `useSimulation` hook. Two simultaneous runs from two separate hook instances are independent and won't conflict — but running sequentially (A finishes, then B starts) is simpler to reason about and is the approved approach.
- **Putting drawer state inside the drawer component:** Drawer open/close state belongs in App.tsx because other interactions (load scenario, close on backdrop click) need to control it.
- **Using `any` for localStorage parse result:** Type-guard with `Array.isArray` and per-entry validation; discard entries that fail.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide-in animation | Custom CSS keyframes | Tailwind `translate-x-full` / `translate-x-0` + `transition-transform duration-300` | Already in the project; no extra CSS needed |
| Icon components | SVG paths by hand | lucide-react `PanelRight`, `X`, `ChevronRight`, `Save`, `Trash2` | Already installed |
| KDE chart rendering | Custom SVG/canvas | recharts `ComposedChart` with `Line` series | Already used in ResultsPage |
| UUID generation | Custom random string | `crypto.randomUUID()` (available in all modern browsers, no import needed) | Native, no library |

**Key insight:** The entire Phase 3 UI is composition of already-installed primitives — no new dependencies, no hand-rolled utilities.

---

## Common Pitfalls

### Pitfall 1: localStorage quota exceeded by large JSON blobs

**What goes wrong:** If `SimulationResult` were accidentally serialized (KDE arrays × 2 scenarios × N saved scenarios), quota (~5 MB) is quickly exhausted and `localStorage.setItem` throws a `QuotaExceededError`.

**Why it happens:** `SimulationResult` contains `kde: KDEPoint[]` (200-300 points per scenario × 2 scenarios). For 10 saved scenarios this is manageable, but trial arrays were the concern in earlier phases.

**How to avoid:** The locked decision already prevents this: serialize only `WizardFormData`. A `WizardFormData` object serializes to ~300 bytes. Confirmed by inspecting the type — it contains only primitives and small arrays of library configs.

**Warning signs:** `localStorage.setItem` call wrapped in try/catch; if caught, surface an error toast to the user.

### Pitfall 2: Stale/corrupt localStorage data crashes the app

**What goes wrong:** If `WizardFormData` shape changes in a future phase, old localStorage entries fail to parse correctly. Without protection, spreading corrupt data into form state causes runtime errors.

**How to avoid:** The approved strategy (from CONTEXT.md Claude's Discretion) is `try/catch` + discard in `useScenarios.load()`. Additionally, validate required keys are present before accepting an entry. Do NOT attempt migration in Phase 3.

**Warning signs:** `JSON.parse` succeeds but returns an object missing required keys. Use a type-guard: check `typeof entry.data?.assets === 'object'` etc.

### Pitfall 3: Comparison screen double-fires simulations on re-render

**What goes wrong:** `useEffect` with simulation trigger has incorrect dependency array, causing `simA.run()` to fire multiple times.

**How to avoid:** Trigger `simA.run()` only on mount (empty dep array `[]`) or on `scenarioA.id` change. Guard `simB.run()` behind `!simB.isRunning && !simB.result` check in addition to `!simA.isRunning`.

**Warning signs:** Progress bar cycling more than once; console logs showing multiple `postMessage` calls.

### Pitfall 4: Drawer renders on top of progress bar / header

**What goes wrong:** z-index conflicts between the fixed drawer (`z-50`) and the `ProgressBar` component.

**How to avoid:** ProgressBar uses standard document flow (no z-index). Drawer uses `z-40` for backdrop and `z-50` for panel — both above the ProgressBar. Verify by inspecting ProgressBar for any `z-` classes.

**Warning signs:** Drawer slides in but appears behind the header/progress bar.

### Pitfall 5: recharts multi-series x-axis alignment

**What goes wrong:** Two simulations produce KDE points at different x values. Rendering them as separate `Line` series on the same `ComposedChart` requires a shared x-axis. Misaligned x values cause gaps or zigzag artifacts.

**How to avoid:** Merge all four KDE arrays into a single dataset. For each unique x value across all four curves, include all four density values (interpolate to 0 where a curve has no point near that x). Use a sorted, deduplicated x-axis.

**Simpler approach:** Since all four KDE arrays are generated by the same KDE engine with the same number of points (200–300), their x-ranges will differ but their density arrays will have points at regular intervals. Use `recharts` `type="monotone"` with `connectNulls={false}` and merge by closest x (within tolerance). Alternatively — and most robustly — re-sample all four curves onto a shared x grid (min of all mins, max of all maxes, 300 steps).

---

## Code Examples

### useScenarios hook skeleton

```typescript
// src/hooks/useScenarios.ts
import { useState } from 'react'
import type { WizardFormData } from '../types/wizard'
import type { SavedScenario } from '../types/scenario'

const STORAGE_KEY = 'drp_scenarios'

function isValidScenario(entry: unknown): entry is SavedScenario {
  if (typeof entry !== 'object' || entry === null) return false
  const e = entry as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.date === 'string' &&
    typeof e.data === 'object' && e.data !== null
  )
}

function loadFromStorage(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const valid = parsed.filter(isValidScenario)
    return valid.sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return []
  }
}

function persist(scenarios: SavedScenario[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
  } catch (e) {
    console.error('localStorage quota exceeded or unavailable', e)
  }
}

export function useScenarios() {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(loadFromStorage)

  function save(name: string, data: WizardFormData): void {
    const entry: SavedScenario = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Без названия',
      date: new Date().toISOString(),
      data,
    }
    const updated = [entry, ...scenarios]
    persist(updated)
    setScenarios(updated)
  }

  function remove(id: string): void {
    const updated = scenarios.filter(s => s.id !== id)
    persist(updated)
    setScenarios(updated)
  }

  return { scenarios, save, remove }
}
```

### Drawer animation pattern

```typescript
// src/components/ScenarioDrawer.tsx (skeleton)
interface Props {
  isOpen: boolean
  onClose: () => void
  scenarios: SavedScenario[]
  onSave: (name: string) => void
  onLoad: (scenario: SavedScenario) => void
  onDelete: (id: string) => void
  onCompare: (a: SavedScenario, b: SavedScenario) => void
  showSaveWidget: boolean   // true only when currentStep === 3 && result != null
}

// Backdrop
<div
  className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300
    ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
  onClick={onClose}
/>

// Drawer panel
<div
  className={`fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl z-50
    transform transition-transform duration-300 ease-in-out overflow-y-auto
    ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
>
  ...
</div>
```

### KDE merge for comparison chart

```typescript
// Merge 4 KDE arrays onto shared x-grid
function mergeKDEs(
  kyberA: KDEPoint[],
  competitorA: KDEPoint[],
  kyberB: KDEPoint[],
  competitorB: KDEPoint[],
): Array<{ x: number; kyberA: number; competitorA: number; kyberB: number; competitorB: number }> {
  // Collect all unique x values, sort ascending
  const allX = Array.from(new Set([
    ...kyberA.map(p => p.x),
    ...competitorA.map(p => p.x),
    ...kyberB.map(p => p.x),
    ...competitorB.map(p => p.x),
  ])).sort((a, b) => a - b)

  // For each x, find nearest density from each curve (or 0 if out of range)
  return allX.map(x => ({
    x,
    kyberA: interpolate(kyberA, x),
    competitorA: interpolate(competitorA, x),
    kyberB: interpolate(kyberB, x),
    competitorB: interpolate(competitorB, x),
  }))
}

function interpolate(points: KDEPoint[], x: number): number {
  if (points.length === 0) return 0
  if (x < points[0].x || x > points[points.length - 1].x) return 0
  // Linear interpolation between nearest neighbors
  const i = points.findIndex(p => p.x >= x)
  if (i === 0) return points[0].density
  const lo = points[i - 1]
  const hi = points[i]
  const t = (x - lo.x) / (hi.x - lo.x)
  return lo.density + t * (hi.density - lo.density)
}
```

### App.tsx integration points

```typescript
// Extended step type
const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
const [drawerOpen, setDrawerOpen] = useState(false)
const [comparisonScenarios, setComparisonScenarios] = useState<[SavedScenario, SavedScenario] | null>(null)
const { scenarios, save: saveScenario, remove: removeScenario } = useScenarios()

// Load handler (called from ScenarioDrawer)
function handleLoadScenario(scenario: SavedScenario) {
  setFormData(scenario.data)
  setDrawerOpen(false)
  run(scenario.data)
  setCurrentStep(3)
}

// Compare handler (called from ScenarioDrawer when 2 checked)
function handleCompare(a: SavedScenario, b: SavedScenario) {
  setComparisonScenarios([a, b])
  setDrawerOpen(false)
  setCurrentStep(4)
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Global Redux store for UI state | Local `useState` in App.tsx | App.tsx already uses this — drawer open state fits the same pattern |
| CSS animation libraries | Tailwind `transition-transform` | Available in Tailwind v3+ — no external animation lib needed |
| `window.localStorage` directly in components | Custom hook wrapping localStorage | Better testability; centralized error handling |

**Deprecated/outdated:**
- Using `sessionStorage` instead of `localStorage`: sessionStorage clears on tab close — wrong for "save across sessions" use case.

---

## Open Questions

1. **Drawer width on the results two-column layout**
   - What we know: drawer is `w-80` (320px); results page uses `max-w-2xl mx-auto` (672px)
   - What's unclear: on narrow viewports (e.g. 13" laptop at 1280px), 320px drawer partially obscures the results charts
   - Recommendation: This is a desktop tool (UX-03 scope); w-80 is fine for typical 1440px+ sales laptop screens. No action needed in Phase 3.

2. **Schema version for future WizardFormData changes**
   - What we know: approved approach is try/catch + discard invalid entries
   - What's unclear: if a field is added with a default (e.g., a new optional property), discarding is too aggressive — the old entry is still mostly valid
   - Recommendation: In Phase 3, discard only entries that are missing the core required keys (`assets`, `libraries`, `san`, `engineerCount`, `fastNetworkGbps`, `lanGbps`, `uncertaintyPct`, `trials`). Optional future fields can be patched with defaults at load time. Add a comment to `useScenarios.ts` flagging this for future extension.

3. **`currentStep` type extension to `1|2|3|4`**
   - What we know: App.tsx currently types `currentStep` as `1|2|3`
   - What's unclear: ProgressBar component — does it crash on step 4?
   - Recommendation: Verify ProgressBar renders gracefully when `currentStep === 4` (comparison screen has no wizard step). Pass `currentStep` as-is; ProgressBar should show all 3 steps as "complete" or hide the bar entirely on step 4. Implement whichever is simpler.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vite.config.ts` — `test` block, `environment: 'node'`, `include: ['src/**/*.test.ts']` |
| Quick run command | `npx vitest run src/hooks/useScenarios.test.ts` |
| Full suite command | `npx vitest run` |

**Note on environment:** Existing engine tests run in `node` environment. Phase 3 tests for `useScenarios` require `localStorage` — use `// @vitest-environment jsdom` file-level annotation (vitest supports per-file environment overrides without changing global config). `jsdom` is already installed as a dev dependency.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCEN-01 | `save(name, formData)` writes entry to localStorage; entry contains id, name, date, data | unit | `npx vitest run src/hooks/useScenarios.test.ts` | Wave 0 |
| SCEN-01 | Save widget only visible on results page (step 3 with result) | manual smoke | visual check | N/A |
| SCEN-02 | `handleLoadScenario` restores formData, calls `run()`, sets step 3 | manual smoke | visual check | N/A |
| SCEN-03 | `scenarios` array from hook is sorted newest-first | unit | `npx vitest run src/hooks/useScenarios.test.ts` | Wave 0 |
| SCEN-04 | `remove(id)` removes entry from localStorage; other entries preserved | unit | `npx vitest run src/hooks/useScenarios.test.ts` | Wave 0 |
| SCEN-04 | Inline "Удалить?" confirmation UX | manual smoke | visual check | N/A |
| SCEN-05 | `mergeKDEs` returns combined array with all 4 density keys; x values sorted | unit | `npx vitest run src/components/ComparisonScreen.test.ts` | Wave 0 |
| SCEN-05 | Comparison screen shows 4 curves with legend | manual smoke | visual check | N/A |

### Sampling Rate

- **Per task commit:** `npx vitest run src/hooks/useScenarios.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/hooks/useScenarios.test.ts` — covers SCEN-01, SCEN-03, SCEN-04. Requires `// @vitest-environment jsdom` annotation at top of file for localStorage access.
- [ ] `src/components/ComparisonScreen.test.ts` — covers `mergeKDEs` helper (SCEN-05). Can use `node` environment (pure function test).
- [ ] `src/types/scenario.ts` — `SavedScenario` interface; must exist before hook and test can import it.

Framework install: none needed — vitest 4.1.0 and jsdom are already in `devDependencies`.

---

## Sources

### Primary (HIGH confidence)

- Source code inspection — `src/types/wizard.ts`, `src/hooks/useSimulation.ts`, `src/components/ResultsPage.tsx`, `src/App.tsx` (all read directly)
- `package.json` — confirms installed packages and versions
- `vite.config.ts` — confirms vitest environment config and include pattern
- MDN localStorage API — native browser API, no version concerns
- Tailwind CSS v3 docs — `transition-transform`, `translate-x-full`, `translate-x-0` classes confirmed in Tailwind v3 (used throughout the project)

### Secondary (MEDIUM confidence)

- recharts `ComposedChart` + `Line` multi-series pattern — consistent with usage already in `ResultsPage.tsx` which uses `ComposedChart` + `Area`; `Line` is the same API surface
- vitest per-file environment override via `// @vitest-environment jsdom` — documented feature of vitest; jsdom is already installed

### Tertiary (LOW confidence)

- None — all critical findings are verified against actual project files.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified from package.json
- Architecture: HIGH — patterns derived from reading actual source code
- Pitfalls: HIGH — derived from code inspection + known localStorage/recharts constraints
- Test infrastructure: HIGH — vitest config read directly from vite.config.ts

**Research date:** 2026-03-15
**Valid until:** 2026-06-15 (stable stack; no fast-moving dependencies in scope)
