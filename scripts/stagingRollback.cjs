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
  return execFileSync('git', gitArgs, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
};

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
    dispatchSha: input.dispatchSha,
  };
}

function readTarget(input, options = {}) {
  const git = options.git || runGit;
  const fetchTag = `refs/tags/${input.targetTag}:refs/tags/${input.targetTag}`;
  git(['fetch', '--no-tags', 'origin', fetchTag]);
  const ref = `refs/tags/${input.targetTag}`;
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

function checkCurrentDispatch(input, options = {}) {
  const git = options.git || runGit;
  const tip = git(['ls-remote', 'origin', 'refs/heads/main']).split(/\s+/)[0];
  return tip === input.dispatchSha;
}

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

async function preflight(options = {}) {
  const env = options.env || process.env;
  const input = validateDispatch({
    targetTag: env.TARGET_TAG,
    reason: env.ROLLBACK_REASON,
    acknowledged: env.COMPATIBILITY_ACKNOWLEDGED,
    dispatchSha: env.GITHUB_SHA,
    ref: env.GITHUB_REF,
  });
  if (!checkCurrentDispatch(input, options))
    throw new Error(
      'Dispatched main commit is no longer the current main tip.',
    );
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
  if (!checkCurrentDispatch(input, options))
    throw new Error(
      'Dispatched main commit is no longer current; no Render deploy was started.',
    );
  return current;
}

async function deploy(options = {}) {
  const env = options.env || process.env;
  const dispatchSha = env.GITHUB_SHA;
  const target = JSON.parse(
    fs.readFileSync(env.TARGET_FILE || 'staging-rollback-target.json', 'utf8'),
  );
  const outputPath = env.RESULT_PATH || 'staging-deployment.json';
  const save = (record) =>
    fs.writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`);
  try {
    return await runDeployment(
      {
        sourceSha: target.manifest.source_sha,
        backendImage: target.manifest.backend_image,
        frontendImage: target.manifest.frontend_image,
        backendServiceId: env.BACKEND_SERVICE_ID,
        frontendServiceId: env.FRONTEND_SERVICE_ID,
        apiKey: env.RENDER_API_KEY,
      },
      {
        ...options.deploymentOptions,
        save,
        retryTransient: true,
        checkEligibility: () => checkCurrentDispatch({ dispatchSha }, options),
      },
    );
  } catch (error) {
    if (error.record) save(error.record);
    throw error;
  }
}

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

function appendHistory(options = {}) {
  const env = options.env || process.env;
  const target = JSON.parse(
    fs.readFileSync(env.TARGET_FILE || 'staging-rollback-target.json', 'utf8'),
  );
  const git = options.git || runGit;
  const currentObject = git([
    'ls-remote',
    '--refs',
    'origin',
    `refs/tags/${target.target_tag}`,
  ]).split(/\s+/)[0];
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
    target_tag_object: target?.target_tag_object || null,
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
    phase:
      deployment?.phase || safe(env.FAILED_STEP).slice(0, 80) || 'preflight',
    retry_counts: deployment?.retry_counts || {},
    deployment_result: deployment?.result || 'not_started',
    workflow_steps: [
      ['preflight_coordination', env.PREFLIGHT_COORDINATION_OUTCOME],
      ['preflight_target', env.PREFLIGHT_TARGET_OUTCOME],
      ['preflight_digests', env.PREFLIGHT_DIGESTS_OUTCOME],
      ['digest_recheck', env.DIGEST_RECHECK_OUTCOME],
      ['mutation_check', env.MUTATION_CHECK_OUTCOME],
      ['fixture_token', env.FIXTURE_TOKEN_OUTCOME],
      ['dependencies', env.DEPENDENCIES_OUTCOME],
      ['deploy', env.DEPLOY_OUTCOME],
      ['smoke', env.SMOKE_STEP_OUTCOME],
      ['manifest', env.MANIFEST_OUTCOME],
      ['history_tag', env.RECORD_OUTCOME],
    ]
      .filter(([, outcome]) => outcome)
      .map(([step, outcome]) => ({ step, outcome })),
    failure_reason:
      safe(deployment?.failure_reason).slice(0, 320) ||
      (env.FAILED_STEP
        ? `Workflow step ${safe(env.FAILED_STEP).slice(0, 80)} failed.`
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
          duration_ms: Number.isFinite(check?.duration_ms)
            ? Math.max(0, Math.round(check.duration_ms))
            : null,
          ...(check?.failure_category
            ? {
                failure_category: safe(check.failure_category).slice(0, 80),
              }
            : {}),
          ...(check?.diagnostic
            ? { diagnostic: safe(check.diagnostic).slice(0, 320) }
            : {}),
        }))
      : [],
    final_outcome: env.FINAL_OUTCOME || 'failure',
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
  checkCurrentDispatch,
  deploy,
  mutationCheck,
  preflight,
  readTarget,
  recordSuccess,
  safeReason,
  validateDispatch,
  writeEvidence,
};
