const fs = require('node:fs');

const RENDER_API = 'https://api.render.com/v1';
const ACTIVE_DEPLOY_STATUSES = [
  'created',
  'queued',
  'build_in_progress',
  'pre_deploy_in_progress',
  'update_in_progress',
];
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

async function inspectService(fetcher, apiKey, serviceId, kind) {
  const expected = EXPECTED_SERVICES[kind];
  if (!expected) throw new Error('Unknown configured Render service kind.');
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  };
  const encodedServiceId = encodeURIComponent(serviceId);
  const service = await requestJson(
    fetcher,
    `${RENDER_API}/services/${encodedServiceId}`,
    headers,
  );
  if (
    !service ||
    typeof service !== 'object' ||
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

  const query = new URLSearchParams({ limit: '1' });
  // Render models status as a query array; repeated keys encode its form/explode representation.
  for (const status of ACTIVE_DEPLOY_STATUSES) query.append('status', status);
  const rows = await requestJson(
    fetcher,
    `${RENDER_API}/services/${encodedServiceId}/deploys?${query}`,
    headers,
  );
  if (!Array.isArray(rows))
    throw new Error(`Filtered deploy state for ${kind} is unavailable.`);
  if (
    rows.some(
      (row) =>
        !row ||
        typeof row.cursor !== 'string' ||
        !row.deploy ||
        typeof row.deploy.status !== 'string' ||
        !ACTIVE_DEPLOY_STATUSES.includes(row.deploy.status),
    )
  )
    throw new Error(
      `Filtered deploy state for ${kind} was malformed or contained an unexpected status.`,
    );
  if (rows.length)
    throw new Error(
      `A staging deploy is active or queued for ${kind}; retry when staging is idle.`,
    );
}

async function checkCoordination(options = {}) {
  const env = options.env || process.env;
  const fetcher = options.fetch || fetch;
  const apiKey = requireEnv(env, 'RENDER_API_KEY');
  const backendId = requireEnv(env, 'BACKEND_SERVICE_ID');
  const frontendId = requireEnv(env, 'FRONTEND_SERVICE_ID');
  if (backendId === frontendId)
    throw new Error('Backend and frontend service IDs must differ.');

  await Promise.all([
    inspectService(fetcher, apiKey, backendId, 'backend'),
    inspectService(fetcher, apiKey, frontendId, 'frontend'),
  ]);
  return { busy: false, services: [backendId, frontendId] };
}

async function main() {
  try {
    if (process.argv[2] !== 'mutation-check')
      throw new Error('Unknown staging coordination command.');
    return await checkCoordination();
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
module.exports = { ACTIVE_DEPLOY_STATUSES, checkCoordination, inspectService };
