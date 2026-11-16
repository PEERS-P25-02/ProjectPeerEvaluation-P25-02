const assert = require('node:assert/strict');
const test = require('node:test');
const {
  ACTIVE_DEPLOY_STATUSES,
  checkCoordination,
  inspectService,
} = require('./stagingCoordination.cjs');
const { readStagingServiceConfig } = require('../tests/staging/config.cjs');

const json = (body) => ({ ok: true, status: 200, json: async () => body });
const env = {
  RENDER_API_KEY: 'render-token',
  BACKEND_SERVICE_ID: 'srv-backend',
  FRONTEND_SERVICE_ID: 'srv-frontend',
  BACKEND_IMAGE: `ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-backend@sha256:${'a'.repeat(64)}`,
  FRONTEND_IMAGE: `ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-frontend@sha256:${'b'.repeat(64)}`,
  STAGING_BACKEND_URL: 'https://peers-staging-backend.onrender.com',
  STAGING_FRONTEND_URL:
    'https://projectpeerevaluation-p25-02-frontend.onrender.com',
  STAGING_BACKEND_NAME: 'peers-staging-backend',
  STAGING_FRONTEND_NAME: 'PEERS Staging Frontend',
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
    name: 'PEERS Staging Frontend',
    type: 'web_service',
    serviceDetails: {
      url: 'https://projectpeerevaluation-p25-02-frontend.onrender.com',
    },
    imagePath:
      'ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-frontend@sha256:abc',
  },
};
const config = readStagingServiceConfig(env);
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

test('configured service names and origins are used for identity checks', async () => {
  const configuredEnv = {
    ...env,
    STAGING_BACKEND_NAME: 'Replacement API',
    STAGING_FRONTEND_NAME: 'Replacement Web',
    STAGING_BACKEND_URL: 'https://api-replacement.onrender.com',
    STAGING_FRONTEND_URL: 'https://web-replacement.onrender.com',
  };
  const { fetch } = makeFetch({
    serviceOverrides: {
      'srv-backend': {
        ...services['srv-backend'],
        name: configuredEnv.STAGING_BACKEND_NAME,
        serviceDetails: { url: configuredEnv.STAGING_BACKEND_URL },
      },
      'srv-frontend': {
        ...services['srv-frontend'],
        name: configuredEnv.STAGING_FRONTEND_NAME,
        serviceDetails: { url: configuredEnv.STAGING_FRONTEND_URL },
      },
    },
  });
  assert.equal(
    (await checkCoordination({ env: configuredEnv, fetch })).busy,
    false,
  );
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
      inspectService(
        fetch,
        env.RENDER_API_KEY,
        'srv-backend',
        'backend',
        config,
        env.BACKEND_IMAGE,
      ),
      /ID does not match Render/,
    );
  });
  for (const [field, value] of [
    ['name', 'wrong-name'],
    ['type', 'static_site'],
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
        inspectService(
          fetch,
          env.RENDER_API_KEY,
          'srv-backend',
          'backend',
          config,
          env.BACKEND_IMAGE,
        ),
        /does not match Render|not web_service|repository does not match/,
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
        config,
        env.BACKEND_IMAGE,
      ),
      /network unavailable/,
    );
  });
});
