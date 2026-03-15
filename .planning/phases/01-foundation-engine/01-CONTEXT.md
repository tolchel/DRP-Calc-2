# Phase 1: Foundation + Engine - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Greenfield project scaffold (Vite + React + vite-plugin-singlefile) and Monte Carlo simulation engine running in a Web Worker. No UI is built in this phase. The deliverables are: a working single-file HTML build and a callable simulation engine that returns SimulationResult for both Кибербакап and Конкурент scenarios.

</domain>

<decisions>
## Implementation Decisions

### IT Engineer Concurrency Model
- Concurrent verifiers per shift = floor(N ÷ 3), where N = engineer count entered by user
- If N < 3, some shifts have zero engineers → 8-hour pause in verification during those shifts
- Minimum allowed input = 1 (0 is forbidden in the form)
- Verification is sequential: 1 engineer handles 1 object at a time
- Engineer begins verifying an object immediately after its data transfer completes — does not wait for the full wave
- Data transfer for the next wave runs in parallel with engineer verification of the current wave

### Startup Time After Recovery
- Fixed 30 minutes for ALL asset types (БД, Сервер, ФС, РС) — no stochastic variation
- Hardcoded constant in the engine — not configurable via UI
- The uncertainty multiplier (SIM-07/SIM-08) applies to data transfer time, not startup time

### Simulation Pairing (Кибербакап vs Конкурент)
- Both scenarios computed in one shared trial loop — same random draws per trial
- Shared stochastic factors: network speed variation (±20%) and engineer availability reduction
- Scenarios differ only in recovery logic (direct tape→objects vs two-phase tape→SAN→objects)
- This ensures fair comparison: the difference comes from logic, not random noise

### Progress Reporting
- Worker posts progress every 5% completion (20 messages total per simulation run)
- Message format: `{ type: 'progress', percent: N }` where N is 0–100
- Single unified progress 0–100% covers both scenarios together (Кибербакап runs first 0–50%, Конкурент 50–100%)
- Final message: `{ type: 'result', data: SimulationResult }`

### Claude's Discretion
- Project folder structure (src/engine/, src/workers/, src/types/)
- KDE bandwidth selection (Sheather-Jones implementation details)
- TypeScript strict mode settings and tsconfig
- Vite config for vite-plugin-singlefile

</decisions>

<specifics>
## Specific Ideas

- No specific UI references — this phase has no UI
- The simulation engine should be callable with a plain SimulationInput object and return SimulationResult synchronously (for unit testing), with the Web Worker wrapper being a separate layer

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — completely greenfield project

### Established Patterns
- None yet — this phase establishes the patterns

### Integration Points
- Phase 2 will import SimulationInput and SimulationResult types from the engine
- Phase 2 will communicate with the worker via postMessage/onmessage
- vite-plugin-singlefile must be validated in this phase before any UI work begins

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-engine*
*Context gathered: 2026-03-15*
