import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // MapLibre 6 loads its worker as a separate module; Vite's dep optimizer can't rewrite that URL.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  server: { port: 5173 },
  build: { sourcemap: false, chunkSizeWarningLimit: 1500 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as never);
