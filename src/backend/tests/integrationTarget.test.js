/*
 * This file checks the safeguards that help keep test cleanup away from the
 * wrong data. It tries incorrect settings, a different database, and missing
 * or another run's identifying information, then checks that they are refused.
 * It also checks that the expected settings and matching information are accepted.
 *
 * These checks use pretend database responses and can run without starting the
 * application, database, or email inbox. They verify the safeguard decisions;
 * the separate environment checks verify communication with the running parts.
 *
 * TLDR: Vitest unit cases cover validateTestTarget and assertOwnedDatabase using
 * spies and stubbed MongoDB ownership metadata to verify target rejection before
 * database access and acceptance of the matching run identity.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  assertOwnedDatabase,
  validateTestTarget,
} from './helpers/integrationTarget.js';

const runId = '0123456789abcdef';
const environment = {
  NODE_ENV: 'test',
  TEST_RUN_ID: runId,
  MONGODB_URI: `mongodb://mongodb:27017/peers_test_${runId}`,
  API_BASE_URL: 'http://backend:5000',
  MAILPIT_API_URL: 'http://mailpit:8025',
};

describe('integration reset safeguards', () => {
  it.each([
    { TEST_RUN_ID: undefined },
    { TEST_RUN_ID: '../development' },
    { NODE_ENV: 'development' },
    { MONGODB_URI: 'mongodb://localhost:27017/peer-eval' },
    { MONGODB_URI: 'mongodb://mongodb:27017/peer-eval' },
    {
      MONGODB_URI: 'mongodb+srv://example.invalid/peers_test_0123456789abcdef',
    },
    { MONGODB_URI: 'mongodb://mongodb:27017/peers_test_fedcba9876543210' },
    { MAILPIT_API_URL: 'http://localhost:8025' },
    { API_BASE_URL: 'https://example.invalid' },
  ])(
    'rejects an unintended target before database access: %j',
    async (override) => {
      const collection = vi.fn(() => ({ findOne: async () => ({ runId }) }));
      const unsafeEnvironment = { ...environment, ...override };
      expect(() => validateTestTarget(unsafeEnvironment)).toThrow(
        /required|unintended/,
      );
      await expect(
        assertOwnedDatabase(
          { host: 'mongodb', name: `peers_test_${runId}`, db: { collection } },
          unsafeEnvironment,
        ),
      ).rejects.toThrow(/required|unintended/);
      expect(collection).not.toHaveBeenCalled();
    },
  );

  it('rejects a connected database that differs from the configured target', async () => {
    await expect(
      assertOwnedDatabase({ host: 'mongodb', name: 'peer-eval' }, environment),
    ).rejects.toThrow('does not match');
  });

  it.each([null, { runId: 'fedcba9876543210' }])(
    'rejects missing or foreign ownership markers: %j',
    async (owner) => {
      const connection = {
        host: 'mongodb',
        name: `peers_test_${runId}`,
        db: { collection: () => ({ findOne: async () => owner }) },
      };
      await expect(
        assertOwnedDatabase(connection, environment),
      ).rejects.toThrow('ownership marker');
    },
  );

  it('accepts only the expected dedicated target with its own marker', async () => {
    const connection = {
      host: 'mongodb',
      name: `peers_test_${runId}`,
      db: { collection: () => ({ findOne: async () => ({ runId }) }) },
    };
    expect(validateTestTarget(environment)).toEqual({
      runId,
      database: `peers_test_${runId}`,
    });
    await expect(
      assertOwnedDatabase(connection, environment),
    ).resolves.toBeUndefined();
  });
});
