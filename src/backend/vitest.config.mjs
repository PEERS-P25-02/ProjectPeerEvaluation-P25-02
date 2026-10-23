import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Ordinary unit commands must remain usable without Docker or live services.
    exclude: [...configDefaults.exclude, 'tests/integration/**'],
  },
});
