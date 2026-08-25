import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);
const maplibreDist = dirname(require.resolve('maplibre-gl/package.json')) + '/dist';
const maplibreVersion: string = require('maplibre-gl/package.json').version;

/**
 * MapLibre 6 spawns its worker from a URL it computes at runtime (`new URL('./maplibre-gl-worker.mjs', import.meta.url)`),
 * which a bundler cannot rewrite. Ship the worker + its shared chunk as versioned static files and tell MapLibre where
 * they are (see src/map/MapView.tsx).
 */
function maplibreWorker(): Plugin {
  const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];
  return {
    name: 'maplibre-worker-assets',
    generateBundle() {
      for (const f of files) this.emitFile({ type: 'asset', fileName: `maplibre/${maplibreVersion}/${f}`, source: readFileSync(join(maplibreDist, f)) });
    },
  };
}

export default defineConfig({
  plugins: [react(), maplibreWorker()],
  // Relative asset URLs so the same build works at / and under a sub-path (e.g. evlineup.org/compare-range/).
  base: './',
  define: { __MAPLIBRE_VERSION__: JSON.stringify(maplibreVersion) },
  // In dev, serve maplibre-gl unbundled so its worker URL resolves against the real file.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  server: { port: 5173 },
  build: { sourcemap: false, chunkSizeWarningLimit: 1500 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as never);
