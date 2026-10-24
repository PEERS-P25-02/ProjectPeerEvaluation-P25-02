/*
 * This file keeps ordinary backend checks separate from checks that need the
 * running application, database, and email inbox. It lets developers run the
 * ordinary checks without starting the temporary test environment.
 *
 * It only controls which tests are selected. It does not start the application
 * or prove that saving information and sending email work together.
 *
 * TLDR: preserves Vitest's default exclusions and adds tests/integration/**
 * to the exclusion list for normal backend unit, watch, and coverage runs.
 */
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Ordinary unit commands must remain usable without Docker or live services.
    exclude: [...configDefaults.exclude, 'tests/integration/**'],
  },
});
