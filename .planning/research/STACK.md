# Stack Research

**Domain:** Local React SPA — data visualization + Monte Carlo simulation tool
**Researched:** 2026-03-15
**Confidence:** MEDIUM-HIGH (core stack HIGH; export tooling MEDIUM)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.x | UI framework | Stable production release as of Dec 2024. Automatic memoization via React Compiler removes manual `useMemo`/`useCallback` overhead — relevant for this app's heavy re-render scenarios during simulation. React 18 remains viable but 19 is the forward path for new projects. |
| TypeScript | 5.x | Type safety | Bundled with `react-ts` Vite template. Enforces correctness for simulation parameter shapes, chart data contracts, and localStorage schema — critical when logic is all in-browser with no server validation. |
| Vite | 8.x | Build tool + dev server | Current stable as of March 2026 (ships with Rolldown bundler for 10-30x faster builds). `npm create vite@latest -- --template react-ts` scaffolds the entire setup. No config needed for this SPA use case. |
| Tailwind CSS | 4.x | Styling | v4 integrates as a Vite plugin (`@tailwindcss/vite`) — no PostCSS config, no `tailwind.config.js` required. Minimal setup overhead. Fits the "white + grey tones" minimalist design spec without custom CSS files. |

### Visualization & Simulation

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| recharts | 3.8.x | KDE density charts, timeline charts | Stack requirement from PROJECT.md. v3 is the current major with rewritten state management. Use `ComposedChart` + `AreaChart` for KDE overlay. Custom KDE computation (Gaussian kernel) must be pre-computed in JS before passing to recharts — recharts does not compute KDE natively. |
| comlink | 4.4.2 | Web Worker RPC layer | 200k Monte Carlo iterations on the main thread will freeze the UI for 2-5 seconds. Comlink wraps `postMessage` in an async/await interface, making worker calls feel like regular function calls. Use with Vite's built-in `new Worker(new URL('./worker.ts', import.meta.url))` pattern — no plugin required. |

### Export

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| html-to-image | latest (~1.11.x) | PNG export of chart DOM elements | Preferred over html2canvas for SVG-heavy content (recharts renders SVG). Uses `foreignObject` serialization — handles SVG charts better than html2canvas's canvas-repaint approach. Provides `toPng(element)` async function. Over 1.6M monthly downloads as of 2025. |
| papaparse | 5.x | CSV generation + download | Industry standard for CSV in JS (5M+ weekly downloads). Use `Papa.unparse(data)` to serialize trial results array, then trigger a `Blob` download. No React wrapper needed — raw `papaparse` is sufficient for export-only (no import). |

### Persistence & State

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| usehooks-ts | latest (3.x) | `useLocalStorage` hook | Provides typed, reactive `useLocalStorage<T>(key, default)` with automatic JSON serialization/deserialization. Eliminates boilerplate for scenario save/load. Tree-shakable — only the hooks you import are bundled. |

### Icons & UI

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.577.x | Icon set | Stack requirement from PROJECT.md. Tree-shakable: `import { ChevronRight } from 'lucide-react'`. Do not import the full barrel — always import named icons to keep bundle size minimal. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint + `@typescript-eslint` | Linting | Vite template includes baseline config. Add `eslint-plugin-react-hooks` to catch missing `useEffect` dependencies — critical when simulation hooks are involved. |
| Vite `vite-plugin-inspect` | Bundle analysis | Optional. Use during build to verify Web Worker chunks are splitting correctly. |

---

## Installation

```bash
# Scaffold project (includes React, TypeScript, Vite)
npm create vite@latest drp-calc -- --template react-ts
cd drp-calc

# Tailwind v4 (Vite plugin)
npm install tailwindcss @tailwindcss/vite

# Visualization
npm install recharts

# Web Worker RPC
npm install comlink

# PNG export
npm install html-to-image

# CSV generation
npm install papaparse
npm install -D @types/papaparse

# localStorage hook
npm install usehooks-ts

# Icons
npm install lucide-react
```

**vite.config.ts additions:**
```typescript
import tailwindcss from '@tailwindcss/vite'
// add tailwindcss() to plugins array
```

