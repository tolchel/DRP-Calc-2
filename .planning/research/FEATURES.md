# Feature Research

**Domain:** DRP (Disaster Recovery Planning) calculator / backup vendor sales demo tool
**Researched:** 2026-03-15
**Confidence:** MEDIUM — domain is specialized; backed by analysis of comparable tools (Datto RTO calculator, vendor comparison pages) and general patterns from sales-tool and Monte Carlo visualization research.

## Feature Landscape

### Table Stakes (Users Expect These)

Features that a sales rep using this tool will assume exist. Missing any of these makes the tool feel broken or unprofessional during a client meeting.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multi-step wizard form (Step 1: assets, Step 2: infrastructure) | Long-form data entry in one screen causes drop-off and errors; wizards are the standard UX for parameter-heavy calculators (Datto RTO tool, Iternal DR calculator all use stepped flow) | MEDIUM | Two steps as specified: asset config (DB, servers, file storage, workstations) then infrastructure config (tape libraries, storage arrays, IT engineers, network params) |
| Infrastructure parameter inputs with sensible defaults | Users don't know exact values for every field; defaults reduce friction. Uncertainty factor default of 15% is explicitly specified. | LOW | Defaults prevent blank-result errors during live demos |
| Progress indicator between steps | Users must know where they are in the wizard; absence feels like a broken form | LOW | Progress bar between Step 1 and Step 2, as specified in PROJECT.md |
| Monte Carlo simulation output (10,000–200,000 trials) | The core value proposition — showing probability-weighted recovery time ranges rather than single deterministic numbers. Any DR calculator that outputs only one number is less credible than one showing uncertainty. | HIGH | Engine runs client-side; performance budget matters (200k trials in browser must stay under ~3–5 seconds) |
| Probability density distribution chart | The visual output that makes Monte Carlo meaningful. Users need to see "most likely" vs "tail risk" recovery times. | HIGH | KDE-smoothed histogram via recharts; two overlaid curves (Кибербакап vs Конкурент) |
| Best / Median / Worst case summary metrics | Stakeholders want headline numbers, not just charts. Every comparable tool (Datto, Braver Technology, BSC Designer) surfaces best/median/worst prominently. | LOW | Computed from simulation percentiles (P5, P50, P95 or configurable) |
| Asset-type recovery timeline view | Shows recovery order by priority (DB → Servers → File Storage → Workstations) and approximate time per wave. Contextualizes the distribution chart. | MEDIUM | Gantt-style or stacked bar per asset type |
| Two-scenario comparison on one chart | The primary sales motion — Кибербакап (direct tape-to-target) vs Конкурент (two-phase: tape→SAN→target). Without side-by-side comparison the tool has no competitive differentiation. | MEDIUM | Overlaid density curves with distinct colors; requires both scenarios use identical input parameters |
| Input validation with clear error states | Bad inputs produce nonsense simulation results; a crashed demo loses the sale | LOW | Required field highlighting, range checks on data volumes and network speeds |
| Russian-language UI | Tool is used by Russian-speaking sales team; English UI would be unusable in context | LOW | All labels, tooltips, axis titles, and summary text in Russian |

### Differentiators (Competitive Advantage)

