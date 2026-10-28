/*
 * This file configures the browser app build and local development server.
 * It also holds the frontend test defaults.
 *
 * TLDR: builds into build/, proxies /api to the local backend, and runs tests
 * in a simulated browser with coverage reports in coverage/.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Enable JSX handling and React refresh while developing.
  plugins: [react()],
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
