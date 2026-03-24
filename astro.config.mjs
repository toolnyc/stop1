import { defineConfig } from 'astro/config';
import { createRequire } from 'module';
import vercel from '@astrojs/vercel';

const require = createRequire(import.meta.url);

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  image: { service: { entrypoint: 'astro/assets/services/noop' } },
  vite: {
    ssr: {
      // Bundle Supabase + tslib into server chunks so the Vercel NFT bundler
      // doesn't need to trace them (it misses tslib's ESM entry → runtime crash)
      noExternal: ['@supabase/supabase-js', 'tslib'],
    },
    resolve: {
      // Explicit alias so Rollup resolves tslib from the project root,
      // not from inside pnpm's nested .pnpm store (which fails on Vercel)
      alias: {
        tslib: require.resolve('tslib'),
      },
    },
  },
});
