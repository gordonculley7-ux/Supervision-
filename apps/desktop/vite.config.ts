import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Bundle the shared TS source directly (monorepo dev).
      '@core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
      '@data-adapter': fileURLToPath(new URL('../../packages/data/src/adapter.ts', import.meta.url)),
    },
  },
});
