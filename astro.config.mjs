import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  security: { checkOrigin: false },
  image: { service: { entrypoint: 'astro/assets/services/noop' } },
  vite: {
    ssr: {
      // Bundle Supabase + tslib into server chunks so the Vercel NFT bundler
      // doesn't need to trace them (NFT misses tslib's ESM entry → runtime crash).
      // Requires node-linker=hoisted in .npmrc so Rollup can resolve tslib.
      noExternal: ['@supabase/supabase-js', 'tslib'],
    },
  },
});
