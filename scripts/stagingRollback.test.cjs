const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { REQUIRED_SMOKE_CHECKS } = require('../tests/staging/safe-evidence.cjs');
const {
  appendHistory,
  mutationCheck,
  preflight,
  readTarget,
  recordSuccess,
  safeReason,
  validateDispatch,
  writeEvidence,
} = require('./stagingRollback.cjs');

const sha = 'a'.repeat(40);
const manifest = {
  kind: 'cd',
  schema_version: 1,
  source_sha: sha,
  backend_image: `ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-backend@sha256:${'b'.repeat(64)}`,
  frontend_image: `ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-frontend@sha256:${'c'.repeat(64)}`,
  backend_service_id: 'srv-backend',
  frontend_service_id: 'srv-frontend',
  backend_deploy_id: 'dep-backend',
  frontend_deploy_id: 'dep-frontend',
  workflow_run_id: '20',
  workflow_run_attempt: '1',
  smoke_checks: REQUIRED_SMOKE_CHECKS.map((name) => ({
    name,
    result: 'passed',
  })),
};
const tagName = 'staging-success/cd-20-1';
const tagObject = `object ${sha}\ntype commit\ntag ${tagName}\ntagger Agent <agent@example.com> 0 +0000\n\n${JSON.stringify(manifest)}`;
const tagObjectId = 'd'.repeat(40);
function gitStub(currentObjectId = tagObjectId) {
  return (args) => {
    if (args[0] === 'ls-remote') return `${sha}\trefs/heads/main`;
    if (args[0] === 'fetch') return '';
    if (args[0] === 'cat-file' && args[1] === '-t') return 'tag';
    if (args[0] === 'rev-parse') return currentObjectId;
    if (args[0] === 'cat-file' && args[1] === 'tag') return tagObject;
    if (args[0] === 'cat-file' && args[1] === '-e') return '';
    throw new Error(`Unexpected git args: ${args.join(' ')}`);
  };
}

test('dispatch validation requires exact history selection, bounded reason, ack, and main SHA', () => {
  const input = {
    targetTag: tagName,
    reason: 'Restore after deployment incident',
    acknowledged: 'true',
    dispatchSha: sha,
    ref: 'refs/heads/main',
  };
  assert.equal(validateDispatch(input).targetTag, tagName);
  assert.throws(
    () => validateDispatch({ ...input, targetTag: 'staging-last-success' }),
    /exact staging-success/,
  );
  assert.throws(
    () => validateDispatch({ ...input, acknowledged: 'false' }),
    /Acknowledge/,
  );
  assert.throws(
    () => validateDispatch({ ...input, reason: '   ' }),
    /1 to 500/,
  );
  assert.throws(
    () => validateDispatch({ ...input, ref: 'refs/heads/feature' }),
    /dispatched from main/,
  );
});

test('target reader fetches and validates the exact annotated manifest object', () => {
  const target = readTarget({ targetTag: tagName }, { git: gitStub() });
  assert.equal(target.targetObjectId, tagObjectId);
  assert.equal(target.manifest.source_sha, sha);
  assert.equal(
    readTarget({ targetTag: tagName }, { git: gitStub('e'.repeat(40)) })
      .targetObjectId,
    'e'.repeat(40),
  );
  assert.throws(
    () =>
      readTarget({ targetTag: 'staging-success/cd-21-1' }, { git: gitStub() }),
    /selected target tag name/i,
  );
});

