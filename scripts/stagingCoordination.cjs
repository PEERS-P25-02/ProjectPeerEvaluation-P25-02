const fs = require('node:fs');

const RENDER_API = 'https://api.render.com/v1';
const { readStagingServiceConfig } = require('../tests/staging/config.cjs');
const ACTIVE_DEPLOY_STATUSES = [
  'created',
  'queued',
  'build_in_progress',
  'pre_deploy_in_progress',
  'update_in_progress',
];
const IMAGE_REF = /^ghcr\.io\/[a-z0-9._-]+\/[a-z0-9._-]+@sha256:[0-9a-f]{64}$/i;

class CoordinationError extends Error {
  constructor(category, message) {
    super(message);
    this.category = category;
  }
}

/** Require workflow configuration before contacting the coordination API. */
function requireEnv(env, key) {
  if (!env[key]) {
    const categories = {
      RENDER_API_KEY: 'render_api_key_missing',
      BACKEND_SERVICE_ID: 'backend_id_missing',
      FRONTEND_SERVICE_ID: 'frontend_id_missing',
    };
    throw new CoordinationError(
      categories[key] || 'configuration_missing',
      `${key} is required.`,
    );
  }
  return env[key];
}

/** Fetch bounded JSON and reduce API failures to safe, status-only errors. */
async function requestJson(fetcher, url, headers) {
  const response = await fetcher(url, {
    headers,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(`Coordination API failed (HTTP ${response.status}).`);
  return response.json();
}

/** Confirm service identity and fail closed if Render reports an active deploy. */
async function inspectService(
  fetcher,
  apiKey,
  serviceId,
  kind,
  config,
  imageRef,
) {
  if (!['backend', 'frontend'].includes(kind))
    throw new CoordinationError(
      'service_kind_invalid',
      'Configured service kind is invalid.',
    );
  const expectedName =
    kind === 'backend' ? config.backendName : config.frontendName;
  const expectedUrl =
    kind === 'backend' ? config.backendUrl : config.frontendUrl;
  const category = (field) => `${kind}_${field}_mismatch`;
  if (!IMAGE_REF.test(imageRef || ''))
    throw new CoordinationError(
      category('image_repository'),
      'Selected image reference is invalid.',
    );
  const expectedRepository = imageRef.slice(0, imageRef.indexOf('@'));
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
  if (!service || typeof service !== 'object' || service.id !== serviceId)
    throw new CoordinationError(
      category('id'),
      `Configured ${kind} service ID does not match Render.`,
    );
  if (service.name !== expectedName)
    throw new CoordinationError(
      category('name'),
      `Configured ${kind} service name does not match Render.`,
    );
  if (service.type !== 'web_service')
    throw new CoordinationError(
      category('type'),
      `Configured ${kind} service type is not web_service.`,
    );
  if (service.serviceDetails?.url !== expectedUrl)
    throw new CoordinationError(
      category('url'),
      `Configured ${kind} service URL does not match Render.`,
    );
  if (
    typeof service.imagePath !== 'string' ||
    (!service.imagePath.startsWith(`${expectedRepository}:`) &&
      !service.imagePath.startsWith(`${expectedRepository}@`))
  )
    throw new CoordinationError(
      category('image_repository'),
      `Configured ${kind} GHCR image repository does not match.`,
    );

  const query = new URLSearchParams({ limit: '1' });
  // Repeated status parameters ask Render for any active state in one result set.
  // Render models status as a query array; repeated keys encode its form/explode representation.
  for (const status of ACTIVE_DEPLOY_STATUSES) query.append('status', status);
  const rows = await requestJson(
    fetcher,
    `${RENDER_API}/services/${encodedServiceId}/deploys?${query}`,
    headers,
  );
  if (!Array.isArray(rows))
    throw new CoordinationError(
      `${kind}_deploy_state_unavailable`,
      `Filtered deploy state for ${kind} is unavailable.`,
    );
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
    throw new CoordinationError(
      `${kind}_deploy_state_invalid`,
      `Filtered deploy state for ${kind} was malformed or contained an unexpected status.`,
    );
  if (rows.length)
    throw new CoordinationError(
      `${kind}_deploy_active`,
      `A staging deploy is active or queued for ${kind}; retry when staging is idle.`,
    );
}

async function checkCoordination(options = {}) {
  const env = options.env || process.env;
  const fetcher = options.fetch || fetch;
  const apiKey = requireEnv(env, 'RENDER_API_KEY');
  const backendId = requireEnv(env, 'BACKEND_SERVICE_ID');
  const frontendId = requireEnv(env, 'FRONTEND_SERVICE_ID');
  const config = readStagingServiceConfig(env);
  if (backendId === frontendId)
    throw new CoordinationError(
      'service_ids_not_distinct',
      'Backend and frontend service IDs must differ.',
    );

  await Promise.all([
    inspectService(
      fetcher,
      apiKey,
      backendId,
      'backend',
      config,
      env.BACKEND_IMAGE,
    ),
    inspectService(
      fetcher,
      apiKey,
      frontendId,
      'frontend',
      config,
      env.FRONTEND_IMAGE,
    ),
  ]);
  return { busy: false, services: [backendId, frontendId] };
}

async function main() {
  try {
    if (process.argv[2] !== 'mutation-check')
      throw new Error('Unknown staging coordination command.');
    return await checkCoordination();
  } catch (error) {
    const known = error instanceof CoordinationError;
    const category = known
      ? error.category
      : error.field
        ? `staging_${error.field}_invalid`
        : 'coordination_api_or_network_failure';
    const message = known
      ? String(error.message).slice(0, 320)
      : 'Coordination API request failed.';
    if (process.env.GITHUB_OUTPUT)
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `coordination_failure_category=${category}\n`,
      );
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
  ACTIVE_DEPLOY_STATUSES,
  CoordinationError,
  checkCoordination,
  inspectService,
};
