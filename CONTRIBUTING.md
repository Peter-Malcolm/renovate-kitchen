# Development

Serve `site/` with a static web server. Runtime files are local; no build step is required.

Checks require Node 24 or later:

```shell
npm ci
npx playwright install --with-deps chromium
npm run check
```

See [check coverage and limitations](tests/README.md). Commands print per-stage and total timings and save JSON evidence in ignored `test-results/timings/`. Browser checks suppress GPU drawing and do not establish visual rendering acceptance.

The [checks workflow](.github/workflows/checks.yml) runs on pushes and pull requests. After checks pass on `main`, it deploys only `site/` to GitHub Pages.

The [public audit](scripts/audit-public.mjs) enforces the deployment inventory, selected photo hashes, and absence of photo metadata. Keep private reference material outside this repository. Third-party terms are in [the notices](THIRD_PARTY_NOTICES.md), with a copy in the deployed directory.

For camera-motion changes, run `npm run test:render` and inspect the ignored contact sheet in `test-results/camera-sweep/index.html`. See the [rendering procedure and limitations](tests/README.md#camera-motion-regression).
