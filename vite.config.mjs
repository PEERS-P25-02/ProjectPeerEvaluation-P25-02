/*
 * This file configures the browser app build and local development server.
 * It also holds the frontend test defaults.
 *
 * TLDR: builds into build/, proxies /api to the local backend, and runs tests
 * in a simulated browser with coverage reports in coverage/.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const instrumentation = createRequire(import.meta.url)(
  './scripts/frontendInstrumentation.cjs',
);

const root = path.dirname(fileURLToPath(import.meta.url));
const canonicalCoverage = {
  name: 'peers-canonical-coverage',
  enforce: 'pre',
  transform(source, id) {
    if (process.env.PEERS_COVERAGE !== '1' || id.includes('?')) return;
    const relative = path.relative(root, id).split(path.sep).join('/');
    if (!instrumentation.isFrontendProduction(relative)) return;
    return instrumentation.instrumentSource(source, relative);
  },
};

export default defineConfig({
  // Enable JSX handling and React refresh while developing.
  plugins: [canonicalCoverage, react()],
  build: {
    // Keep the production bundle compatible with the listed browser versions.
    outDir: 'build',
    target: ['chrome109', 'edge111', 'firefox114', 'safari16.4', 'ios15.6'],
  },
  server: {
    // Let a host browser reach the development server inside a container.
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    // Send local browser API requests to the backend server.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  // Frontend checks use a browser-like environment; backend checks use Node.
  test: {
    environment: 'jsdom',
    setupFiles: './src/frontend/test/setup.js',
    globals: true,
    // Write terminal, HTML, and LCOV coverage reports.
    coverage: {
      provider: 'v8',
      include: ['src/frontend/**/*.{js,jsx}', 'src/index.jsx'],
      exclude: ['**/tests/**', '**/test/**'],
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      reportsDirectory: './coverage',
    },
  },
});