Features that elevate this tool above a static spreadsheet or a generic online RTO calculator. Align with the core value proposition: "seller gets a convincing visual in 5 minutes."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Save and load named scenarios via localStorage | Seller can prepare customer-specific scenarios before the meeting and reload them on-site without re-entering data. No comparable free tool offers this. | MEDIUM | Named scenario list; JSON serialized to localStorage; warn user that browser cache clear destroys data |
| Export chart as PNG | Seller can paste the density comparison chart directly into a proposal or email after the meeting | LOW | html-to-image or canvas-based screenshot of the recharts SVG; one button |
| Export simulation data as CSV | Technical buyer or IT manager may want to audit the numbers; having raw trial data available increases credibility | MEDIUM | Write 10k–200k rows to CSV via Blob download; may need sampling for large trial counts |
| Uncertainty adjustment slider (0–100%, default 15%) | Lets the seller model conservative vs optimistic assumptions live during the meeting, showing how robust Кибербакап's advantage is even under pessimistic assumptions | LOW | Applies as a multiplier to each recovery "wave"; re-runs simulation on change |
| IT engineer shift model (8h shifts, 24/7 coverage) | Accurately models parallelism in the launch/verify phase based on real engineer count, making results specific to the customer's actual headcount | MEDIUM | Non-obvious calculation: engineer count drives concurrency of asset-verification tasks |
| Per-asset-type volume inputs | Granular inputs (number of DBs + avg size, number of servers + avg size, etc.) produce more credible output than a single "total data" field | LOW | Covered by Step 1 form spec; differentiates from tools that take only aggregate data volume |
| Real-time simulation progress feedback | For trial counts above 50k, a progress indicator prevents "is it frozen?" confusion during the demo | LOW | Simple percentage counter or animated spinner during simulation run |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Backend server / remote persistence | "What if the seller demos on a different machine?" or "Let's sync scenarios across the team" | Adds deployment complexity, requires hosting, creates auth/security surface, contradicts the explicit out-of-scope decision in PROJECT.md. For v1 a server would delay delivery without validating the core value. | Export scenario as JSON file for manual transfer between machines; localStorage is sufficient for v1 |
| User accounts / login | "We want each rep to have their own scenario library" | Same deployment and maintenance burden as above; completely out of scope for a dist-folder static app | Named scenario list in localStorage is sufficient; if multi-user sync becomes a real need it belongs in v2 with a proper backend |
| Mobile / tablet optimization | "Sellers might demo on a tablet" | The explicit stated priority is desktop (Windows 11 browser). Responsive polish costs time and can compromise the dense data-entry forms and chart legibility that work well at desktop widths. | Acknowledge limitation in README; add a viewport warning banner on small screens |
| Workstation recovery conditions (bootable USB, etc.) | Completeness — why not model all asset types fully? | Explicitly marked "temporarily not counted" in the PROJECT.md spec. Adding it now would require additional simulation logic and input fields before the core flow is validated. | Keep workstations as a count/volume input that contributes to timeline but uses a simplified model; mark with a tooltip explaining the simplification |
| Real-time collaborative editing | "Two people editing the same scenario" | No server means no real-time sync. Attempting this with localStorage + BroadcastChannel adds complexity for a use case that doesn't exist in practice (one seller, one screen). | Not needed; single-user tool |
| Animated / video export | "We want to show the simulation running live" | High implementation cost (canvas recording), large file output, no clear sales value over a static PNG | PNG export plus live demo of the tool covers this need |
| Financial cost modeling (downtime cost in dollars) | Generic DR ROI calculators (Datto, Braver) include this | This tool's value is showing *time* advantage, not financial ROI — adding cost inputs risks diluting the message and requires customer revenue/salary data the seller may not have | Keep focus on recovery time; let the seller translate time advantage into cost verbally during the meeting |

## Feature Dependencies

```
[Step 1 Asset Form]
    └──required by──> [Monte Carlo Simulation Engine]
                          └──required by──> [KDE Distribution Chart]
                          └──required by──> [Best/Median/Worst Metrics]
                          └──required by──> [CSV Export]

[Step 2 Infrastructure Form]
    └──required by──> [Monte Carlo Simulation Engine]
    └──required by──> [IT Engineer Shift Model]
                          └──enhances──> [Monte Carlo Simulation Engine]

[Monte Carlo Simulation Engine]
    └──required by──> [Two-Scenario Comparison Chart]
    └──required by──> [Asset Timeline View]
    └──required by──> [PNG Export] (chart must render first)

[Scenario Save/Load]
    └──depends on──> [Step 1 Asset Form] (must serialize complete form state)
    └──depends on──> [Step 2 Infrastructure Form]
    └──enhances──> [Uncertainty Slider] (saved scenarios include uncertainty setting)

[Progress Bar]
    └──depends on──> [Wizard Step Navigation]

[CSV Export] ──conflicts with high trial counts──> [Browser Memory]
    (mitigate: offer CSV for ≤50k trials or downsample above that)
```

### Dependency Notes

- **Simulation engine requires both forms:** Step 1 supplies asset count/volume, Step 2 supplies infrastructure parameters (tape speed, network speed, engineer count). Neither form alone produces a runnable simulation.
- **Chart requires simulation:** All visualization features (density curve, timeline, metrics) are downstream of a completed simulation run. Charts must not render until simulation completes.
- **Save/Load requires stable form schema:** If form field names or structure change after localStorage scenarios are saved, loading old scenarios will fail silently. Pin the schema early or implement a version/migration field.
- **CSV export vs browser memory:** At 200,000 trials × 2 scenarios, the raw data array is ~3.2M numbers. Generating a full CSV in-browser is feasible but may cause a brief UI freeze. Either cap CSV export at 50k trials or generate it in a Web Worker.
- **Two-scenario comparison requires shared inputs:** Both Кибербакап and Конкурент scenarios are computed from the same customer inputs; the only variable is the recovery method model. The "second scenario" is not a separate form but a parallel simulation run using a different algorithm.

## MVP Definition

### Launch With (v1)

Minimum feature set to validate the core sales use case.

- [ ] Step 1 wizard form (asset types: DB, servers, file storage, workstations — count + avg volume per type) — the data collection foundation
- [ ] Step 2 wizard form (tape libraries, storage arrays, IT engineers, network params, uncertainty %) — infrastructure parameters
- [ ] Progress bar between steps — basic wizard UX
- [ ] Monte Carlo simulation engine (configurable trial count, default 50k) for both Кибербакап and Конкурент models
- [ ] KDE density distribution chart (recharts) with both scenarios overlaid, distinct colors
- [ ] Best / Median / Worst case metrics panel — headline numbers for the customer conversation
- [ ] Asset-type recovery timeline view — shows priority order and duration per wave
- [ ] Save and load named scenarios via localStorage — sellers must be able to prepare before meetings
- [ ] Export chart as PNG — minimum post-meeting deliverable
- [ ] Russian-language UI throughout

