import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  vite: {
    ssr: {
      // Bundle Supabase into server chunks so its CJS sub-packages
      // (auth-js, functions-js, realtime-js) don't need tslib at runtime
      noExternal: ['@supabase/supabase-js', 'tslib'],
    },
  },
});
