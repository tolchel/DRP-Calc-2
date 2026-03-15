---
phase: 3
slug: persistence-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
| **Config file** | `vite.config.ts` — `test` block, `environment: 'node'`, `include: ['src/**/*.test.ts']` |
| **Quick run command** | `npx vitest run src/hooks/useScenarios.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

**Note:** `useScenarios.test.ts` requires `// @vitest-environment jsdom` file-level annotation for localStorage access. `jsdom` is already installed as a dev dependency — no `npm install` needed.

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/hooks/useScenarios.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | SCEN-01, SCEN-03, SCEN-04 | unit | `npx vitest run src/hooks/useScenarios.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | SCEN-05 | unit | `npx vitest run src/components/ComparisonScreen.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | SCEN-01 | manual smoke | visual check | N/A | ⬜ pending |
| 3-02-02 | 02 | 2 | SCEN-02, SCEN-03, SCEN-04 | manual smoke | visual check | N/A | ⬜ pending |
| 3-03-01 | 03 | 3 | SCEN-01 | unit | `npx vitest run src/hooks/useScenarios.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 3 | SCEN-04 | manual smoke | visual check | N/A | ⬜ pending |
| 3-04-01 | 04 | 4 | SCEN-05 | unit | `npx vitest run src/components/ComparisonScreen.test.ts` | ❌ W0 | ⬜ pending |
| 3-04-02 | 04 | 4 | SCEN-05 | manual smoke | visual check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/types/scenario.ts` — `SavedScenario` interface; must exist before hook and tests can import it
- [ ] `src/hooks/useScenarios.test.ts` — stubs for SCEN-01, SCEN-03, SCEN-04; requires `// @vitest-environment jsdom` at top of file
- [ ] `src/components/ComparisonScreen.test.ts` — stubs for `mergeKDEs` helper (SCEN-05); can use default `node` environment (pure function)

Framework install: none needed — vitest 4.1.0 and jsdom are already in `devDependencies`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Save widget only visible on results page (step 3 with result) | SCEN-01 | DOM render depends on App.tsx step state | Navigate to results page, verify save widget appears; navigate to step 1, verify widget absent |
| `handleLoadScenario` restores form values, triggers simulation, navigates to results | SCEN-02 | Multi-step App.tsx state transition | Save a scenario, reload page, click "→" on saved row, verify results page shows correct output |
| Inline "Удалить?" confirmation replaces row buttons | SCEN-04 | Conditional render depends on per-row state | Click "×" on a scenario row, verify "Удалить? Да / Нет" appears; click "Нет" to cancel, click "Да" to confirm deletion |
| Comparison screen shows 4 KDE curves with legend | SCEN-05 | recharts rendering requires a real browser environment | Select 2 scenarios, click "Сравнить выбранные (2)", verify 4 curves and legend on chart |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