### Add After Validation (v1.x)

Add once the core sales flow is confirmed to work in real demos.

- [ ] CSV export of trial data — add when technical buyers start asking for data audit trail
- [ ] Uncertainty slider with live simulation re-run — add when sellers report needing to show sensitivity analysis during demos
- [ ] Real-time simulation progress feedback — add if trial count > 50k causes noticeable freeze complaints

### Future Consideration (v2+)

Defer until v1 is validated and a backend investment is justified.

- [ ] Backend persistence and scenario sync across devices — requires server; defer until multi-rep use case is confirmed
- [ ] Workstation recovery full modeling (bootable USB, imaging speed) — defer per explicit out-of-scope decision; revisit when Step 1–2 flow is validated
- [ ] Financial cost overlay (downtime cost in rubles/dollars) — defer; risks scope creep and diluting the time-focus message

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Wizard form (Step 1 + Step 2) | HIGH | MEDIUM | P1 |
| Monte Carlo simulation engine | HIGH | HIGH | P1 |
| KDE density chart (two scenarios) | HIGH | HIGH | P1 |
| Best/Median/Worst metrics | HIGH | LOW | P1 |
| Asset timeline view | HIGH | MEDIUM | P1 |
| Save/Load scenarios (localStorage) | HIGH | MEDIUM | P1 |
| PNG export | MEDIUM | LOW | P1 |
| Progress bar | LOW | LOW | P1 |
| Russian UI | HIGH | LOW | P1 |
| Uncertainty slider (live re-run) | MEDIUM | LOW | P2 |
| CSV export | MEDIUM | MEDIUM | P2 |
| Simulation progress indicator | LOW | LOW | P2 |
| IT engineer shift model (full parallelism) | MEDIUM | MEDIUM | P2 |
| Workstation full modeling | LOW | HIGH | P3 |
| Financial cost overlay | LOW | MEDIUM | P3 |
| Backend/multi-user persistence | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

Comparable tools analyzed: Datto RTO Calculator, Iternal DR Planning Calculator, Braver Technology Downtime Cost Calculator, BSC Designer DR Scorecard.

| Feature | Datto RTO Calculator | Generic DR Calculators | This Tool (Plan) |
|---------|----------------------|------------------------|------------------|
| Stepped wizard form | Yes (2 sections) | Varies (often single page) | Yes (2 steps with progress bar) |
| Monte Carlo / probabilistic output | No — deterministic single values | No — deterministic | Yes — core differentiator |
| Two-product comparison on one chart | Yes (Current vs Datto) | No | Yes (Кибербакап vs Конкурент) |
| Export results | No (only "request a demo" CTA) | No / PDF only | Yes (PNG + CSV) |
| Save/Load named scenarios | No | No | Yes (localStorage) |
| Asset-type breakdown | Aggregate only | Aggregate only | Per-type (DB/server/files/workstations) |
| Offline / local operation | No (web service) | No | Yes (dist folder, no server) |
| Financial downtime cost | Yes — primary output | Often primary focus | Out of scope for v1 |

**Key finding:** No publicly available DR calculator combines probabilistic Monte Carlo output with two-product comparison and local save/load. The Monte Carlo + comparison chart combination is a genuine differentiator in this space (MEDIUM confidence — verified by absence in Datto, Iternal, Braver, BSC Designer tools, though exhaustive coverage of all commercial tools is not claimed).

## Sources

- [Datto RTO Calculator](https://www.datto.com/rto/) — feature structure and comparison approach (verified via WebFetch)
- [Iternal AI DR Planning Calculator](https://iternal.ai/calculators/disaster-recovery-planning-calculator) — contemporary feature set
- [Braver Technology Downtime Cost Calculator](https://bravertechnology.com/services/disaster-recovery/recovery-time-downtime-cost-calculator/) — export and scenario features
- [BSC Designer DR Scorecard](https://bscdesigner.com/disaster-recovery.htm) — multi-asset, KPI-per-asset approach
- [NN/g Wizard UI Pattern Guidelines](https://www.nngroup.com/articles/wizards/) — wizard UX best practices
- [Josh W. Comeau — Persisting React State in localStorage](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/) — localStorage pattern for React
- [React Graph Gallery — Density Plot](https://www.react-graph-gallery.com/density-plot) — KDE implementation in React/D3
- PROJECT.md (Калькулятор восстановления) — authoritative scope and constraints

---
*Feature research for: DRP Calculator / Кибербакап sales demo tool*
*Researched: 2026-03-15*