**src/index.css:**
```css
@import "tailwindcss";
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| recharts 3 | Victory, Nivo, Plotly.js | Victory: simpler API but smaller ecosystem. Nivo: beautiful defaults but heavier bundle. Plotly: built-in statistical charts including KDE but ~3MB bundle — overkill for a local tool. Recharts is fixed by project constraints. |
| comlink | Raw `postMessage` + `MessageChannel` | If the team is comfortable with manual serialization and doesn't want the tiny dependency. Raw postMessage is fine for simple cases; comlink pays off when passing complex objects or calling multiple worker methods. |
| html-to-image | html2canvas | html2canvas is more battle-tested for complex layouts with CSS gradients, but struggles with inline SVGs. Since recharts renders pure SVG, html-to-image is the better fit. Use html2canvas only if html-to-image has rendering issues on Windows 11 Chrome. |
| papaparse (raw) | react-papaparse | react-papaparse adds a React component wrapper useful for CSV import UIs. This project only needs export — raw papaparse is lighter and sufficient. |
| usehooks-ts | Custom `useLocalStorage` hook | Implementing your own is ~30 lines and avoids a dependency. Use the custom approach if usehooks-ts introduces any SSR-related quirks (though irrelevant here since this is a pure SPA). |
| Tailwind CSS v4 | CSS Modules or plain CSS | CSS Modules are fine for isolated components. Tailwind's utility classes are faster for the multi-step form layout and progress-bar UI described in requirements. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Next.js / Remix | Server framework overhead for a pure SPA delivered as a `dist/` folder. No SSR needed. | Vite + React (no framework) |
| Redux / Zustand for simulation state | The app has two top-level scenarios and a form — React context + useState is sufficient. Adding a state manager creates unnecessary complexity. | React Context + `useReducer` for form state; `usehooks-ts` for persistence |
| recharts-to-png | Depends on html2canvas; has known incompatibilities with recharts v3 (see recharts/recharts GitHub issue). Not maintained for v3. | html-to-image directly on the chart container div |
| D3.js directly | D3 is powerful but adds complexity when recharts already wraps it. Mixing D3 DOM mutations with React's virtual DOM creates subtle bugs. | recharts for all chart rendering; compute KDE data manually in plain JS using the Gaussian kernel formula |
| Web Workers without comlink (raw postMessage only) | At 200k trials, the worker result payload will be large. Raw postMessage with structured clone is fine, but handling multiple async calls and cancellation without comlink requires significant boilerplate. | comlink for clean async worker interface |
| IndexedDB for scenario persistence | Overkill for JSON scenario objects of <5KB each. localStorage handles up to ~5MB and is synchronous-read (fast for initial load). | localStorage via `usehooks-ts` |

---

## Stack Patterns by Variant

**For the Monte Carlo worker:**
- Use Vite's native `new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' })` — no vite-plugin-comlink needed, Vite handles worker splitting automatically.
- Wrap with `Comlink.wrap<WorkerAPI>(worker)` on the main thread.
- Export `Comlink.expose({ runSimulation })` from the worker file.
- Return typed `Float64Array` or plain `number[]` for the trials array — structured clone is efficient for typed arrays.

**For KDE density chart:**
- Pre-compute KDE in the Web Worker alongside the simulation (same thread, no extra overhead).
- Return `{ x: number, density: number }[]` points to the main thread.
- Render with recharts `AreaChart` using this pre-computed array.
- Bandwidth selection: use Silverman's rule (`h = 1.06 * std * n^(-1/5)`) — no library needed, ~5 lines of JS.

**For PNG export:**
- Target the chart wrapper `<div ref={chartRef}>` (not the recharts root, which is SVG).
- Call `toPng(chartRef.current, { backgroundColor: '#ffffff' })` — white background prevents transparent PNG on Windows.
- Trigger download via `<a>` with `href=dataURL` and `download="chart.png"`.

**For CSV export:**
- Store raw trial results as a `number[]` on state (or in a ref to avoid re-renders).
- On export: `Papa.unparse(trials.map((t, i) => ({ trial: i+1, recovery_time_hours: t })))`.
- Trigger `Blob` download with `application/csv` MIME type.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| recharts@3.8.x | React 18 + React 19 | React 19 requires `npm install recharts --legacy-peer-deps` or overriding `react-is` peer dep. React 18 works natively. If using React 19, test for any peer dep warnings at install time. |
| lucide-react@0.577.x | React 18 + React 19 | No compatibility issues reported. |
| html-to-image | All modern Chromium browsers | Works on Windows 11 Chrome/Edge. Does not support IE. Cross-origin images in charts will cause CORS errors — not relevant here since all data is local. |
| comlink@4.4.2 | Vite 8, TypeScript 5 | Works with Vite's native Worker URL syntax. No Vite plugin needed. The `vite-plugin-comlink` plugin exists but is optional and adds complexity — skip it. |
| usehooks-ts@3.x | React 18 + React 19 | Fully compatible. Requires TypeScript; has full type exports. |
| Tailwind CSS@4.x | Vite 8 | Use `@tailwindcss/vite` plugin, NOT the PostCSS approach. PostCSS integration is legacy for v4. |

---

## Sources

- recharts npm page — confirmed latest version 3.8.0, React 19 peer dep note (MEDIUM confidence — npm page, March 2026)
- recharts v3 migration guide: https://github.com/recharts/recharts/wiki/3.0-migration-guide — API breaking changes (HIGH confidence — official wiki)
- comlink npm page / GitHub — version 4.4.2, 1.1kB, Google Chrome Labs (HIGH confidence — official)
- Vite 8 announcement / npm — Rolldown bundler, version 8.0.0 (MEDIUM confidence — release news, npm)
- React 19 blog: https://react.dev/blog/2024/12/05/react-19 — stable release (HIGH confidence — official)
- React 19.2.4 npm — latest stable as of Jan 2026 (HIGH confidence — npm)
- html-to-image vs html2canvas comparison: https://medium.com/better-programming/heres-why-i-m-replacing-html2canvas-with-html-to-image-in-our-react-app-d8da0b85eadf (MEDIUM confidence — developer experience article)
- Tailwind CSS v4 Vite setup: https://tailwindcss.com/blog/tailwindcss-v4 (HIGH confidence — official)
- usehooks-ts docs: https://usehooks-ts.com/react-hook/use-local-storage (HIGH confidence — official library docs)
- lucide-react npm — version 0.577.0 as of March 2026 (HIGH confidence — npm)
- papaparse.com — 5M+ weekly downloads, JSON→CSV with `unparse()` (HIGH confidence — official)

---

*Stack research for: Калькулятор восстановления (DRP-Calc-2)*
*Researched: 2026-03-15*
