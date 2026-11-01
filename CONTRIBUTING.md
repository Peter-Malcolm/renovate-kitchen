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

## Sharing code between deployments

Use [the shared-module sync script](scripts/sync-shared.mjs) for explicit standalone modules. It defaults to a dry run; inspect the reported changed filenames before repeating with `--apply`:

```shell
node scripts/sync-shared.mjs \
  --source=/path/to/source/site \
  --target=/path/to/target/site \
  --file=lighting.js \
  --file=water.js
```

Never copy a whole deployment over another. `app.js`, `index.html`, assets, and room-specific `dining.js` are refused: they contain deployment-specific UI, geometry, photos, artwork, and metadata. Extract shared behavior into a standalone module before expanding the allowlist; review both callers and privacy boundaries. The script checks all requested files before writing, rejects symlinks, stages replacements, and rolls back completed replacements on a write error. Run against idle local directories: it is not a concurrent-writer lock or a crash-atomic multi-file transaction. Keep a backup before applying changes.

The synthetic preservation tests run with the unit suite, or directly:

```shell
node --test tests/sync-shared.test.mjs
```
