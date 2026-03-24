/**
 * Pre-build validation for Vercel deployment.
 *
 * Ensures critical config files haven't been stripped by merge conflicts.
 * Runs automatically via the "prebuild" npm script on every `pnpm build`.
 *
 * See docs/deployment.md for context on why these checks exist.
 */

import { readFileSync, existsSync } from 'node:fs';

const errors = [];

// 1. .npmrc must exist with node-linker=hoisted
const npmrcPath = '.npmrc';
if (!existsSync(npmrcPath)) {
  errors.push(`.npmrc is missing. Create it with: echo "node-linker=hoisted" > .npmrc`);
} else {
  const npmrc = readFileSync(npmrcPath, 'utf-8');
  if (!npmrc.includes('node-linker=hoisted')) {
    errors.push(`.npmrc must contain "node-linker=hoisted". Without it, pnpm's symlink layout breaks Rollup resolution on Vercel.`);
  }
}

// 2. astro.config.mjs must bundle @supabase/* and tslib via ssr.noExternal
const configPath = 'astro.config.mjs';
if (!existsSync(configPath)) {
  errors.push(`astro.config.mjs is missing.`);
} else {
  const config = readFileSync(configPath, 'utf-8');
  if (!config.includes('noExternal')) {
    errors.push(`astro.config.mjs is missing vite.ssr.noExternal. Supabase and tslib must be bundled inline to avoid NFT tracing failures on Vercel.`);
  }
  if (!config.includes('@supabase/auth-js')) {
    errors.push(`astro.config.mjs noExternal must include @supabase sub-packages (e.g. @supabase/auth-js). Only listing @supabase/supabase-js is not enough — sub-packages are resolved separately and their tslib requires will fail.`);
  }
  if (!config.includes('tslib')) {
    errors.push(`astro.config.mjs noExternal must include 'tslib'. NFT misses tslib's ESM entry → runtime crash.`);
  }
}

if (errors.length > 0) {
  console.error('\n\x1b[31m╔══════════════════════════════════════════════════════╗');
  console.error('║  DEPLOY CONFIG VALIDATION FAILED                     ║');
  console.error('╚══════════════════════════════════════════════════════╝\x1b[0m\n');
  for (const err of errors) {
    console.error(`  \x1b[31m✗\x1b[0m ${err}\n`);
  }
  console.error('\x1b[33mThis usually happens when a large feature branch overwrites');
  console.error('these files during merge. See docs/deployment.md for details.\x1b[0m\n');
  process.exit(1);
}

console.log('  \x1b[32m✓\x1b[0m Deploy config validated');
