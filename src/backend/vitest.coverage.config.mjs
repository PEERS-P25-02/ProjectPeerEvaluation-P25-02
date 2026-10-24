import { configDefaults, defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: backendRoot,
  test: {
    environment: 'node',
    exclude: [
      ...configDefaults.exclude,
      'tests/integration/**',
      'tests/**/*.integration.test.js',
    ],
    coverage: {
      provider: 'v8',
      include: [
        'index.js',
        'config/**/*.js',
        'controllers/**/*.js',
        'middleware/**/*.js',
        'models/**/*.js',
        'routes/**/*.js',
        'utils/**/*.js',
      ],
      exclude: [
        '**/tests/**',
        '**/*.test.js',
        'routes/testData.js',
        'migrations/**',
        'scripts/**',
        'debug_student.js',
        'test_api.js',
      ],
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
});
