# AimSense

> Sensitivity calibration tool for FPS players · Frontend only · No backend

Quantify your performance across different eDPI values through **Clicking** and **Tracking** tests (skill-agnostic) to find your personal optimal sensitivity.

[中文](./README.md) | [Live Demo](https://joyfish666.github.io/AimSense/) | [Plan](./PLAN.md)

## Live Demo

**https://joyfish666.github.io/AimSense/**

> Desktop browser required (Chrome / Edge / Firefox). Mobile is not supported.

## Features

- **Real-time eDPI** — `eDPI = DPI × sensitivity multiplier`, with `cm/360°` reference and out-of-range warnings
- **Clicking Test** — 20 random targets; metrics: first-shot accuracy, offset distance, overshoot oscillation, split-time comparison
- **Tracking Test** — 4 speed tiers (150 / 300 / 600 / 900 px/s) × 3 runs, horizontal linear motion with edge bounce, per-frame error and signed directional bias sampling
- **Skill-agnostic Analysis** — Per-run directional suggestion (too high / too low / good), multi-run score vs. eDPI curve to locate the sweet spot
- **Separate Leaderboards & History** — Independent clicking/tracking leaderboards, score trend charts (`ScoreChart`), local persistence with per-record deletion
- **Fast Retest Loop** — Adjust sensitivity by `±0.05 / 0.1 / 0.2` and retest directly from the result page, restart same mode, or switch mode

## Getting Started

```bash
# Requirements: Node.js >= 20
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build -> dist/
npm run preview  # preview production build
npm run lint     # oxlint
```

## Tech Stack

| Category | Stack |
|----------|-------|
| Build / Framework | Vite 8 + React 19 |
| Language | JavaScript (ESM) |
| Styling | Vanilla CSS, dark CS-inspired theme |
| Runtime | `requestAnimationFrame` sampling, `performance.now()`, `PointerEvent` |
| Persistence | `localStorage` (`aimsense.settings` / `aimsense.records`) |
| Lint | oxlint |

## Project Structure

```
src/
├── App.jsx                 # Lightweight state router + record persistence / sample downsampling
├── pages/
│   ├── Settings.jsx        # DPI/multiplier input, eDPI display, test entry, history boards
│   ├── ClickingTest.jsx    # Clicking test
│   ├── TrackingTest.jsx    # Tracking test
│   └── Result.jsx          # Score, suggestion, visualizations, retest actions
├── components/             # TargetBall / Crosshair / HUD / ScoreChart / RecordList, etc.
├── hooks/                  # useClickingTest / useTrackingTest / useLocalStorage / useCountUp
├── logic/
│   ├── metrics.js          # Metric computation
│   ├── analyze.js          # Per-run suggestion & multi-run comparison
│   └── sensitivity.js      # eDPI / cm360 conversion & validation
└── styles/index.css
```

See [PLAN.md](./PLAN.md) for full spec.

## How It Works

1. Enter mouse `DPI` and page `sensitivity multiplier` (both optional, defaults to `800 × 1.0`) to get `eDPI`.
2. Complete a clicking or tracking test to receive a score (0–100) and a directional suggestion.
3. Fine-tune sensitivity with quick-adjust buttons and retest; compare the score curve across history — the `eDPI` with the highest score is your personal best.

> Skill level is assumed constant within a short session, making scores across different `eDPI` values relatively comparable.

## Deployment

GitHub Actions auto-deploys to GitHub Pages:

- Workflow: [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
- Trigger: push to `main` or manual `workflow_dispatch`
- Pipeline: `npm ci` → `npm run build` → upload `dist` → `actions/deploy-pages`
- Vite `base` automatically switches to `/AimSense/` when `GITHUB_ACTIONS` is set (see [`vite.config.js:8`](./vite.config.js#L8))

To reuse after forking, set **Settings → Pages → Source** to **GitHub Actions**.

## Browser Support

Desktop only, no mobile adaptation. Fullscreen / maximized window is recommended for consistent coordinate scaling (normalized to 1080p baseline).

## License

[MIT](./LICENSE) © 2026 Wang Huanyu
