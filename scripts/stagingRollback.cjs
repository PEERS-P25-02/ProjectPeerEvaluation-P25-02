const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { runDeployment } = require('./deployStaging.cjs');
const {
  parseAnnotatedTag,
  buildRollbackManifest,
} = require('./stagingHistory.cjs');
const {
  allRequiredSmokeChecksPassed,
} = require('../tests/staging/safe-evidence.cjs');

const TAG_PATTERN = /^staging-success\/(?:cd|rollback)-[0-9]+-[0-9]+$/;
const REASON_MAX = 500;
const runGit = (args, options = {}) => {
  const token = options.env?.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const remote = ['fetch', 'ls-remote', 'push'].includes(args[0]);
  const auth = token
    ? `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`
    : null;
  const gitArgs =
    remote && auth
      ? ['-c', `http.https://github.com/.extraheader=${auth}`, ...args]
      : args;
  try {
    return (options.execFileSync || execFileSync)('git', gitArgs, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    }).trim();
  } catch (error) {
    const operation =
      {
        fetch: 'fetch target',
        'ls-remote': 'check remote tag',
        push: 'push history tag',
        tag: 'create history tag',
        'rev-parse': 'resolve commit',
        'cat-file': 'inspect target',
        config: 'configure tag identity',
      }[args[0]] || 'run Git operation';
    const stderr = String(error.stderr || '').toLowerCase();
    const category = /authentication|403|401|permission denied/.test(stderr)
      ? 'authentication or permission failure'
      : /could not resolve|connection|timed out|network/.test(stderr)
        ? 'network failure'
        : /shallow|not our ref|unadvertised/.test(stderr)
          ? 'required object unavailable'
          : 'Git command failed';
    throw new Error(`Could not ${operation}: ${category}.`);
  }
};

/** Validate the manual dispatch before any remote lookup or deployment work. */
function validateDispatch(input) {
  if (!TAG_PATTERN.test(input.targetTag || ''))
    throw new Error('Select one exact staging-success CD or rollback tag.');
  if (
    typeof input.reason !== 'string' ||
    input.reason.trim().length < 1 ||
    input.reason.trim().length > REASON_MAX
  )
    throw new Error(`Reason must contain 1 to ${REASON_MAX} characters.`);
  if (input.acknowledged !== 'true')
    throw new Error(
      'Acknowledge database and external-configuration compatibility before rollback.',
    );
  if (
    !/^[0-9a-f]{40}$/.test(input.dispatchSha || '') ||
    input.ref !== 'refs/heads/main'
  )
    throw new Error(
      'Rollback must use reviewed workflow code dispatched from main.',
    );
  return {
    targetTag: input.targetTag,
    reason: input.reason.trim(),
  };
}

/** Fetch and bind the selected history entry to its annotated Git tag object. */
function readTarget(input, options = {}) {
  const git = options.git || runGit;
  const fetchTag = `refs/tags/${input.targetTag}:refs/tags/${input.targetTag}`;
  git(['fetch', '--no-tags', 'origin', fetchTag]);
  const ref = `refs/tags/${input.targetTag}`;
  // A lightweight tag has no manifest-bearing tag object to validate.
  if (git(['cat-file', '-t', ref]) !== 'tag')
    throw new Error('Target is not an annotated tag.');
  const targetObjectId = git(['rev-parse', `${ref}^{tag}`]);
  if (!/^[0-9a-f]{40}$/.test(targetObjectId))
    throw new Error('Target tag object ID is invalid.');
  const manifest = parseAnnotatedTag(git(['cat-file', 'tag', targetObjectId]));
  const manifestTag = `staging-success/${manifest.kind}-${manifest.workflow_run_id}-${manifest.workflow_run_attempt}`;
  if (input.targetTag !== manifestTag)
    throw new Error('Selected target tag name does not match its manifest.');
  git(['cat-file', '-e', `${manifest.source_sha}^{commit}`]);
  return { targetObjectId, manifest };
}

function requireConfiguredServices(manifest, env) {
  if (
    manifest.backend_service_id !== env.BACKEND_SERVICE_ID ||
    manifest.frontend_service_id !== env.FRONTEND_SERVICE_ID
  )
    throw new Error(
      'Selected history tag does not match the configured staging service IDs.',
    );
}