test('preflight records only validated target fields and refuses stale main dispatch', async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'rollback-preflight-'),
  );
  const env = {
    TARGET_TAG: tagName,
    ROLLBACK_REASON: 'Restore after deployment incident',
    COMPATIBILITY_ACKNOWLEDGED: 'true',
    GITHUB_SHA: sha,
    GITHUB_REF: 'refs/heads/main',
    GITHUB_OUTPUT: path.join(directory, 'output'),
    TARGET_FILE: path.join(directory, 'target.json'),
    BACKEND_SERVICE_ID: manifest.backend_service_id,
    FRONTEND_SERVICE_ID: manifest.frontend_service_id,
  };
  fs.writeFileSync(env.GITHUB_OUTPUT, '');
  const target = await preflight({ env, git: gitStub() });
  assert.equal(target.manifest.source_sha, sha);
  assert.match(
    fs.readFileSync(env.GITHUB_OUTPUT, 'utf8'),
    /target_tag_object=/,
  );
  assert.equal(
    JSON.parse(fs.readFileSync(env.TARGET_FILE, 'utf8')).target_tag,
    tagName,
  );
  assert.throws(
    () => mutationCheck({ env, git: gitStub('e'.repeat(40)) }),
    /changed after preflight/,
  );
  await assert.rejects(
    preflight({
      env: { ...env, BACKEND_SERVICE_ID: 'srv-other' },
      git: gitStub(),
    }),
    /configured staging service IDs/,
  );
  fs.rmSync(directory, { recursive: true, force: true });
});

test('rollback success requires all smoke checks, then appends one verified tag', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rollback-tag-'));
  const targetFile = path.join(directory, 'target.json');
  const deploymentFile = path.join(directory, 'deployment.json');
  const smokeFile = path.join(directory, 'smoke.json');
  const manifestFile = path.join(directory, 'manifest.json');
  const summaryFile = path.join(directory, 'summary');
  const outputFile = path.join(directory, 'output');
  const env = {
    TARGET_FILE: targetFile,
    DEPLOYMENT_FILE: deploymentFile,
    SMOKE_FILE: smokeFile,
    MANIFEST_FILE: manifestFile,
    GITHUB_STEP_SUMMARY: summaryFile,
    GITHUB_OUTPUT: outputFile,
    GITHUB_REPOSITORY: 'org/repo',
    GITHUB_RUN_ID: '30',
    GITHUB_RUN_ATTEMPT: '1',
    BACKEND_SERVICE_ID: manifest.backend_service_id,
    FRONTEND_SERVICE_ID: manifest.frontend_service_id,
  };
  fs.writeFileSync(
    targetFile,
    JSON.stringify({
      target_tag: tagName,
      target_tag_object: tagObjectId,
      manifest,
    }),
  );
  fs.writeFileSync(
    deploymentFile,
    JSON.stringify({
      source_sha: sha,
      backend_image: manifest.backend_image,
      frontend_image: manifest.frontend_image,
      backend_service_id: manifest.backend_service_id,
      frontend_service_id: manifest.frontend_service_id,
      backend_deploy_id: 'dep-newbackend',
      frontend_deploy_id: 'dep-newfrontend',
      backend_status: 'live',
      frontend_status: 'live',
      backend_health: { http_status: 200, status: 'OK' },
      result: 'success',
    }),
  );
  const smoke = {
    source_sha: sha,
    backend_image: manifest.backend_image,
    frontend_image: manifest.frontend_image,
    validation_result: 'success',
    smoke_outcome: 'success',
    checks: REQUIRED_SMOKE_CHECKS.map((name) => ({ name, status: 'passed' })),
  };
  fs.writeFileSync(smokeFile, JSON.stringify(smoke));
  const success = recordSuccess({ env });
  assert.equal(success.target_tag, tagName);
  assert.equal(success.target_backend_deploy_id, manifest.backend_deploy_id);
  assert.equal(success.backend_deploy_id, 'dep-newbackend');
  let pushed = false;
  const commands = [];
  const git = (args) => {
    commands.push(args);
    if (args[0] === 'ls-remote') {
      if (args.at(-1) === `refs/tags/${tagName}`)
        return `${tagObjectId}\trefs/tags/${tagName}`;
      return pushed
        ? `${'e'.repeat(40)}\trefs/tags/staging-success/rollback-30-1`
        : '';
    }
    if (args[0] === 'push') {
      pushed = true;
      return '';
    }
    if (args[0] === 'rev-parse') return 'e'.repeat(40);
    return '';
  };
  assert.equal(appendHistory({ env, git }), 'staging-success/rollback-30-1');
  assert.equal(commands.filter(([name]) => name === 'push').length, 1);
  assert.match(fs.readFileSync(summaryFile, 'utf8'), /rollback-30-1/);
  assert.throws(() => appendHistory({ env, git }), /already exists/);
  fs.writeFileSync(
    smokeFile,
    JSON.stringify({ ...smoke, checks: smoke.checks.slice(0, 2) }),
  );
  assert.throws(() => recordSuccess({ env }), /three current-main smoke/);
  fs.rmSync(directory, { recursive: true, force: true });
});

