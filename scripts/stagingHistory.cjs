const fs = require('node:fs');
const {
  REQUIRED_SMOKE_CHECKS,
  allRequiredSmokeChecksPassed,
} = require('../tests/staging/safe-evidence.cjs');

const IMAGE_REPOSITORIES = {
  backend: 'ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-backend',
  frontend: 'ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-frontend',
};
function fail(message) {
  throw new Error(message);
}

function imageRef(value, kind) {
  return (
    typeof value === 'string' &&
    value.startsWith(`${IMAGE_REPOSITORIES[kind]}@sha256:`) &&
    /^sha256:[0-9a-f]{64}$/.test(
      value.slice(IMAGE_REPOSITORIES[kind].length + 1),
    )
  );
}

function validId(value, prefix) {
  return (
    typeof value === 'string' && new RegExp(`^${prefix}-[a-z0-9]+$`).test(value)
  );
}

function buildManifest(deployment, smoke, identity) {
  const sha = deployment?.source_sha;
  if (
    !/^[0-9a-f]{40}$/.test(sha || '') ||
    sha !== smoke?.source_sha ||
    sha !== identity.sourceSha
  )
    fail('Evidence source SHA mismatch.');
  if (deployment.backend_service_id === deployment.frontend_service_id)
    fail('Backend and frontend service IDs must differ.');
  for (const kind of ['backend', 'frontend']) {
    const image = deployment[`${kind}_image`];
    if (
      !imageRef(image, kind) ||
      image !== smoke[`${kind}_image`] ||
      image !== identity[`${kind}Image`]
    )
      fail(`Evidence ${kind} image mismatch.`);
    if (!validId(deployment[`${kind}_service_id`], 'srv'))
      fail(`Invalid ${kind} service ID.`);
    if (deployment[`${kind}_service_id`] !== identity[`${kind}ServiceId`])
      fail(`${kind} service ID mismatch.`);
    if (!validId(deployment[`${kind}_deploy_id`], 'dep'))
      fail(`Invalid ${kind} deploy ID.`);
    if (deployment[`${kind}_status`] !== 'live')
      fail(`${kind} deployment is not live.`);
  }
  if (
    deployment.result !== 'success' ||
    deployment.backend_health?.http_status !== 200 ||
    deployment.backend_health?.status !== 'OK'
  )
    fail('Deployment evidence is incomplete.');
  if (
    smoke.validation_result !== 'success' ||
    smoke.smoke_outcome !== 'success' ||
    !Array.isArray(smoke.checks)
  )
    fail('Smoke evidence is incomplete.');
  if (!allRequiredSmokeChecksPassed(smoke.checks))
    fail(
      'Smoke evidence does not contain exactly the required passing checks.',
    );
  if (
    !/^[0-9]+$/.test(identity.runId || '') ||
    !/^[0-9]+$/.test(identity.runAttempt || '')
  )
    fail('Invalid CD run identity.');
  return {
    kind: 'cd',
    schema_version: 1,
    source_sha: sha,
    backend_image: deployment.backend_image,
    frontend_image: deployment.frontend_image,
    backend_service_id: deployment.backend_service_id,
    frontend_service_id: deployment.frontend_service_id,
    backend_deploy_id: deployment.backend_deploy_id,
    frontend_deploy_id: deployment.frontend_deploy_id,
    workflow_run_id: identity.runId,
    workflow_run_attempt: identity.runAttempt,
    smoke_checks: REQUIRED_SMOKE_CHECKS.map((name) => ({
      name,
      result: 'passed',
    })),
  };
}

function validateManifest(value) {
  if (
    !value ||
    value.schema_version !== 1 ||
    !/^[0-9a-f]{40}$/.test(value.source_sha || '')
  )
    fail('Invalid success manifest.');
  const expectedKeys = [
    'kind',
    'schema_version',
    'source_sha',
    'backend_image',
    'frontend_image',
    'backend_service_id',
    'frontend_service_id',
    'backend_deploy_id',
    'frontend_deploy_id',
    'workflow_run_id',
    'workflow_run_attempt',
    'smoke_checks',
  ];
  if (Object.keys(value).sort().join(',') !== expectedKeys.sort().join(','))
    fail('Invalid success manifest.');
  if (value.kind !== 'cd') fail('Invalid success manifest.');
  for (const kind of ['backend', 'frontend']) {
    if (
      !imageRef(value[`${kind}_image`], kind) ||
      !validId(value[`${kind}_service_id`], 'srv') ||
      !validId(value[`${kind}_deploy_id`], 'dep')
    )
      fail('Invalid success manifest.');
  }
  if (value.backend_service_id === value.frontend_service_id)
    fail('Invalid success manifest.');
  if (
    !/^[0-9]+$/.test(value.workflow_run_id || '') ||
    !/^[0-9]+$/.test(value.workflow_run_attempt || '')
  )
    fail('Invalid success manifest.');
  if (
    !Array.isArray(value.smoke_checks) ||
    value.smoke_checks.length !== 3 ||
    REQUIRED_SMOKE_CHECKS.some(
      (name) =>
        !value.smoke_checks.some(
          (check) => check?.name === name && check.result === 'passed',
        ),
    ) ||
    value.smoke_checks.some(
      (check) =>
        !check ||
        Object.keys(check).sort().join(',') !== 'name,result' ||
        !REQUIRED_SMOKE_CHECKS.includes(check.name) ||
        check.result !== 'passed',
    )
  )
    fail('Invalid success manifest.');
  return value;
}

function parseAnnotatedTag(tagObject) {
  const separator = tagObject.indexOf('\n\n');
  if (
    separator < 0 ||
    !tagObject.startsWith('object ') ||
    !tagObject.includes('\ntype commit\n')
  )
    fail('Tag is not an annotated commit tag.');
  const manifest = validateManifest(
    JSON.parse(tagObject.slice(separator + 2).trim()),
  );
  if (tagObject.split('\n', 1)[0] !== `object ${manifest.source_sha}`)
    fail('Tag commit does not match its manifest.');
  return manifest;
}

function main() {
  const mode = process.argv[2];
  if (mode === 'manifest') {
    const manifest = buildManifest(
      JSON.parse(fs.readFileSync(process.env.DEPLOYMENT_FILE, 'utf8')),
      JSON.parse(fs.readFileSync(process.env.SMOKE_FILE, 'utf8')),
      {
        sourceSha: process.env.SOURCE_SHA,
        frontendImage: process.env.FRONTEND_IMAGE,
        backendImage: process.env.BACKEND_IMAGE,
        runId: process.env.GITHUB_RUN_ID,
        runAttempt: process.env.GITHUB_RUN_ATTEMPT,
        backendServiceId: process.env.BACKEND_SERVICE_ID,
        frontendServiceId: process.env.FRONTEND_SERVICE_ID,
      },
    );
    fs.writeFileSync(
      process.env.MANIFEST_FILE || 'staging-success.json',
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    return;
  }
  fail('Unknown staging history command.');
}

if (require.main === module) main();
module.exports = {
  buildManifest,
  imageRef,
  parseAnnotatedTag,
  validateManifest,
};