/** Remove URLs, control characters, and configured credentials from evidence text. */
function safeReason(value, env = process.env) {
  let result = String(value || '')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL REDACTED]')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const secret of [
    env.RENDER_API_KEY,
    env.GITHUB_TOKEN,
    env.STAGING_EVALUATION_TOKEN,
  ].filter(Boolean)) {
    for (const variant of [secret, encodeURIComponent(secret)])
      result = result.replaceAll(variant, '[REDACTED]');
  }
  return result.slice(0, REASON_MAX);
}

function writeOutput(file, values) {
  fs.appendFileSync(
    file,
    `${Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')}\n`,
  );
}

/** Validate the request and save a fixed target for the locked mutation job. */
async function preflight(options = {}) {
  const env = options.env || process.env;
  const input = validateDispatch({
    targetTag: env.TARGET_TAG,
    reason: env.ROLLBACK_REASON,
    acknowledged: env.COMPATIBILITY_ACKNOWLEDGED,
    dispatchSha: env.GITHUB_SHA,
    ref: env.GITHUB_REF,
  });
  const target = readTarget(input, options);
  requireConfiguredServices(target.manifest, env);
  const out = env.GITHUB_OUTPUT;
  if (!out) throw new Error('GITHUB_OUTPUT is required.');
  writeOutput(out, {
    target_sha: target.manifest.source_sha,
    target_backend_image: target.manifest.backend_image,
    target_frontend_image: target.manifest.frontend_image,
    target_tag_object: target.targetObjectId,
  });
  fs.writeFileSync(
    env.TARGET_FILE || 'staging-rollback-target.json',
    `${JSON.stringify({ target_tag: input.targetTag, target_tag_object: target.targetObjectId, manifest: target.manifest }, null, 2)}\n`,
  );
  return target;
}

/** Re-read the remote tag immediately before mutation to detect target drift. */
function mutationCheck(options = {}) {
  const env = options.env || process.env;
  const input = validateDispatch({
    targetTag: env.TARGET_TAG,
    reason: env.ROLLBACK_REASON,
    acknowledged: env.COMPATIBILITY_ACKNOWLEDGED,
    dispatchSha: env.GITHUB_SHA,
    ref: env.GITHUB_REF,
  });
  const target = JSON.parse(
    fs.readFileSync(env.TARGET_FILE || 'staging-rollback-target.json', 'utf8'),
  );
  const current = readTarget(input, options);
  requireConfiguredServices(current.manifest, env);
  if (
    current.targetObjectId !== target.target_tag_object ||
    JSON.stringify(current.manifest) !== JSON.stringify(target.manifest)
  )
    throw new Error('Selected target tag changed after preflight.');
  return current;
}

