const assert = require('node:assert/strict');
const test = require('node:test');
const {
  activeRuns,
  checkCoordination,
  inspectService,
  listCompletedRollbackRuns,
  rollbackOverlappedCd,
} = require('./stagingCoordination.cjs');

const json = (body) => ({ ok: true, status: 200, json: async () => body });

test('active workflow runs exclude current run and include queued work', () => {
  const busy = activeRuns(
    [
      { id: 1, status: 'in_progress' },
      { id: 2, status: 'queued' },
      { id: 3, status: 'completed' },
    ],
    1,
  );
  assert.deepEqual(
    busy.map((run) => run.id),
    [2],
  );
});

test('Render checks the exact staging URL and image repository with cursor deploy pages', async () => {
  const fetch = async (url) => {
    if (url.endsWith('/services/srv-backend'))
      return json({
        id: 'srv-backend',
        name: 'peers-staging-backend',
        type: 'web_service',
        serviceDetails: { url: 'https://peers-staging-backend.onrender.com' },
        imagePath:
          'ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-backend:latest',
      });
    if (url.endsWith('/services/srv-backend/deploys?limit=100'))
      return json([{ cursor: 'cursor-1', deploy: { status: 'live' } }]);
    if (url.endsWith('/services/srv-backend/deploys?limit=100&cursor=cursor-1'))
      return json([]);
    throw new Error(`Unexpected URL ${url}`);
  };
  await inspectService(fetch, 'key', 'srv-backend', 'backend');
  await assert.rejects(
    inspectService(
      async () =>
        json({
          id: 'srv-backend',
          name: 'wrong',
          type: 'web_service',
        }),
      'key',
      'srv-backend',
      'backend',
    ),
    /name, URL, or GHCR image repository/,
  );
  await assert.rejects(
    inspectService(
      async (url) =>
        url.includes('/deploys?')
          ? json([{ cursor: 'cursor-1', deploy: { status: 'mystery' } }])
          : json({
              id: 'srv-backend',
              name: 'peers-staging-backend',
              type: 'web_service',
              serviceDetails: {
                url: 'https://peers-staging-backend.onrender.com',
              },
              imagePath:
                'ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-backend:latest',
            }),
      'key',
      'srv-backend',
      'backend',
    ),
    /unknown status/,
  );
  await assert.rejects(
    inspectService(
      async (url) =>
        url.includes('/deploys?')
          ? json([{ cursor: 'cursor-1', deploy: { status: 'queued' } }])
          : json({
              id: 'srv-backend',
              name: 'peers-staging-backend',
              type: 'web_service',
              serviceDetails: {
                url: 'https://peers-staging-backend.onrender.com',
              },
              imagePath:
                'ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-backend:latest',
            }),
      'key',
      'srv-backend',
      'backend',
    ),
    /active or queued/,
  );
});

test('active workflow scan fails closed when a filtered status exceeds one page', async () => {
  const env = {
    GITHUB_TOKEN: 'token',
    GITHUB_REPOSITORY: 'org/repo',
    GITHUB_RUN_ID: '3',
    RENDER_API_KEY: 'render',
    BACKEND_SERVICE_ID: 'srv-backend',
    FRONTEND_SERVICE_ID: 'srv-frontend',
  };
  const fetch = async (url) => {
    if (url.includes('/workflows/'))
      return json({ total_count: 101, workflow_runs: [] });
    throw new Error(`Unexpected URL ${url}`);
  };
  await assert.rejects(
    checkCoordination({ env, fetch }),
    /bounded safety check/,
  );
});

test('locked rollback rejects a CD that completed after rollback dispatch', async () => {
  const env = {
    GITHUB_TOKEN: 'token',
    GITHUB_REPOSITORY: 'org/repo',
    GITHUB_RUN_ID: '3',
    RENDER_API_KEY: 'render',
    BACKEND_SERVICE_ID: 'srv-backend',
    FRONTEND_SERVICE_ID: 'srv-frontend',
  };
  const fetch = async (url) => {
    if (url.endsWith('/actions/runs/3'))
      return json({ id: 3, created_at: '2026-11-14T12:00:00Z' });
    if (url.includes('created=%3E%3D2026-11-14T12%3A00%3A00Z'))
      return json({
        total_count: 1,
        workflow_runs: [{ id: 4, status: 'completed' }],
      });
    if (url.includes('/workflows/'))
      return json({ total_count: 0, workflow_runs: [] });
    throw new Error(`Unexpected URL ${url}`);
  };
  await assert.rejects(
    checkCoordination({ env, fetch, requireNoCompletedCdSinceDispatch: true }),
    /CD run completed since rollback dispatch/,
  );
});

