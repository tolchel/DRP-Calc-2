---
phase: 01-foundation-engine
plan: 01
subsystem: infra
tags: [vite, react, typescript, vite-plugin-singlefile, vitest]

# Dependency graph
requires: []
provides:
  - Vite 7 + React 19 + TypeScript project scaffold
  - vite-plugin-singlefile build producing single dist/index.html
  - vitest installed and runnable (no test files yet)
  - worker.format es configured for future Web Worker support
affects:
  - 01-02
  - 01-03
  - 01-04
  - 01-05

# Tech tracking
tech-stack:
  added:
    - vite@7.3.1
    - react@19.2.4
    - react-dom@19.2.4
    - "@vitejs/plugin-react@4.x (downgraded from v6 for Vite 7 compat)"
    - vite-plugin-singlefile@2.3.0
    - vitest
    - "@testing-library/react"
    - "@testing-library/jest-dom"
    - jsdom
    - typescript@~5.9.3
  patterns:
    - "vite.config.ts: viteSingleFile() after react(), inlineDynamicImports:true, assetsInlineLimit:100M, cssCodeSplit:false"
    - "worker.format:'es' pre-configured for Plan 05 Web Worker"
    - "vitest test config in vite.config.ts via /// <reference types='vitest' />"
    - "tsconfig.app.json: strict=true, lib=ES2020+DOM+DOM.Iterable (no WebWorker — deferred to Plan 05)"
    - "useRef<T>(null) required in React 19 (not useRef<T>())"

key-files:
  created:
    - vite.config.ts
    - package.json
    - tsconfig.json
    - tsconfig.app.json
    - tsconfig.node.json
    - index.html
    - src/main.tsx
    - src/App.tsx
  modified: []

key-decisions:
  - "Downgraded to Vite 7 + @vitejs/plugin-react@4 — vite-plugin-singlefile 2.3.0 requires vite <=7; Vite 8 not yet supported"
  - "Cleared public/ of scaffold SVGs to satisfy single-file constraint (files in public/ are copied to dist/ by Vite)"
  - "Added /// <reference types='vitest' /> in vite.config.ts and vitest/config to tsconfig.node.json types for test config type-safety"
  - "index.html updated to Russian lang and proper app title, favicon removed"

patterns-established:
  - "Single-file build: dist/ must contain exactly 1 file after npm run build"
  - "No imports of CSS or assets from public/ in App files — keep App.tsx import-free until Plan 02"

requirements-completed: [UX-03]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 1 Plan 01: Project Scaffold + Single-File Build Validation Summary

**Vite 7 + React 19 + TypeScript scaffold validated as single self-contained dist/index.html (193 KB) via vite-plugin-singlefile — distribution constraint proven before any engine code**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T12:04:35Z
- **Completed:** 2026-03-15T12:08:04Z
- **Tasks:** 2
- **Files modified:** 8 created, 0 modified

## Accomplishments

- Project scaffold created from vite react-ts template with all required dependencies installed
- vite.config.ts configured with viteSingleFile(), inlineDynamicImports, worker.format:es — exact config for Plan 05 worker readiness
- UX-03 validated: `npm run build` produces exactly 1 file in dist/ (index.html, 193.56 KB / 60.91 KB gzip)
- vitest installed and runnable; 0 test files is expected — first tests added in Plan 02

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite + React + TypeScript project with all dependencies** - `7f74266` (feat)
2. **Task 2: Validate single-file build contract (UX-03)** - `1301603` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `vite.config.ts` - viteSingleFile plugin, worker.format:es, vitest test config
- `package.json` - drp-calc project, all dependencies
- `tsconfig.app.json` - strict:true, lib:ES2020+DOM+DOM.Iterable, target:ES2020
- `tsconfig.node.json` - added vitest/config to types for vite.config.ts type-safety
- `tsconfig.json` - project references (app + node)
- `index.html` - Russian lang, Калькулятор восстановления title, no favicon
- `src/App.tsx` - minimal placeholder: `<h1>DRP Calculator — Loading</h1>`
- `src/main.tsx` - createRoot (React 19 API), useRef<T>(null) comment

## Decisions Made

- **Vite 7 instead of Vite 8:** vite-plugin-singlefile 2.3.0 peer requires `vite <=7`. Scaffolded Vite 8 was downgraded to Vite 7 + @vitejs/plugin-react@4. This is the maximum supported version combination as of 2026-03-15.
- **public/ directory cleared:** Vite copies all public/ files to dist/ verbatim. Scaffold included favicon.svg and icons.svg which caused dist/ to contain 3 files. Removed to satisfy UX-03 single-file constraint.
- **/// reference types vitest:** The `test` block in vite.config.ts requires vitest type augmentation. Added triple-slash directive in vite.config.ts and `vitest/config` in tsconfig.node.json types.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error: `test` config block type not recognized in vite.config.ts**
- **Found during:** Task 1 (build verification)
- **Issue:** `tsc -b` failed with `TS2769: 'test' does not exist in type 'UserConfigExport'` — vitest types not loaded
- **Fix:** Added `/// <reference types="vitest" />` to vite.config.ts and `"vitest/config"` to tsconfig.node.json `types` array
- **Files modified:** `vite.config.ts`, `tsconfig.node.json`
- **Verification:** `npm run build` exits 0
- **Committed in:** `7f74266` (Task 1 commit)

**2. [Rule 3 - Blocking] Removed scaffold public assets that caused dist/ to have 3 files**
- **Found during:** Task 2 (single-file validation)
- **Issue:** dist/ contained favicon.svg, icons.svg, index.html (3 files) — failed UX-03
- **Fix:** Deleted public/favicon.svg and public/icons.svg; updated index.html to remove favicon link
- **Files modified:** `index.html`, `public/` (files deleted)
- **Verification:** `ls dist/ | wc -l` returns 1; "PASS: single file" confirmed
- **Committed in:** `1301603` (Task 2 commit)

**3. [Rule 3 - Blocking] Downgraded Vite 8 to Vite 7 for vite-plugin-singlefile compatibility**
- **Found during:** Task 1 (npm install vite-plugin-singlefile)
- **Issue:** `npm error ERESOLVE: peer vite@"^5.4.11 || ^6.0.0 || ^7.0.0" from vite-plugin-singlefile@2.3.0` — Vite 8 not supported
- **Fix:** `npm install vite@^7.0.0 @vitejs/plugin-react@^4.0.0 --save-dev`
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm install vite-plugin-singlefile` succeeds; build passes
- **Committed in:** `7f74266` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes necessary for correctness and build success. No scope creep. Vite 7 downgrade is the primary finding — must be noted for all subsequent plans that reference Vite version.

## Issues Encountered

- Vite scaffold `npm create vite@latest . --force` failed in non-empty directory — scaffolded in /tmp and copied files manually. No impact on outcome.
- Vite 8 + @vitejs/plugin-react@6 generated by scaffold, both downgraded to Vite 7 / plugin-react@4 for vite-plugin-singlefile compatibility.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Project scaffold ready for Plan 02 (types and interfaces)
- vite.config.ts worker.format:es already set — Plan 05 Web Worker will work without config changes
- vitest installed — Plan 02 can add test files immediately
- **Important for all subsequent plans:** Vite version is 7.3.x (not 8.x). Dependencies must be compatible with Vite 7.

---
*Phase: 01-foundation-engine*
*Completed: 2026-03-15*
