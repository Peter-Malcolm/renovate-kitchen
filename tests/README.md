# Checks

Use Node 24 or later from the repository root:

```shell
npm ci
npx playwright install --with-deps chromium
npm run check
```

- `npm test`: water-model, lighting, viewpoint and physical furniture UV tests.
- `npm run audit:public`: exact deployment inventory, approved photo hashes and metadata checks.
- `npm run test:browser`: headless Chromium geometry, navigation, controls and reference-dialog checks.

Browser checks suppress GPU drawing to keep geometry and interaction checks practical in CI. They do not verify the rendered appearance. The browser harness serves `site/` itself on an ephemeral localhost port and closes the server and browser on completion.

The checks workflow runs on pushes and pull requests. After checks pass on `main`, it deploys only `site/` to GitHub Pages.

## Camera-motion regression

```shell
npm run test:render
```

The optional local rendering check uses Playwright Chromium and the actual WebGL renderer. It freezes the animation scheduler (therefore water, flames, doors, blinds and lighting), then renders every preset, starting with the hob and an additional lower view of the cupboard bases, with camera offsets of −6 cm, 0 and +6 cm. It retains production shadows, materials and render resolution. Missing WebGL, context loss, GL errors, empty GPU draws or uniform pixel output fail the command. A ten-minute watchdog bounds software rendering.

Open `test-results/camera-sweep/index.html` to compare the PNG frames; `diagnostics.json` records GPU, draw and geometry evidence. Artifacts are ignored and stay outside `site/`, so are never deployed. Only the public model canvas is captured; reference dialogs are never opened. This is a visual contact sheet, not a temporal flicker detector: movement changes pixels naturally, and three frames per view cannot prove absence of shimmer across all camera angles, devices or lighting states. Review the hob cupboard fronts, kickboard joins and rear corner closely.

Both browser commands test actual scene bounds: all 21 cabinet fronts must have four nonoverlapping trim pieces, rear/side kickboards must meet within 1 mm without overlap, and the right blind corner must not penetrate the hob run. These deterministic checks run in CI through `test:browser`; GPU capture remains opt-in because software GPU performance varies.

For a bounded first review of the reported area, use `npm run test:render -- --hob-only`; the default command covers every preset.

Use `npm run test:render -- --furniture-only` for the cooking and dining views, saved separately in `test-results/furniture-sweep/`. The geometry checks exercise transformed tall-cabinet panel contacts and the cornice-to-fridge contact, and reject both intersecting faces and gaps. Browser checks include negative controls for the former 165 mm cornice overlap and a 10 mm gap.

Furniture checks measure live tabletop, seat and leg UVs against physical mesh dimensions. The oak grain follows tabletop length, seat depth, turned component axes and bentwood paths; one texture tile represents 25 cm across grain and 50 cm along grain. This is an illustrative material scale, not a measured product finish.

## Stage timings

Every npm check command prints elapsed wall-clock seconds per stage and a total. `npm run check` runs `unit`, `public-audit`, then `browser` once each and stops on the first failure, preserving its exit code. Optional `npm run test:render`, `npm run test:flood`, and `npm run test:extractor` time their respective standalone checks; they are not part of `check`.

Each invocation writes a unique JSON report to ignored `test-results/timings/` with stage labels, commands, milliseconds, exit codes, signals, Node version and start time. A Git commit and dirty flag are recorded only when this directory is a Git working tree; otherwise source version is null. Totals include stage-launch overhead and exclude writing the report. Direct `node tests/...` invocations bypass timing. Render arguments remain supported, for example `npm run test:render -- --hob-only`.
