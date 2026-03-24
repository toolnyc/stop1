import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

const site = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:4321';

export default defineConfig({
  site,
  output: 'server',
  adapter: vercel(),
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
