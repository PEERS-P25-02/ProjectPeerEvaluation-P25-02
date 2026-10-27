const { MongoClient } = require('mongodb');

const collections = [
  'professors',
  'courses',
  'students',
  'teams',
  'evaluations',
  'reports',
];

function validateTarget(environment) {
  const runId = environment.E2E_RUN_ID;
  if (!/^[a-f0-9]{16}$/.test(runId ?? '')) {
    throw new Error('A 16-character hexadecimal E2E_RUN_ID is required');
  }
  const database = `peers_e2e_${runId}`;
  if (
    environment.NODE_ENV !== 'test' ||
    environment.MONGODB_URI !== `mongodb://mongodb:27017/${database}` ||
    environment.E2E_BASE_URL !== 'http://frontend' ||
    environment.MAILPIT_API_URL !== 'http://mailpit:8025'
  ) {
    throw new Error('Refusing an unintended E2E target');
  }
  return { runId, database };
}

async function assertLiveTarget(context) {
  const { database } = validateTarget(context.environment);
  // Heartbeat monitoring reports the server actually reached by the driver.
  // Use its public event rather than relying on MongoClient topology internals.
  if (
    context.db.databaseName !== database ||
    context.serverAddress !== 'mongodb:27017'
  ) {
    throw new Error('The live database does not match this E2E run');
  }
  await context.db.command({ ping: 1 });
}

async function assertOwnedDatabase(context) {
  await assertLiveTarget(context);
  const { runId } = validateTarget(context.environment);
  const owner = await context.db
    .collection('__test_run')
    .findOne({ _id: 'owner' });
  if (owner?.runId !== runId) {
    throw new Error(
      'Refusing an E2E database without this run ownership marker',
    );
  }
  // Even an owned database must not silently contain unknown collections.
  const existing = await context.db
    .listCollections({}, { nameOnly: true })
    .toArray();
  if (
    existing.some(({ name }) => ![...collections, '__test_run'].includes(name))
  ) {
    throw new Error('Refusing an E2E database with unknown collections');
  }
}

async function openDatabase(environment) {
  const { runId, database } = validateTarget(environment);
  const client = new MongoClient(environment.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  let serverAddress;
  client.on('serverHeartbeatSucceeded', (event) => {
    serverAddress = event.connectionId;
  });
  try {
    await client.connect();
    const context = {
      environment: { ...environment },
      client,
      db: client.db(database),
      get serverAddress() {
        return serverAddress;
      },
    };
    await assertLiveTarget(context);
    const owner = await context.db
      .collection('__test_run')
      .findOne({ _id: 'owner' });
    if (!owner) {
      // Backend model startup may create empty collections and indexes. Adopt
      // these only; existing records and unknown collections must survive rejection.
      const existing = await context.db
        .listCollections({}, { nameOnly: true })
        .toArray();
      for (const { name } of existing) {
        if (
          ![...collections, '__test_run'].includes(name) ||
          (await context.db.collection(name).findOne({}))
        ) {
          throw new Error(
            'Refusing to adopt a nonempty or unknown E2E database',
          );
        }
      }
      await context.db
        .collection('__test_run')
        .insertOne({ _id: 'owner', runId });
    }
    await assertOwnedDatabase(context);
    return context;
  } catch (error) {
    await client.close();
    throw error;
  }
}

async function mailpitRequest(context, pathname, options = {}) {
  // The run's private Compose network owns this inbox. Require the same live
  // database marker before every inbox operation, especially bulk deletion.
  await assertOwnedDatabase(context);
  if (!/^\/api\/v1\/(?:messages|message\/[a-zA-Z0-9-]+)$/.test(pathname)) {
    throw new Error('Unsupported E2E inbox operation');
  }
  const response = await fetch(
    `${context.environment.MAILPIT_API_URL}${pathname}`,
    {
      ...options,
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!response.ok) throw new Error(`Mailpit returned HTTP ${response.status}`);
  return response;
}

async function resetData(context) {
  await assertOwnedDatabase(context);
  // Preserve indexes and ownership. Public deletion routes soft-delete courses
  // and cannot remove professors, so only the test runner performs this reset.
  for (const name of collections)
    await context.db.collection(name).deleteMany({});
  await mailpitRequest(context, '/api/v1/messages', { method: 'DELETE' });
}

module.exports = {
  collections,
  validateTarget,
  assertOwnedDatabase,
  openDatabase,
  mailpitRequest,
  resetData,
};
