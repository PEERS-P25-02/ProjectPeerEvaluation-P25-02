/*
 * This file helps prevent test preparation and cleanup from using the wrong
 * place. It checks that the settings belong to a temporary test run and that
 * the connected database carries the same run's identifying information.
 *
 * It checks settings and ownership only. Other files create the environment,
 * add invented records, and remove them. These checks support the separate
 * resources provided for each run; they do not create that separation themselves.
 *
 * TLDR: validates TEST_RUN_ID and exact test-only URLs, verifies the connected
 * MongoDB host/database, and requires matching __test_run ownership metadata
 * before fixture reset helpers proceed.
 */
export function validateTestTarget(environment) {
  const runId = environment.TEST_RUN_ID;
  if (!/^[a-f0-9]{16}$/.test(runId ?? '')) {
    throw new Error('A 16-character hexadecimal TEST_RUN_ID is required');
  }

  const database = `peers_test_${runId}`;
  // Exact destinations deliberately reject Atlas, developer databases, URI options,
  // credentials, and alternate hosts before any connection or reset is attempted.
  if (
    environment.NODE_ENV !== 'test' ||
    environment.MONGODB_URI !== `mongodb://mongodb:27017/${database}` ||
    environment.API_BASE_URL !== 'http://backend:5000' ||
    environment.MAILPIT_API_URL !== 'http://mailpit:8025'
  ) {
    throw new Error('Refusing an unintended integration-test target');
  }
  return { runId, database };
}

export async function assertOwnedDatabase(connection, environment) {
  const target = validateTestTarget(environment);
  if (connection.host !== 'mongodb' || connection.name !== target.database) {
    throw new Error('The connected database does not match this test run');
  }
  const owner = await connection.db
    .collection('__test_run')
    .findOne({ _id: 'owner' });
  if (owner?.runId !== target.runId) {
    throw new Error(
      'Refusing to reset a database without this run ownership marker',
    );
  }
}
