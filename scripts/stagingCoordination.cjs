const fs = require('node:fs');

const API = 'https://api.github.com';
const RENDER_API = 'https://api.render.com/v1';
const WORKFLOWS = {
  cd: 'cd.yml',
  rollback: 'staging-rollback.yml',
};
const EXPECTED_SERVICES = {
  backend: {
    name: 'peers-staging-backend',
    url: 'https://peers-staging-backend.onrender.com',
    image: 'ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-backend',
  },
  frontend: {
    name: 'projectpeerevaluation-p25-02-frontend',
    url: 'https://projectpeerevaluation-p25-02-frontend.onrender.com',
    image: 'ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-frontend',
  },
};

function requireEnv(env, key) {
  if (!env[key]) throw new Error(`${key} is required.`);
  return env[key];
}

async function requestJson(fetcher, url, headers) {
  const response = await fetcher(url, {
    headers,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(`Coordination API failed (HTTP ${response.status}).`);
  return response.json();
}

function activeRuns(runs, excludeRunId) {
  return runs.filter(
    (run) =>
      String(run.id) !== String(excludeRunId) &&
      ['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(
        run.status,
      ),
  );
}

async function listWorkflowRuns(
  fetcher,
  headers,
  repository,
  workflow,
  status,
  page = 1,
  allowMultiplePages = false,
) {
  const data = await requestJson(
    fetcher,
    `${API}/repos/${repository}/actions/workflows/${workflow}/runs?status=${status}&per_page=100&page=${page}`,
    headers,
  );
  if (!Array.isArray(data.workflow_runs))
    throw new Error('GitHub workflow run response was incomplete.');
  if (!Number.isInteger(data.total_count) || data.total_count < 0)
    throw new Error('GitHub workflow run count was unavailable.');
  if (
    data.workflow_runs.some(
      (run) => !run || !Number.isInteger(run.id) || run.status !== status,
    )
  )
    throw new Error(
      `GitHub ${status} workflow response contained an unexpected run.`,
    );
  if (!allowMultiplePages && data.total_count > data.workflow_runs.length)
    throw new Error(
      `GitHub ${status} workflow run count exceeded the bounded safety check.`,
    );
  return { total_count: data.total_count, workflow_runs: data.workflow_runs };
}

async function listCompletedRollbackRuns(fetcher, headers, repository) {
  const first = await listWorkflowRuns(
    fetcher,
    headers,
    repository,
    WORKFLOWS.rollback,
    'completed',
    1,
    true,
  );
  // Inspect at most 500 completed rollbacks; exceeding that history bound fails closed.
  const total = first.total_count;
  if (!Number.isInteger(total) || total < 0 || total > 500)
    throw new Error(
      'Completed rollback history exceeded the 500-run safety bound.',
    );
  const pages = Math.ceil(total / 100);
  const runs = [...first.workflow_runs];
  for (let page = 2; page <= pages; page += 1) {
    const next = await listWorkflowRuns(
      fetcher,
      headers,
      repository,
      WORKFLOWS.rollback,
      'completed',
      page,
      true,
    );
    if (next.total_count !== total)
      throw new Error('Completed rollback history changed during pagination.');
    runs.push(...next.workflow_runs);
  }
  if (
    runs.length !== total ||
    new Set(runs.map((run) => run.id)).size !== runs.length
  )
    throw new Error('Completed rollback history pagination was incomplete.');
  return runs;
}

async function inspectService(fetcher, apiKey, serviceId, kind) {
  const expected = EXPECTED_SERVICES[kind];
  if (!expected) throw new Error('Unknown configured Render service kind.');
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  };
  const service = await requestJson(
    fetcher,
    `${RENDER_API}/services/${encodeURIComponent(serviceId)}`,
    headers,
  );
  if (
    service.id !== serviceId ||
    service.name !== expected.name ||
    service.type !== 'web_service' ||
    service.serviceDetails?.url !== expected.url ||
    typeof service.imagePath !== 'string' ||
    (!service.imagePath.startsWith(`${expected.image}:`) &&
      !service.imagePath.startsWith(`${expected.image}@`))
  )
    throw new Error(
      `Configured service ${serviceId} does not match the expected staging ${kind} name, URL, or GHCR image repository.`,
    );
  const active = [
    'created',
    'build_in_progress',
    'pre_deploy_in_progress',
    'update_in_progress',
    'queued',
  ];
  const terminal = [
    'live',
    'failed',
    'build_failed',
    'update_failed',
    'pre_deploy_failed',
    'canceled',
    'deactivated',
  ];
  let cursor;
  for (let page = 0; page < 5; page += 1) {
    const query = new URLSearchParams({ limit: '100' });
    if (cursor) query.set('cursor', cursor);
    const rows = await requestJson(
      fetcher,
      `${RENDER_API}/services/${encodeURIComponent(serviceId)}/deploys?${query}`,
      headers,
    );
    if (!Array.isArray(rows))
      throw new Error(`Deploy state for ${kind} is unavailable.`);
    if (
      rows.some((row) => !row || !row.deploy || typeof row.cursor !== 'string')
    )
      throw new Error(`Paginated deploy state for ${kind} is incomplete.`);
    const statuses = rows.map((row) =>
      String(row.deploy.status || '').toLowerCase(),
    );
    if (
      statuses.some(
        (status) => !active.includes(status) && !terminal.includes(status),
      )
    )
      throw new Error(`Deploy state for ${kind} contains an unknown status.`);
    if (statuses.some((status) => active.includes(status)))
      throw new Error(
        `A staging deploy is active or queued for ${kind}; retry when staging is idle.`,
      );
    cursor = rows.at(-1)?.cursor;
    if (!cursor) return;
  }
  throw new Error(
    `Deploy history for ${kind} exceeded the bounded pagination check.`,
  );
}

async function checkCoordination(options = {}) {
  const env = options.env || process.env;
  const fetcher = options.fetch || fetch;
  const token = requireEnv(env, 'GITHUB_TOKEN');
  const repository = requireEnv(env, 'GITHUB_REPOSITORY');
  const currentRunId = requireEnv(env, 'GITHUB_RUN_ID');
  const apiKey = requireEnv(env, 'RENDER_API_KEY');
  const backendId = requireEnv(env, 'BACKEND_SERVICE_ID');
  const frontendId = requireEnv(env, 'FRONTEND_SERVICE_ID');
  if (backendId === frontendId)
    throw new Error('Backend and frontend service IDs must differ.');
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const statuses = ['queued', 'in_progress', 'waiting', 'pending', 'requested'];
  const [cdGroups, rollbackGroups] = await Promise.all([
    Promise.all(
      statuses.map((status) =>
        listWorkflowRuns(
          fetcher,
          ghHeaders,
          repository,
          WORKFLOWS.cd,
          status,
        ).then((result) => result.workflow_runs),
      ),
    ),
    Promise.all(
      statuses.map((status) =>
        listWorkflowRuns(
          fetcher,
          ghHeaders,
          repository,
          WORKFLOWS.rollback,
          status,
        ).then((result) => result.workflow_runs),
      ),
    ),
  ]);
  const cdRuns = cdGroups.flat();
  const rollbackRuns = rollbackGroups.flat();
  const busyCd = activeRuns(cdRuns, currentRunId);
  const busyRollback = activeRuns(rollbackRuns, currentRunId);
  if (busyCd.length || busyRollback.length)
    throw new Error(
      'A CD or rollback workflow is active or queued; retry when staging is idle.',
    );
  if (options.requireNoCompletedCdSinceDispatch) {
    const current = await requestJson(
      fetcher,
      `${API}/repos/${repository}/actions/runs/${currentRunId}`,
      ghHeaders,
    );
    if (
      String(current.id) !== String(currentRunId) ||
      !Number.isFinite(Date.parse(current.created_at || ''))
    )
      throw new Error('Rollback dispatch time is unavailable.');
    // A CD run can finish while rollback waits for the shared group. Filter
    // from this rollback's dispatch so a completed collision is not missed.
    const query = new URLSearchParams({
      status: 'completed',
      created: `>=${current.created_at}`,
      per_page: '1',
    });
    const recent = await requestJson(
      fetcher,
      `${API}/repos/${repository}/actions/workflows/${WORKFLOWS.cd}/runs?${query}`,
      ghHeaders,
    );
    if (
      !Number.isInteger(recent.total_count) ||
      !Array.isArray(recent.workflow_runs) ||
      (recent.total_count > 0 && recent.workflow_runs.length === 0)
    )
      throw new Error('Completed CD collision query was incomplete.');
    if (recent.total_count > 0)
      throw new Error(
        'A CD run completed since rollback dispatch; retry rollback when staging is idle.',
      );
  }
  await Promise.all([
    inspectService(fetcher, apiKey, backendId, 'backend'),
    inspectService(fetcher, apiKey, frontendId, 'frontend'),
  ]);
  return { busy: false, services: [backendId, frontendId] };
}

async function rollbackOverlappedCd(options = {}) {
  const env = options.env || process.env;
  const fetcher = options.fetch || fetch;
  const token = requireEnv(env, 'GITHUB_TOKEN');
  const repository = requireEnv(env, 'GITHUB_REPOSITORY');
  const runId = requireEnv(env, 'GITHUB_RUN_ID');
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const current = await requestJson(
    fetcher,
    `${API}/repos/${repository}/actions/runs/${runId}`,
    headers,
  );
  const currentCreated = Date.parse(current.created_at || '');
  if (!Number.isFinite(currentCreated))
    throw new Error('Current CD run creation time is unavailable.');
  const runs = await listCompletedRollbackRuns(fetcher, headers, repository);
  for (const run of runs) {
    if (String(run.id) === String(runId)) continue;
    const jobs = await requestJson(
      fetcher,
      `${API}/repos/${repository}/actions/runs/${run.id}/jobs?per_page=100`,
      headers,
    );
    if (!Array.isArray(jobs.jobs))
      throw new Error('Rollback job timing response was incomplete.');
    if (
      !Number.isInteger(jobs.total_count) ||
      jobs.total_count > jobs.jobs.length
    )
      throw new Error('Rollback job timing pagination was incomplete.');
    const mutation = jobs.jobs.find((job) => job.name === 'Rollback Staging');
    const completedAt = Date.parse(mutation?.completed_at || '');
    const startedAt = Date.parse(mutation?.started_at || '');
    if (
      Number.isFinite(startedAt) &&
      Number.isFinite(completedAt) &&
      completedAt >= currentCreated
    )
      return true;
  }
  return false;
}

async function cdGuard(options = {}) {
  const env = options.env || process.env;
  const fsImpl = options.fs || fs;
  const outputPath = requireEnv(env, 'GITHUB_OUTPUT');
  const summaryPath = env.GITHUB_STEP_SUMMARY || '/dev/null';
  const skip = await rollbackOverlappedCd(options);
  fsImpl.appendFileSync(outputPath, `skip=${skip}\n`);
  fsImpl.appendFileSync(
    summaryPath,
    skip
      ? '### Staging CD skipped\nA rollback mutation overlapped this CD run.\n'
      : '### Staging CD eligible\nNo overlapping rollback mutation was observed.\n',
  );
  return skip;
}

async function main() {
  try {
    if (process.argv[2] === 'cd-guard') {
      await cdGuard();
      return;
    }
    if (
      process.argv[2] === 'preflight' ||
      process.argv[2] === 'mutation-check'
    ) {
      const result = await checkCoordination({
        requireNoCompletedCdSinceDispatch: process.argv[2] === 'mutation-check',
      });
      if (process.argv[2] === 'preflight') {
        fs.appendFileSync(
          process.env.GITHUB_STEP_SUMMARY || '/dev/null',
          'Rollback preflight found CD, rollback, and both Render services idle.\n',
        );
      }
      return result;
    }
    throw new Error('Unknown staging coordination command.');
  } catch (error) {
    const message = String(error.message).slice(0, 320);
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY || '/dev/null',
      `Rollback coordination failed: ${message}\n`,
    );
    console.error(`::error::${message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = {
  activeRuns,
  cdGuard,
  checkCoordination,
  inspectService,
  listCompletedRollbackRuns,
  rollbackOverlappedCd,
};
