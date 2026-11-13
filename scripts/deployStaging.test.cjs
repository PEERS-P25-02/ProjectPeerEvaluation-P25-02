const assert = require('node:assert/strict');
const { formatSummary, runDeployment } = require('./deployStaging.cjs');

const input = {
  sourceSha: 'a'.repeat(40),
  backendImage: `ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-backend@sha256:${'b'.repeat(64)}`,
  frontendImage: `ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-frontend@sha256:${'c'.repeat(64)}`,
  backendServiceId: 'srv-backend123',
  frontendServiceId: 'srv-frontend123',
  apiKey: 'synthetic-secret-key',
};

function response(status, body) {
  return { status, json: async () => body };
}

function harness(overrides = {}) {
  const events = [];
  const records = [];
  const responses = overrides.responses || [];
  let index = 0;
  const fetch = async (url, init) => {
    events.push({ url, init });
    if (url.endsWith('/api/health'))
      return overrides.health || response(200, { status: 'OK' });
    return responses[index++] || response(500, {});
  };
  return {
    events,
    records,
    options: {
      fetch,
      save: (record) => records.push({ ...record }),
      checkMain: overrides.checkMain || (() => true),
      sleep: async () => {},
      clock: (() => {
        let time = 0;
        return () => time++;
      })(),
      timeout: 100,
      healthTimeout: 3,
      pollInterval: 1,
      healthPollInterval: 1,
    },
  };
}

async function rejectsWith(inputValue, setup, message) {
  let record;
  await assert.rejects(runDeployment(inputValue, setup.options), (error) => {
    assert.match(error.message, message);
    record = error.record;
    assert.equal(JSON.stringify(error.record).includes(input.apiKey), false);
    return true;
  });
  assert.equal(record.result, 'failure');
  return record;
}

(async () => {
  {
    const h = harness({
      responses: [
        response(201, { id: 'dep-backend1' }),
        response(200, { status: 'live', image: { ref: input.backendImage } }),
        response(201, { id: 'dep-frontend1' }),
        response(200, { status: 'live', image: { ref: input.frontendImage } }),
      ],
    });
    const record = await runDeployment(input, h.options);
    assert.equal(record.phase, 'complete');
    assert.equal(record.result, 'success');
    assert.deepEqual(
      h.events.map((event) =>
        event.url.endsWith('/api/health')
          ? 'health'
          : new URL(event.url).pathname,
      ),
      [
        '/v1/services/srv-backend123/deploys',
        '/v1/services/srv-backend123/deploys/dep-backend1',
        'health',
        '/v1/services/srv-frontend123/deploys',
        '/v1/services/srv-frontend123/deploys/dep-frontend1',
      ],
    );
    assert.equal(
      h.events[0].init.headers.Authorization,
      `Bearer ${input.apiKey}`,
    );
    assert.equal(JSON.stringify(record).includes(input.apiKey), false);
  }
  {
    const h = harness({ responses: [response(202, {})] });
    await rejectsWith(input, h, /HTTP 202; inspect Render/);
  }
  {
    const h = harness({ responses: [response(401, { secret: input.apiKey })] });
    await rejectsWith(input, h, /HTTP 401/);
    assert.equal(JSON.stringify(h.records).includes(input.apiKey), false);
  }
  {
    const h = harness({
      responses: [
        response(201, { id: 'dep-backend1' }),
        response(200, { status: 'live', image: { ref: input.frontendImage } }),
      ],
    });
    await rejectsWith(input, h, /does not match/);
  }
  for (const status of [
    'failed',
    'build_failed',
    'update_failed',
    'pre_deploy_failed',
    'canceled',
    'deactivated',
  ]) {
    const h = harness({
      responses: [
        response(201, { id: 'dep-backend1' }),
        response(200, { status }),
      ],
    });
    await rejectsWith(input, h, new RegExp(`terminal status ${status}`));
  }
  {
    let checks = 0;
    const h = harness({
      responses: [
        response(201, { id: 'dep-backend1' }),
        response(200, { status: 'live', image: { ref: input.backendImage } }),
      ],
      checkMain: () => ++checks === 1,
    });
    const record = await rejectsWith(input, h, /main tip changed/);
    assert.equal(
      h.events.some((event) => event.url.includes('frontend123')),
      false,
    );
    const summary = formatSummary(record, false);
    for (const expected of [
      input.backendImage,
      input.frontendImage,
      input.backendServiceId,
      input.frontendServiceId,
      'dep-backend1',
      'live',
      'HTTP 200',
      'status `OK`',
      'Phase:',
      'Failure: Current main tip changed before frontend deploy.',
    ]) {
      assert.ok(
        summary.includes(expected),
        `summary should include ${expected}`,
      );
    }
    assert.equal(summary.includes(input.apiKey), false);
  }
  {
    const h = harness({
      responses: [
        response(201, { id: 'dep-backend1' }),
        response(200, { status: 'live', image: { ref: input.backendImage } }),
      ],
      health: response(503, { status: 'UNAVAILABLE' }),
    });
    await rejectsWith(input, h, /Backend health check/);
    assert.equal(
      h.events.some((event) => event.url.includes('frontend123')),
      false,
    );
  }
  console.log('deployStaging synthetic tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
