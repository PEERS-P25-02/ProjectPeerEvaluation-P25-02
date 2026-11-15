const assert = require('node:assert/strict');
const test = require('node:test');
const {
  ACTIVE_DEPLOY_STATUSES,
  checkCoordination,
  inspectService,
} = require('./stagingCoordination.cjs');

const json = (body) => ({ ok: true, status: 200, json: async () => body });
const env = {
  RENDER_API_KEY: 'render-token',
  BACKEND_SERVICE_ID: 'srv-backend',
  FRONTEND_SERVICE_ID: 'srv-frontend',
};
const services = {
  'srv-backend': {
    id: 'srv-backend',
    name: 'peers-staging-backend',
    type: 'web_service',
    serviceDetails: { url: 'https://peers-staging-backend.onrender.com' },
    imagePath:
      'ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-backend:latest',
  },
  'srv-frontend': {
    id: 'srv-frontend',
    name: 'projectpeerevaluation-p25-02-frontend',
    type: 'web_service',
    serviceDetails: {
      url: 'https://projectpeerevaluation-p25-02-frontend.onrender.com',
    },
    imagePath:
      'ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-frontend@sha256:abc',
  },
};
function makeFetch({
  serviceOverrides = {},
  deploys = {},
  failures = {},
} = {}) {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    const parsed = new URL(String(url));
    const serviceId = parsed.pathname.split('/')[3];
    if (failures[parsed.pathname])
      return {
        ok: false,
        status: failures[parsed.pathname],
        json: async () => ({}),
      };
    if (parsed.pathname.endsWith('/deploys'))
      return json(deploys[serviceId] ?? []);
    return json(
      Object.hasOwn(serviceOverrides, serviceId)
        ? serviceOverrides[serviceId]
        : services[serviceId],
    );
  };
  return { fetch, calls };
}

test('Render active status array is sent as repeated status query parameters', async () => {
  const { fetch, calls } = makeFetch();
  const result = await checkCoordination({ env, fetch });

  assert.deepEqual(result, {
    busy: false,
    services: ['srv-backend', 'srv-frontend'],
  });
  assert.equal(calls.length, 4);
  for (const { url, options } of calls.filter(({ url }) =>
    url.includes('/deploys?'),
  )) {
    const parsed = new URL(url);
    assert.deepEqual(
      parsed.searchParams.getAll('status'),
      ACTIVE_DEPLOY_STATUSES,
    );
    assert.equal(parsed.searchParams.get('limit'), '1');
    assert.equal(options.headers.Authorization, 'Bearer render-token');
    assert.ok(options.signal instanceof AbortSignal);
  }
});

test('an active deploy returned by the filtered list makes coordination busy', async () => {
  const { fetch } = makeFetch({
    deploys: {
      'srv-frontend': [{ cursor: 'cursor-1', deploy: { status: 'queued' } }],
    },
  });
  await assert.rejects(checkCoordination({ env, fetch }), /active or queued/);
});

test('malformed and unexpected filtered results fail closed', async (t) => {
  await t.test('non-array response', async () => {
    const { fetch } = makeFetch({ deploys: { 'srv-backend': {} } });
    await assert.rejects(checkCoordination({ env, fetch }), /unavailable/);
  });
  await t.test('missing deploy status', async () => {
    const { fetch } = makeFetch({
      deploys: { 'srv-backend': [{ cursor: 'cursor-1', deploy: {} }] },
    });
    await assert.rejects(checkCoordination({ env, fetch }), /malformed/);
  });
  await t.test('unexpected status despite filter', async () => {
    const { fetch } = makeFetch({
      deploys: {
        'srv-backend': [{ cursor: 'cursor-1', deploy: { status: 'live' } }],
      },
    });
    await assert.rejects(
      checkCoordination({ env, fetch }),
      /unexpected status/,
    );
  });
});

test('service identity requires exact name, URL, and GHCR repository', async (t) => {
  await t.test('rejects a non-object service response', async () => {
    const { fetch } = makeFetch({ serviceOverrides: { 'srv-backend': null } });
    await assert.rejects(
      inspectService(fetch, env.RENDER_API_KEY, 'srv-backend', 'backend'),
      /name, URL, or GHCR image repository/,
    );
  });
  for (const [field, value] of [
    ['name', 'wrong-name'],
    ['serviceDetails', { url: 'https://wrong.onrender.com' }],
    ['imagePath', 'ghcr.io/other/image:latest'],
  ]) {
    await t.test(`rejects mismatched ${field}`, async () => {
      const { fetch } = makeFetch({
        serviceOverrides: {
          'srv-backend': { ...services['srv-backend'], [field]: value },
        },
      });
      await assert.rejects(
        inspectService(fetch, env.RENDER_API_KEY, 'srv-backend', 'backend'),
        /name, URL, or GHCR image repository/,
      );
    });
  }
});

test('identical service IDs and Render API errors fail closed', async (t) => {
  await t.test('service IDs must differ', async () => {
    await assert.rejects(
      checkCoordination({
        env: { ...env, FRONTEND_SERVICE_ID: env.BACKEND_SERVICE_ID },
        fetch: async () => assert.fail('No request expected'),
      }),
      /must differ/,
    );
  });
  await t.test('non-success response', async () => {
    const { fetch } = makeFetch({
      failures: { '/v1/services/srv-backend': 503 },
    });
    await assert.rejects(
      checkCoordination({ env, fetch }),
      /Coordination API failed \(HTTP 503\)/,
    );
  });
  await t.test('network error', async () => {
    await assert.rejects(
      inspectService(
        async () => {
          throw new Error('network unavailable');
        },
        env.RENDER_API_KEY,
        'srv-backend',
        'backend',
      ),
      /network unavailable/,
    );
  });
});
