# Pitfalls Research

**Domain:** React SPA — Monte Carlo simulation, KDE visualization (recharts), localStorage persistence, multi-step wizard forms
**Researched:** 2026-03-15
**Confidence:** HIGH (most pitfalls verified via official GitHub issues, MDN, and recharts source discussions)

---

## Critical Pitfalls

### Pitfall 1: UI Thread Blocking During Monte Carlo Simulation

**What goes wrong:**
Running 10,000–200,000 Monte Carlo trials synchronously on the main thread freezes the entire browser tab. The progress bar cannot update, button clicks are ignored, and on slow Windows 11 hardware the tab may appear completely unresponsive for 3–10+ seconds. This is the single most likely thing to make the tool feel broken to a salesperson mid-demo.

**Why it happens:**
JavaScript is single-threaded. Developers write simulation logic as a plain function and call it directly in a `useEffect` or button handler. The loop consumes 100% of one CPU core, starving the React reconciler and the browser's compositor.

**How to avoid:**
Move all simulation math into a Web Worker (`simulation.worker.ts`). Post a `{ type: 'START', params }` message from React; receive `{ type: 'PROGRESS', pct }` and `{ type: 'RESULT', data }` messages back. The main thread stays free. Use `useMemo` only for derived display data, never for the raw simulation loop.

```
React component → postMessage(params) → Worker
                ← onmessage({ pct })   ← Worker (batch updates every ~500ms)
                ← onmessage({ result }) ← Worker
```

If a Web Worker is deferred to a later phase, at minimum wrap the simulation in `setTimeout(fn, 0)` chunks that yield to the event loop — but this is a stopgap, not a solution.

**Warning signs:**
- Progress bar does not animate during simulation
- Browser "tab is unresponsive" dialog appears
- Chrome DevTools shows long tasks > 50ms in the Performance panel
- React DevTools shows zero renders during simulation

**Phase to address:** Simulation engine phase (whichever phase implements the Monte Carlo core). Do NOT defer this to polish — it affects demo viability from day one.

---

### Pitfall 2: Wrong KDE Bandwidth Destroys Chart Readability

**What goes wrong:**
The KDE density curve is either a spiky mess (under-smoothed: bandwidth too small) or a flat blob that buries the distribution's shape (over-smoothed: bandwidth too large). Silverman's rule-of-thumb, the default in most implementations, assumes normally distributed data. Recovery time distributions are right-skewed and often bimodal (fast path vs. slow path); Silverman's rule over-smooths them and erases the modes that tell the story.

