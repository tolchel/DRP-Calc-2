---
phase: 1
slug: foundation-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vite.config.ts` (test block) — Wave 0 installs |
| **Quick run command** | `npx vitest run src/engine` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/engine`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + `ls dist/ | wc -l` equals 1
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | UX-03 | smoke | `npm run build && [ $(ls dist/ \| wc -l) -eq 1 ]` | ❌ Wave 0 | ⬜ pending |
| 1-01-02 | 01 | 1 | SIM-02, SIM-03, SIM-04, SIM-07, SIM-10 | unit | `npx vitest run src/engine/simulation.test.ts` | ❌ Wave 0 | ⬜ pending |
| 1-01-03 | 01 | 1 | SIM-05, SIM-06, SIM-08 | unit | `npx vitest run src/engine/recovery.test.ts` | ❌ Wave 0 | ⬜ pending |
| 1-01-04 | 01 | 1 | SIM-09 | unit | `npx vitest run src/engine/constants.test.ts` | ❌ Wave 0 | ⬜ pending |
| 1-01-05 | 01 | 2 | SIM-01 | integration | Manual smoke in browser | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/engine/simulation.test.ts` — stubs for SIM-02, SIM-03, SIM-04, SIM-07, SIM-10
- [ ] `src/engine/recovery.test.ts` — stubs for SIM-05, SIM-06, SIM-08
- [ ] `src/engine/constants.test.ts` — stubs for SIM-09
- [ ] `vite.config.ts` test block — framework install: `npm install -D vitest`
- [ ] Build smoke check: `npm run build && ls dist/` (verify single file, covers UX-03)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Worker exists and responds with progress + result messages | SIM-01 | Web Worker API not available in Vitest Node environment | Open dist/index.html in browser, open DevTools console, trigger simulation, verify 20 progress messages followed by result |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