/** Restore the selected digest pair through the shared backend-first deployer. */
async function deploy(options = {}) {
  const env = options.env || process.env;
  const target = JSON.parse(
    fs.readFileSync(env.TARGET_FILE || 'staging-rollback-target.json', 'utf8'),
  );
  const outputPath = env.RESULT_PATH || 'staging-deployment.json';
  const save = (record) =>
    fs.writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`);
  try {
    // Verified-history eligibility intentionally skips the moving-main check used by CD.
    // Rollback restores the image pair and source recorded in the selected manifest.
    return await runDeployment(
      {
        sourceSha: target.manifest.source_sha,
        backendImage: target.manifest.backend_image,
        frontendImage: target.manifest.frontend_image,
        backendServiceId: env.BACKEND_SERVICE_ID,
        frontendServiceId: env.FRONTEND_SERVICE_ID,
        apiKey: env.RENDER_API_KEY,
        env,
      },
      {
        ...options.deploymentOptions,
        save,
        retryTransient: true,
        eligibility: 'verified-history',
      },
    );
  } catch (error) {
    if (error.record) save(error.record);
    throw error;
  }
}

/** Build success history only from verified deployment and smoke evidence. */
function recordSuccess(options = {}) {
  const env = options.env || process.env;
  const target = JSON.parse(
    fs.readFileSync(env.TARGET_FILE || 'staging-rollback-target.json', 'utf8'),
  );
  const deployment = JSON.parse(
    fs.readFileSync(env.DEPLOYMENT_FILE || 'staging-deployment.json', 'utf8'),
  );
  const smoke = JSON.parse(
    fs.readFileSync(env.SMOKE_FILE || 'staging-smoke-result.json', 'utf8'),
  );
  // Smoke code comes from dispatched main; every required check must pass.
  if (
    smoke.validation_result !== 'success' ||
    smoke.smoke_outcome !== 'success' ||
    !allRequiredSmokeChecksPassed(smoke.checks)
  )
    throw new Error(
      'All three current-main smoke checks must pass before recording rollback success.',
    );
  const manifest = buildRollbackManifest(
    deployment,
    smoke,
    {
      sourceSha: deployment.source_sha,
      frontendImage: deployment.frontend_image,
      backendImage: deployment.backend_image,
      runId: env.GITHUB_RUN_ID,
      runAttempt: env.GITHUB_RUN_ATTEMPT,
      backendServiceId: env.BACKEND_SERVICE_ID,
      frontendServiceId: env.FRONTEND_SERVICE_ID,
    },
    target.manifest,
    target.target_tag,
  );
  const file = env.MANIFEST_FILE || 'staging-rollback-success.json';
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

/** Publish a new rollback tag only after verifying the target tag stayed unchanged. */
function appendHistory(options = {}) {
  const env = options.env || process.env;
  const target = JSON.parse(
    fs.readFileSync(env.TARGET_FILE || 'staging-rollback-target.json', 'utf8'),
  );
  const git = options.git || runGit;
  // Fetch the exact annotated target because checkout actions may leave a shallow
  // local clone without historical commits. Bind both tag object and peeled commit.
  git([
    'fetch',
    '--no-tags',
    'origin',
    `+refs/tags/${target.target_tag}:refs/tags/${target.target_tag}`,
  ]);
  const localTargetObject = git([
    'rev-parse',
    `refs/tags/${target.target_tag}^{tag}`,
  ]);
  const localTargetCommit = git(['rev-parse', `${target.target_tag}^{commit}`]);
  if (
    localTargetObject !== target.target_tag_object ||
    localTargetCommit !== target.manifest.source_sha
  )
    throw new Error(
      'Fetched target tag does not match the preflight object and commit.',
    );
  const currentObject = git([
    'ls-remote',
    '--refs',
    'origin',
    `refs/tags/${target.target_tag}`,
  ]).split(/\s+/)[0];
  // Recheck the chosen object before publishing a separate immutable rollback record.
  if (currentObject !== target.target_tag_object)
    throw new Error('Selected target tag changed after preflight.');
  const tag = `staging-success/rollback-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`;
  if (git(['ls-remote', '--refs', 'origin', `refs/tags/${tag}`]))
    throw new Error('Rollback success tag already exists remotely.');
  const manifestFile = env.MANIFEST_FILE || 'staging-rollback-success.json';
  git(['config', 'user.name', 'github-actions[bot]']);
  git([
    'config',
    'user.email',
    '41898282+github-actions[bot]@users.noreply.github.com',
  ]);
  git([
    'tag',
    '-a',
    tag,
    JSON.parse(fs.readFileSync(manifestFile, 'utf8')).source_sha,
    '-F',
    manifestFile,
  ]);
  git(['push', 'origin', `refs/tags/${tag}`]);
  const remoteObject = git([
    'ls-remote',
    '--refs',
    'origin',
    `refs/tags/${tag}`,
  ]).split(/\s+/)[0];
  const localObject = git(['rev-parse', `refs/tags/${tag}`]);
  if (!remoteObject || remoteObject !== localObject)
    throw new Error('Remote rollback success tag could not be verified.');
  fs.appendFileSync(
    env.GITHUB_STEP_SUMMARY || '/dev/null',
    `### Verified staging rollback success\n\n**${tag}**\n\n[View annotated tag](https://github.com/${env.GITHUB_REPOSITORY}/tree/${tag})\n`,
  );
  if (env.GITHUB_OUTPUT) writeOutput(env.GITHUB_OUTPUT, { success_tag: tag });
  return tag;
}