test('completed rollback pagination fetches a second page and enforces its 500-run bound', async () => {
  const headers = {};
  const urls = [];
  const fetch = async (url) => {
    urls.push(url);
    if (url.endsWith('status=completed&per_page=100&page=1'))
      return json({
        total_count: 101,
        workflow_runs: Array.from({ length: 100 }, (_, id) => ({
          id,
          status: 'completed',
        })),
      });
    if (url.endsWith('status=completed&per_page=100&page=2'))
      return json({
        total_count: 101,
        workflow_runs: [{ id: 101, status: 'completed' }],
      });
    throw new Error(`Unexpected URL ${url}`);
  };
  const runs = await listCompletedRollbackRuns(fetch, headers, 'org/repo');
  assert.equal(runs.length, 101);
  assert.equal(urls.length, 2);
  await assert.rejects(
    listCompletedRollbackRuns(
      async () =>
        json({
          total_count: 501,
          workflow_runs: Array.from({ length: 100 }, (_, id) => ({
            id,
            status: 'completed',
          })),
        }),
      headers,
      'org/repo',
    ),
    /500-run safety bound/,
  );
});

test('CD overlap detects a rollback mutation starting after CD creation and a failed mutation', async () => {
  const env = {
    GITHUB_TOKEN: 'token',
    GITHUB_REPOSITORY: 'org/repo',
    GITHUB_RUN_ID: '55',
  };
  const fetch = async (url) => {
    if (url.endsWith('/actions/runs/55'))
      return json({ id: 55, created_at: '2026-11-14T12:05:00Z' });
    if (url.includes('/workflows/staging-rollback.yml/'))
      return json({
        total_count: 1,
        workflow_runs: [{ id: 70, status: 'completed' }],
      });
    if (url.endsWith('/actions/runs/70/jobs?per_page=100'))
      return json({
        total_count: 1,
        jobs: [
          {
            name: 'Rollback Staging',
            started_at: '2026-11-14T12:06:00Z',
            completed_at: '2026-11-14T12:10:00Z',
            conclusion: 'failure',
          },
        ],
      });
    throw new Error(`Unexpected URL ${url}`);
  };
  assert.equal(await rollbackOverlappedCd({ env, fetch }), true);
});

test('CD overlap excludes a later CD and a read-only failed preflight', async () => {
  const env = {
    GITHUB_TOKEN: 'token',
    GITHUB_REPOSITORY: 'org/repo',
    GITHUB_RUN_ID: '55',
  };
  const makeFetch = (createdAt, jobs) => async (url) => {
    if (url.endsWith('/actions/runs/55'))
      return json({ id: 55, created_at: createdAt });
    if (url.includes('/workflows/staging-rollback.yml/'))
      return json({
        total_count: 1,
        workflow_runs: [{ id: 70, status: 'completed' }],
      });
    if (url.endsWith('/actions/runs/70/jobs?per_page=100'))
      return json({ total_count: jobs.length, jobs });
    throw new Error(`Unexpected URL ${url}`);
  };
  const mutation = {
    name: 'Rollback Staging',
    started_at: '2026-11-14T12:00:00Z',
    completed_at: '2026-11-14T12:10:00Z',
    conclusion: 'success',
  };
  assert.equal(
    await rollbackOverlappedCd({
      env,
      fetch: makeFetch('2026-11-14T12:11:00Z', [mutation]),
    }),
    false,
  );
  assert.equal(
    await rollbackOverlappedCd({
      env,
      fetch: makeFetch('2026-11-14T12:05:00Z', [
        { ...mutation, name: 'Read-only Rollback Preflight' },
      ]),
    }),
    false,
  );
});
