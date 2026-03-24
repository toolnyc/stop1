# Deployment

## Vercel + Astro + pnpm

The app deploys as a single Vercel Serverless Function (`_render`) via the `@astrojs/vercel` adapter.

### pnpm configuration

`.npmrc` sets `node-linker=hoisted` to use a flat `node_modules` layout instead of pnpm's default symlink-based `.pnpm` store. This is required because:

1. **Rollup resolution** — Vite/Rollup cannot resolve transitive dependencies (e.g. `tslib`) through pnpm's nested symlink paths on Vercel's build environment.
2. **NFT file tracing** — The `@astrojs/vercel` adapter uses `@vercel/nft` to trace runtime dependencies. NFT follows CJS `require()` paths but misses ESM export variants (e.g. `tslib.es6.mjs`). With hoisted `node_modules`, we can use `ssr.noExternal` to bundle these dependencies inline, bypassing NFT entirely.

**Do not remove `.npmrc` or change `node-linker`.** Doing so will cause 500 errors on every route.

### astro.config.mjs

Key settings beyond the defaults:

| Setting | Purpose |
|---------|---------|
| `vite.ssr.noExternal: ['@supabase/supabase-js', '@supabase/auth-js', ...]` | Bundles all `@supabase/*` sub-packages + tslib into server chunks so NFT doesn't need to trace them. **Must list every sub-package individually** — `@supabase/supabase-js` alone is not enough because Vite treats sub-packages as separate externals |
| `image.service: noop` | Disables sharp image service (no pages use `<Image>`) — avoids bundling sharp into the function |

### Pre-build validation

`scripts/verify-deploy-config.mjs` runs automatically before every build (via the `prebuild` npm script). It checks that `.npmrc` and `astro.config.mjs` contain the required settings. If a merge strips these files, the build fails immediately with a clear error instead of deploying a broken function.

### Build cache

If a deploy succeeds (status "Ready") but returns 500 at runtime, or if `.npmrc`/lockfile changes aren't being picked up:

- **CLI deploys:** use `vercel --prod --force` to skip the build cache
- **Git-triggered deploys:** set `VERCEL_FORCE_NO_BUILD_CACHE=1` as a Vercel env var, trigger a redeploy, then remove the env var

Note: `VERCEL_FORCE_NO_BUILD_CACHE` does **not** work for CLI deploys — only `--force` bypasses the cache in that case.

### Node.js version

Vercel uses Node.js 22 for serverless functions. Local development may use a newer version (24) — the adapter handles this automatically with a warning.