/** Write a bounded, redacted outcome even when an earlier phase failed. */
function writeEvidence(options = {}) {
  const env = options.env || process.env;
  const readJson = (file) => {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  };
  const target = readJson(env.TARGET_FILE || 'staging-rollback-target.json');
  const deployment = readJson(env.DEPLOYMENT_FILE || 'staging-deployment.json');
  const smoke = readJson(env.SMOKE_FILE || 'staging-smoke-result.json');
  const safe = (value) => safeReason(value, env);
  const finalOutcome = env.FINAL_OUTCOME || 'failure';
  const smokeFailed =
    deployment?.result === 'success' &&
    (!smoke ||
      smoke.validation_result !== 'success' ||
      smoke.smoke_outcome !== 'success');
  const coordinationFailure = /^[a-z0-9_]{1,80}$/.test(
    env.COORDINATION_FAILURE_CATEGORY || '',
  )
    ? env.COORDINATION_FAILURE_CATEGORY
    : null;
  const phase = coordinationFailure
    ? 'coordination'
    : deployment?.result === 'failure'
      ? deployment.phase || 'rollback'
      : smokeFailed
        ? 'smoke'
        : finalOutcome === 'failure' && deployment?.result === 'success'
          ? 'history'
          : deployment?.phase || safe(env.PHASE) || 'preflight';
  // Evidence deliberately copies selected fields and sanitizes free-form text.
  const evidence = {
    target_tag: target?.target_tag || safe(env.TARGET_TAG),
    success_tag: /^staging-success\/rollback-[0-9]+-[0-9]+$/.test(
      env.SUCCESS_TAG || '',
    )
      ? env.SUCCESS_TAG
      : null,
    target_sha: target?.manifest?.source_sha || null,
    target_backend_image: target?.manifest?.backend_image || null,
    target_frontend_image: target?.manifest?.frontend_image || null,
    target_backend_deploy_id: target?.manifest?.backend_deploy_id || null,
    target_frontend_deploy_id: target?.manifest?.frontend_deploy_id || null,
    actor: safe(env.GITHUB_ACTOR).slice(0, 100),
    reason: safe(env.ROLLBACK_REASON),
    dispatch_sha: /^[0-9a-f]{40}$/.test(env.GITHUB_SHA || '')
      ? env.GITHUB_SHA
      : null,
    backend_deploy_id: deployment?.backend_deploy_id || null,
    frontend_deploy_id: deployment?.frontend_deploy_id || null,
    backend_status: deployment?.backend_status || null,
    frontend_status: deployment?.frontend_status || null,
    backend_health: deployment?.backend_health || null,
    phase,
    retry_counts: deployment?.retry_counts || {},
    deployment_result: deployment?.result || 'not_started',
    failure_reason:
      (coordinationFailure
        ? `Coordination check failed: ${coordinationFailure}.`
        : safe(deployment?.failure_reason).slice(0, 320)) ||
      (finalOutcome === 'failure'
        ? 'Rollback workflow failed; inspect the Actions run for step details.'
        : null),
    smoke_result: smoke?.validation_result || 'not_started',
    smoke_outcome: smoke?.smoke_outcome || 'not_started',
    smoke_checks: Array.isArray(smoke?.checks)
      ? smoke.checks.map((check) => ({
          name: safe(check?.name).slice(0, 120),
          status: [
            'passed',
            'failed',
            'timedOut',
            'skipped',
            'interrupted',
          ].includes(check?.status)
            ? check.status
            : 'unknown',
        }))
      : [],
    final_outcome: finalOutcome,
  };
  fs.writeFileSync(
    env.EVIDENCE_FILE || 'staging-rollback-evidence.json',
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  fs.appendFileSync(
    env.GITHUB_STEP_SUMMARY || '/dev/null',
    `### Staging rollback ${evidence.final_outcome}\n- Target tag: \`${evidence.target_tag}\`\n- Target SHA: \`${evidence.target_sha || 'not validated'}\`\n- Phase: \`${evidence.phase}\`\n- Reason: ${evidence.reason}\n- Failure: ${evidence.failure_reason || 'none'}\n`,
  );
  return evidence;
}

async function main() {
  const mode = process.argv[2];
  try {
    if (mode === 'preflight') await preflight();
    else if (mode === 'mutation-check') mutationCheck();
    else if (mode === 'deploy') await deploy();
    else if (mode === 'manifest') recordSuccess();
    else if (mode === 'record') appendHistory();
    else if (mode === 'evidence') writeEvidence();
    else throw new Error('Unknown staging rollback command.');
  } catch (error) {
    const message = safeReason(error.message).slice(0, 320);
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY || '/dev/null',
      `Rollback failed: ${message}\n`,
    );
    console.error(`::error::${message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = {
  appendHistory,
  deploy,
  mutationCheck,
  preflight,
  readTarget,
  runGit,
  recordSuccess,
  safeReason,
  validateDispatch,
  writeEvidence,
};