test('evidence redacts URLs, bounds user reason, and includes only safe deployment and smoke fields', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'rollback-evidence-'),
  );
  const targetFile = path.join(directory, 'target.json');
  const deploymentFile = path.join(directory, 'deployment.json');
  const smokeFile = path.join(directory, 'smoke.json');
  const evidenceFile = path.join(directory, 'evidence.json');
  fs.writeFileSync(
    targetFile,
    JSON.stringify({
      target_tag: tagName,
      target_tag_object: tagObjectId,
      manifest,
    }),
  );
  fs.writeFileSync(
    deploymentFile,
    JSON.stringify({
      backend_deploy_id: 'dep-newbackend',
      phase: 'backend_health',
      result: 'failure',
      failure_reason: 'https://secret.example/token',
      backend_health: { http_status: 503, status: null },
      retry_counts: { backend_status_get: 2 },
    }),
  );
  fs.writeFileSync(
    smokeFile,
    JSON.stringify({
      validation_result: 'failure',
      smoke_outcome: 'failure',
      checks: [
        {
          name: 'test',
          status: 'failed',
          diagnostic: 'https://secret.example/private',
        },
      ],
    }),
  );
  const env = {
    TARGET_FILE: targetFile,
    DEPLOYMENT_FILE: deploymentFile,
    SMOKE_FILE: smokeFile,
    EVIDENCE_FILE: evidenceFile,
    TARGET_TAG: tagName,
    ROLLBACK_REASON: `incident at https://example.com ${'x'.repeat(600)}`,
    GITHUB_ACTOR: 'tester',
    GITHUB_SHA: sha,
    RENDER_API_KEY: 'render-secret',
    GITHUB_TOKEN: 'github-secret',
    STAGING_EVALUATION_TOKEN: 'fixture-secret',
  };
  env.ROLLBACK_REASON = `${'x'.repeat(495)}render-secret`;
  fs.writeFileSync(
    deploymentFile,
    JSON.stringify({
      backend_deploy_id: 'dep-newbackend',
      phase: 'backend_health',
      result: 'failure',
      failure_reason: 'render-secret github-secret fixture-secret',
      backend_health: { http_status: 503, status: null },
      retry_counts: { backend_status_get: 2 },
    }),
  );
  fs.writeFileSync(
    smokeFile,
    JSON.stringify({
      validation_result: 'failure',
      smoke_outcome: 'failure',
      checks: [
        {
          name: 'test',
          status: 'failed',
          diagnostic: 'fixture-secret',
        },
      ],
    }),
  );
  const evidence = writeEvidence({ env });
  assert.equal(evidence.target_tag, tagName);
  assert.equal(evidence.failure_reason, '[REDACTED] [REDACTED] [REDACTED]');
  assert.equal(evidence.smoke_checks[0].diagnostic, '[REDACTED]');
  assert.ok(evidence.reason.length <= 500);
  assert.doesNotMatch(evidence.reason, /render-secret|render-/);
  assert.equal(
    safeReason('see https://example.com/path'),
    'see [URL REDACTED]',
  );
  const stored = fs.readFileSync(evidenceFile, 'utf8');
  assert.doesNotMatch(
    stored,
    /secret\.example|render-secret|github-secret|fixture-secret/,
  );
  fs.rmSync(directory, { recursive: true, force: true });
});
