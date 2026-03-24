import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

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
      // Force tslib resolution from project root so Rollup can find it
      // inside pnpm's strict isolated node_modules on Vercel
      dedupe: ['tslib'],
    },
  },
});