**Why it happens:**
Developers copy a KDE implementation using `h = 0.9 * σ * n^(-1/5)` (Silverman's rule) because it is the first result on every tutorial. They test it on a synthetic normal distribution, it looks fine, and they ship it. On real simulation output — which is skewed and potentially multimodal — the result misrepresents the data.

**How to avoid:**
Use the **Improved Sheather-Jones (ISJ)** bandwidth selector for non-normal data. It is more complex to implement but self-adapts to the actual distribution shape. As a minimum, validate the bandwidth visually against at least three scenarios:
1. A wide spread (high uncertainty factor)
2. A narrow spread (low uncertainty, fast hardware)
3. A bimodal spread (two asset classes with very different recovery times)

Also, normalize the KDE output so the total area under the curve equals 1 before passing to recharts. Recharts `AreaChart` will render whatever Y values you give it — an unnormalized KDE produces Y axis scales that are meaningless.

**Warning signs:**
- Density curve looks identical regardless of simulation parameters
- Curve appears as a near-flat line across a wide X range
- Tiny sharp spikes appear at each sample value instead of a smooth curve
- Кибербакап and Конкурент curves overlap completely despite very different input parameters

**Phase to address:** Results/visualization phase. Implement bandwidth as a configurable constant first (not hardcoded), then tune after testing with real parameter ranges.

---

### Pitfall 3: Recharts SVG Performance Collapse with Raw Trial Data

**What goes wrong:**
Passing all 10,000–200,000 raw Monte Carlo trial values directly to a recharts `AreaChart` as individual data points causes the chart to render for several seconds or crash the browser tab. Recharts is 100% SVG — each data point becomes a DOM node. At 10,000 points, render time is already several seconds on modern hardware; at 200,000 it is unusable.

**Why it happens:**
The developer treats the chart as a data viewer rather than a visualization layer. Raw trial values are arrays of numbers; passing them verbatim to recharts `data` prop seems natural. The performance collapse only manifests at scale, so early prototypes with 1,000 trials look fine.

**How to avoid:**
**Never pass raw trial data to recharts.** Always pre-process through KDE first. The KDE output is a fixed-size array of `{ x, y }` points (e.g., 200–500 points) regardless of how many trials were run. This is the correct data contract between simulation and chart:

```
10,000–200,000 trials → KDE(bandwidth, nPoints=300) → 300 { x, y } objects → recharts
```

Additionally: memoize the KDE output with `useMemo`; do not recompute on every render. Wrap the chart component in `React.memo` to prevent re-renders from parent state changes unrelated to simulation results.

**Warning signs:**
- Chart renders slowly even before the KDE step is added
- `data.length` passed to recharts exceeds 1,000
- Chrome freezes for >1s when switching between scenarios

**Phase to address:** Simulation engine phase (define the data contract) AND visualization phase (enforce it).

---

### Pitfall 4: Independent Variable Assumption in Sequential Recovery Simulation

**What goes wrong:**
The simulation models each asset's recovery time as an independent random draw. In reality, recovery times are correlated: if network throughput is degraded, ALL assets in a wave take longer. Treating variables as independent produces an overconfident, artificially narrow distribution — the chart shows a tight peak when real-world variance would show a fat tail. For a sales demo that claims to show realistic recovery scenarios, this is a credibility risk.

**Why it happens:**
Independent draws are trivially simple to implement (`Math.random()` per asset). Correlated draws require Cholesky decomposition or at minimum a shared "infrastructure uncertainty" multiplier. The complexity makes independent draws the default choice.

**How to avoid:**
For this specific domain (IT infrastructure recovery), implement a **shared uncertainty multiplier per wave**. The "uncertainty adjustment" (0–100%, default 15%) already described in the project spec should be applied as a wave-level multiplier sampled once per trial, then each asset within the wave is perturbed around that common factor. This is not full Cholesky decomposition but it captures the essential correlation (shared infrastructure bottlenecks affect all assets simultaneously) without mathematical complexity.

Example structure per trial:
```
waveUncertaintyMultiplier = sampleNormal(1.0, uncertaintyFactor)  // shared
for each asset in wave:
  assetTime = baseTime[asset] * waveUncertaintyMultiplier * sampleNormal(1.0, assetVariance)
```

**Warning signs:**
- Кибербакап and Конкурент distribution peaks are suspiciously narrow for high uncertainty settings
- Setting uncertainty to 100% produces a distribution that still looks near-normal (should be wide and fat-tailed)
- Results do not change meaningfully when IT engineer count changes

**Phase to address:** Simulation math design phase, before any UI is built. This is a correctness issue that is very hard to retrofit.

---

### Pitfall 5: localStorage Quota Exceeded with Scenario Data

**What goes wrong:**
Saving scenarios including large simulation result arrays (10,000–200,000 trial values) to localStorage throws a silent `QuotaExceededError` that is unhandled. The user clicks "Save", sees no error, comes back later, and finds the scenario is gone. The localStorage limit is 5MB per origin; a single scenario with 50,000 float values is already ~400KB as JSON, and five scenarios exceed the limit.

**Why it happens:**
Developers wrap `localStorage.setItem()` without a try/catch. The error is thrown synchronously but not surfaced to the user. Additionally, saving raw trial arrays instead of only the KDE output and summary statistics inflates storage 100x unnecessarily.

**How to avoid:**
Two complementary strategies:
1. **Store only derived data, never raw trials.** A scenario needs: input parameters, KDE points (300 `{ x, y }` pairs), and summary statistics (best/median/worst, P5/P95). This is ~50KB per scenario maximum, supporting 80+ scenarios.
2. **Always wrap localStorage in try/catch.** Return a typed result and display a user-visible error message in Russian if quota is exceeded. Offer to delete old scenarios.

```typescript
function saveScenario(key: string, data: ScenarioSummary): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return { ok: true };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      return { ok: false, error: 'Превышен лимит хранилища. Удалите старые сценарии.' };
    }
    throw e;
  }
}
```

**Warning signs:**
- Saved scenario list shows 0 items after page reload despite successful save feedback
- No error boundary around localStorage operations
- Raw trial arrays appear in the data schema for saved scenarios

**Phase to address:** Scenario persistence phase. Define the save schema (no raw trials) before writing any persistence code.

---

### Pitfall 6: Vite dist Folder Cannot Be Opened with file:// Protocol

**What goes wrong:**
The project is distributed as a built `dist/` folder to sales staff on Windows 11 who open `index.html` by double-clicking. Modern browsers block ES module loading over the `file://` protocol due to CORS restrictions. The app fails with a console error like `Cross-Origin Request Blocked` and shows a blank page. This is a distribution-critical failure for a tool explicitly designed to run locally without a server.

**Why it happens:**
Vite builds use ES module syntax (`<script type="module">`). Browsers enforce CORS even for local files — a module script on `file://` cannot import another `file://` resource. This works fine during `vite dev` (served over HTTP) and is invisible during development.

**How to avoid:**
Two options, in order of preference:
1. **Bundle as a true single file.** Use `vite-plugin-singlefile` to inline all JS/CSS into one `index.html`. No module loading, no CORS issue, single file to distribute.
2. **Provide a launcher.** Include a `start.bat` that runs `npx vite preview --port 4173` and opens the browser. Requires Node.js on the salesperson's machine — adds deployment friction.

`vite-plugin-singlefile` is the correct choice for this distribution model. Validate during build phase, not after.

**Warning signs:**
- `npm run build` succeeds but double-clicking `dist/index.html` shows blank page
- Browser console shows module loading CORS errors
- App works in `vite preview` but not from file system

**Phase to address:** Build/deployment setup phase (earliest possible — validate distribution method before building features on top of it).

---

### Pitfall 7: React Stale Closure Capturing Initial State in Worker Callbacks

**What goes wrong:**
The Web Worker's `onmessage` handler is set up inside a `useEffect` with an empty dependency array `[]`. The handler closes over the initial values of state variables (e.g., `isRunning`, `progress`). When the worker sends progress updates, the handler sees stale state values and either ignores them, produces incorrect UI updates, or triggers duplicate simulation runs.

**Why it happens:**
`useEffect(() => { worker.onmessage = ... }, [])` is the idiomatic "setup once" pattern. It looks correct. The closure captures state at setup time. When state changes later, the closure still holds the old value.

**How to avoid:**
Use **functional state updates** in all worker message handlers. Instead of `setState(newValue)` based on current state, use `setState(prev => derive(prev, message))`. For values that need to be read (not just updated), store them in a `useRef` and read `ref.current` inside the closure.

```typescript
// Wrong: stale closure
worker.onmessage = (e) => {
  if (isRunning) setProgress(e.data.pct);  // isRunning is always initial value
};

// Correct: functional update + ref
const isRunningRef = useRef(isRunning);
isRunningRef.current = isRunning;
worker.onmessage = (e) => {
  if (isRunningRef.current) setProgress(e.data.pct);
};
```

**Warning signs:**
- Progress bar jumps from 0% to 100% without intermediate states
- Clicking "Cancel" during simulation has no effect
- Simulation reruns immediately after completion

**Phase to address:** Simulation engine phase, when wiring the Worker to React state.

---

### Pitfall 8: Multi-Step Form Data Lost on Browser Refresh or Step Navigation

**What goes wrong:**
The user fills in Step 1 (asset configuration), proceeds to Step 2 (infrastructure parameters), then accidentally hits the browser back button or refreshes. All Step 1 data is gone. In a sales context where the salesperson spent 3 minutes entering 20+ fields, this is a demo-killing failure.

**Why it happens:**
Form state lives in React component state or React Hook Form's internal store. Both are in-memory only. Browser navigation destroys the component tree.

**How to avoid:**
Persist wizard form state to `sessionStorage` (not localStorage — this is ephemeral session data, not a saved scenario) on every field change. On mount, rehydrate from `sessionStorage`. Clear on explicit "Reset" or successful submission.

Use a single top-level form state object (not per-step state) so serialization is a single `JSON.stringify`. With React Hook Form, use `watch()` to mirror values to sessionStorage.

**Warning signs:**
- Back button from Step 2 shows empty Step 1 fields
- No sessionStorage keys visible in DevTools Application tab during wizard navigation
- Form state defined as separate `useState` per step

**Phase to address:** Wizard form phase. Define the unified form data schema before building individual steps.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Sync simulation on main thread | Simpler code, no Worker setup | Frozen UI during demo — immediate user-visible failure | Never for >1,000 trials |
| Pass raw trial arrays to recharts | Skips KDE step | Browser crash at 50,000+ trials, mandatory refactor | Never |
| Store raw trials in localStorage | Simpler save logic | Quota exceeded after 3–5 scenarios | Never |
| Silverman's rule for KDE bandwidth | 3-line implementation | Wrong distribution shape for skewed/bimodal data | MVP only if bandwidth is configurable |
| Independent variable draws | Trivial implementation | Overconfident (too narrow) distributions in demo | MVP only, document as known limitation |
| Per-step React state for wizard | Simple mental model | Data loss on navigation, hard to serialize | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| recharts + KDE data | Passing `{ x: float, y: float }` with inconsistent x-axis domain across two series | Merge both Кибербакап and Конкурент KDE arrays into one shared x-axis domain before chart render; use `domain={[globalMin, globalMax]}` on `XAxis` |
| recharts + two AreaChart series | Creating two separate `ComposedChart` components | Use a single `ComposedChart` with two `Area` components; axes are calculated from the top-level `data` prop — mismatched data sources cause axis distortion |
| Web Worker + Vite | Worker file not recognized as a Worker module | Use `new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' })` — Vite-specific Worker instantiation pattern |
| localStorage + JSON | Storing `Date` objects — they serialize to strings but do not deserialize back to `Date` | Store timestamps as ISO strings, parse explicitly on load |
| vite-plugin-singlefile + assets | SVG icon imports break when inlined | Ensure lucide-react icons are used as React components (already inline SVG), not as external asset imports |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recomputing KDE on every render | Chart flickers; CPU spikes on unrelated state changes | `useMemo(() => computeKDE(trials), [trials])` | Immediately on first parent re-render |
| Recharts re-rendering on parent state | Progress percentage updates re-render the chart during simulation | Wrap chart in `React.memo`; keep simulation state and chart state in separate component subtrees | First time progress state updates |
| Synchronous localStorage reads on mount | App startup blocked for large serialized data | Move localStorage reads to a lazy initializer or `useEffect`; never read in component body | Scenarios exceed ~500KB total |
| X-axis tick calculation in recharts with large domain | `CartesianAxis` default `interval` calculates tick positions for every data point | Set `interval="preserveStartEnd"` or a numeric interval on `XAxis`; default causes O(n) tick calculation | >500 KDE points |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication during simulation | Salesperson thinks app is frozen; clicks Run again, queuing two simulations | Show percentage progress (from Worker messages) with cancel button; disable Run while running |
| Showing raw seconds on chart X-axis | "86400 seconds" is meaningless in a sales conversation | Auto-format axis labels as hours/days based on scale (e.g., `<48h` → hours, `≥48h` → days) |
| No explanation of uncertainty factor | User sets 15% without understanding impact; demo looks arbitrary | Tooltip or inline help text explaining the parameter in Russian |
| Export PNG captures whole page instead of chart only | Screenshot includes form inputs the salesperson does not want to share | Scope PNG export to chart container only using `html2canvas` with a specific DOM ref |
| Scenario names default to timestamps | "Scenario 2026-03-15T14:32:00" is not meaningful in a saved list | Prompt for scenario name on save; auto-suggest based on client name field if available |

---

## "Looks Done But Isn't" Checklist

- [ ] **Monte Carlo simulation:** Runs fast in dev with 1,000 trials — verify with 200,000 trials on a mid-range Windows machine (not developer's MacBook)
- [ ] **KDE chart:** Looks correct for a normal-ish distribution — verify with inputs that produce a bimodal or highly skewed distribution (e.g., 1 large DB + 100 tiny workstations)
- [ ] **Two-scenario overlay chart:** Кибербакап and Конкурент curves appear to overlap — verify that X-axis domain spans both distributions, not just one
- [ ] **Scenario save:** Appears to succeed — verify by checking `localStorage` in DevTools that raw trial data is NOT stored
- [ ] **dist folder distribution:** Works with `vite preview` — verify by double-clicking `dist/index.html` directly in Windows browser
- [ ] **Wizard form navigation:** Forward navigation works — verify Back button does not clear previously entered fields
- [ ] **Cancel simulation:** Cancel button present — verify it actually terminates the Worker (call `worker.terminate()`, not just set a flag)
- [ ] **CSV export:** Exports data — verify headers are in Russian, values are in meaningful units (hours/days), and the file opens correctly in Excel on Windows (UTF-8 BOM required for Russian characters)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| UI thread blocking (no Worker) | HIGH | Refactor simulation into Worker module; update all callers; re-test progress UI — typically 1–2 days |
| Wrong KDE bandwidth | LOW | Bandwidth is a constant — swap Silverman for ISJ; re-test chart output visually — hours |
| Recharts with raw trial data | HIGH | Requires defining KDE pipeline, refactoring data contracts throughout simulation → chart path — 1 day |
| localStorage quota exceeded | MEDIUM | Add try/catch; add scenario pruning UI; ensure save schema excludes raw trials — half day |
| file:// CORS blank page | MEDIUM | Add `vite-plugin-singlefile`; re-test all asset loading; update build/distribution docs — half day |
| Stale closure in Worker callback | LOW | Replace direct state reads with refs; add functional updates — hours |
| Form data loss on navigation | MEDIUM | Add sessionStorage persistence layer; define unified form schema — half day |
| Correlated variable assumption | HIGH | Requires rethinking simulation math, re-validating output distributions, re-testing all scenarios — 1–2 days |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| UI thread blocking | Simulation engine phase | Run 200,000 trials; progress bar animates; no long tasks in Chrome Performance panel |
| Wrong KDE bandwidth | Visualization phase | Test 3 distribution shapes; curve is neither spiky nor flat |
| Recharts raw data performance | Simulation engine phase (define contract) + visualization phase (enforce it) | Chart renders in <100ms after simulation completes |
| Independent variable assumption | Simulation math design (pre-implementation) | Setting uncertainty to 50% produces visibly wider distribution; Кибербакап and Конкурент curves change shape with engineer count |
| localStorage quota exceeded | Scenario persistence phase | Save 10 scenarios; verify total localStorage usage <2MB; QuotaExceeded handled gracefully |
| Vite file:// CORS | Build/deployment setup phase (first) | Double-click `dist/index.html` on Windows; app loads without console errors |
| Stale closure in Worker | Simulation engine phase | Cancel button terminates simulation; progress reflects actual Worker state |
| Form data loss on navigation | Wizard form phase | Fill Step 1, navigate to Step 2, press Back; Step 1 fields are populated |

---

## Sources

- [Recharts large dataset performance issue #1146](https://github.com/recharts/recharts/issues/1146)
- [Recharts CartesianAxis performance with large data #1465](https://github.com/recharts/recharts/issues/1465)
- [Recharts two lines with different data sources #1167](https://github.com/recharts/recharts/issues/1167)
- [Vite local file:// usage discussion #7587](https://github.com/vitejs/vite/discussions/7587)
- [React stale closure with hooks — dmitripavlutin.com](https://dmitripavlutin.com/react-hooks-stale-closures/)
- [Correlated variables in Monte Carlo simulations — Towards Data Science](https://towardsdatascience.com/correlated-variables-in-monte-carlo-simulations-19266fb1cf29/)
- [KDE bandwidth importance — aakinshin.net](https://aakinshin.net/posts/kde-bw/)
- [localStorage quota handling — TrackJS](https://trackjs.com/javascript-errors/failed-to-execute-setitem-on-storage/)
- [MDN Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [Web Workers for Monte Carlo — Twilio blog](https://www.twilio.com/blog/optimize-javascript-application-performance-web-workers)
- [React multi-step form with React Hook Form + Zustand — LogRocket](https://blog.logrocket.com/building-reusable-multi-step-form-react-hook-form-zod/)

---
*Pitfalls research for: React SPA Monte Carlo recovery time calculator (Калькулятор восстановления)*
*Researched: 2026-03-15*
