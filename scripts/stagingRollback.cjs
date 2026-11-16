const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { runDeployment } = require('./deployStaging.cjs');
const { parseAnnotatedTag } = require('./stagingHistory.cjs');
const {
  allRequiredSmokeChecksPassed,
  REQUIRED_SMOKE_CHECKS,
} = require('../tests/staging/safe-evidence.cjs');

const TAG_PATTERN = /^staging-success\/cd-[0-9]+-[0-9]+$/;
const REASON_MAX = 500;
const runGit = (args, options = {}) => {
  const token = options.env?.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const remote = ['fetch', 'ls-remote'].includes(args[0]);
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
        'rev-parse': 'resolve commit',
        'cat-file': 'inspect target',
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
    throw new Error('Select one exact staging-success CD tag.');
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
  if (manifest.kind !== 'cd')
    throw new Error('Only CD success tags may be rollback targets.');
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
  // Mark dispatch validation before remote tag inspection so evidence can
  // distinguish an invalid dispatch from a rejected target tag.
  fs.writeFileSync(
    env.TARGET_FILE || 'staging-rollback-target.json',
    `${JSON.stringify({ target_tag: input.targetTag, dispatch_validated: true })}\n`,
  );
  const target = readTarget(input, options);
  // Save validated tag metadata for accurate failure reporting. The workflow
  // only uploads this handoff artifact when preflight succeeds.
  fs.writeFileSync(
    env.TARGET_FILE || 'staging-rollback-target.json',
    `${JSON.stringify({ target_tag: input.targetTag, target_tag_object: target.targetObjectId, manifest: target.manifest }, null, 2)}\n`,
  );
  requireConfiguredServices(target.manifest, env);
  const out = env.GITHUB_OUTPUT;
  if (!out) throw new Error('GITHUB_OUTPUT is required.');
  writeOutput(out, {
    target_sha: target.manifest.source_sha,
    target_backend_image: target.manifest.backend_image,
    target_frontend_image: target.manifest.frontend_image,
    target_tag_object: target.targetObjectId,
  });
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

/** Require deployment and smoke evidence to match the selected target. */
function verifySuccess(options = {}) {
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
  // Bind deployment and smoke evidence to the selected immutable CD target.
  if (
    deployment.result !== 'success' ||
    deployment.source_sha !== target.manifest.source_sha ||
    deployment.backend_image !== target.manifest.backend_image ||
    deployment.frontend_image !== target.manifest.frontend_image ||
    deployment.backend_service_id !== target.manifest.backend_service_id ||
    deployment.frontend_service_id !== target.manifest.frontend_service_id ||
    !/^dep-[a-z0-9]+$/.test(deployment.backend_deploy_id || '') ||
    !/^dep-[a-z0-9]+$/.test(deployment.frontend_deploy_id || '') ||
    deployment.backend_deploy_id === target.manifest.backend_deploy_id ||
    deployment.frontend_deploy_id === target.manifest.frontend_deploy_id ||
    deployment.backend_status !== 'live' ||
    deployment.frontend_status !== 'live' ||
    deployment.backend_health?.http_status !== 200 ||
    deployment.backend_health?.status !== 'OK'
  )
    throw new Error(
      'Deployment evidence does not verify the selected live image pair and backend health.',
    );
  if (
    smoke.source_sha !== target.manifest.source_sha ||
    smoke.backend_image !== target.manifest.backend_image ||
    smoke.frontend_image !== target.manifest.frontend_image ||
    smoke.validation_result !== 'success' ||
    smoke.smoke_outcome !== 'success' ||
    !allRequiredSmokeChecksPassed(smoke.checks)
  )
    throw new Error(
      'All three smoke checks must pass for the selected source and image pair.',
    );
  return { deployment, smoke, target };
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
  const verificationFailed =
    deployment?.result === 'success' &&
    finalOutcome === 'failure' &&
    !smokeFailed;
  const phase = coordinationFailure
    ? 'coordination'
    : deployment?.result === 'failure'
      ? deployment.phase || 'rollback'
      : smokeFailed
        ? 'smoke'
        : verificationFailed
          ? 'verification'
          : deployment?.phase || safe(env.PHASE) || 'preflight';
  // Evidence deliberately copies selected fields and sanitizes free-form text.
  const evidence = {
    target_tag: target?.target_tag || safe(env.TARGET_TAG),
    target_sha: target?.manifest?.source_sha || null,
    target_backend_image: target?.manifest?.backend_image || null,
    target_frontend_image: target?.manifest?.frontend_image || null,
    backend_image: deployment?.backend_image || null,
    frontend_image: deployment?.frontend_image || null,
    target_backend_deploy_id: target?.manifest?.backend_deploy_id || null,
    target_frontend_deploy_id: target?.manifest?.frontend_deploy_id || null,
    actor: safe(env.GITHUB_ACTOR).slice(0, 100),
    reason: safe(env.ROLLBACK_REASON),
    dispatch_sha: /^[0-9a-f]{40}$/.test(env.GITHUB_SHA || '')
      ? env.GITHUB_SHA
      : null,
    backend_deploy_id: deployment?.backend_deploy_id || null,
    frontend_deploy_id: deployment?.frontend_deploy_id || null,
    backend_status: safe(deployment?.backend_status).slice(0, 80) || null,
    frontend_status: safe(deployment?.frontend_status).slice(0, 80) || null,
    backend_health: deployment?.backend_health
      ? {
          http_status: Number.isInteger(deployment.backend_health.http_status)
            ? deployment.backend_health.http_status
            : null,
          status: safe(deployment.backend_health.status).slice(0, 80) || null,
        }
      : null,
    phase,
    report_stage: ['preflight', 'rollback'].includes(env.REPORT_STAGE)
      ? env.REPORT_STAGE
      : 'rollback',
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
  const summaryFile = env.GITHUB_STEP_SUMMARY || '/dev/null';
  if (evidence.report_stage === 'preflight') {
    const targetValidated = target?.manifest
      ? 'passed'
      : target?.dispatch_validated
        ? 'failed'
        : 'not evaluated';
    const servicesValidated = target?.manifest
      ? target.manifest.backend_service_id === env.BACKEND_SERVICE_ID &&
        target.manifest.frontend_service_id === env.FRONTEND_SERVICE_ID
      : null;
    fs.appendFileSync(
      summaryFile,
      `### Staging preflight ${evidence.final_outcome}\n- Selected CD tag: \`${evidence.target_tag || 'not validated'}\`\n- Source SHA: \`${evidence.target_sha ? evidence.target_sha.slice(0, 7) : 'not validated'}\`\n- Tag/manifest validation: \`${targetValidated}\`\n- Service ID validation: \`${servicesValidated === null ? 'not evaluated' : servicesValidated ? 'passed' : 'failed'}\`\n- Overall preflight: \`${evidence.final_outcome === 'success' ? 'passed' : 'failed'}\`\n`,
    );
  } else {
    const shortDigest = (value) => {
      const match = /@sha256:([0-9a-f]{64})$/.exec(value || '');
      return match ? `sha256:${match[1].slice(0, 12)}` : 'not validated';
    };
    const deploymentLine = (service) => {
      const targetDigest = evidence[`target_${service}_image`];
      const status = evidence[`${service}_status`];
      const mismatchFailure =
        evidence.failure_reason?.startsWith(
          `${service} live deploy image does not match`,
        ) && status?.toLowerCase() === 'live';
      const verifiedPhase =
        evidence.deployment_result === 'success' ||
        (service === 'backend' &&
          [
            'backend_health',
            'backend_health_failed',
            'frontend_request',
            'frontend_request_failed',
            'complete',
          ].includes(evidence.phase)) ||
        (service === 'frontend' && evidence.phase === 'complete');
      const digestMatch = mismatchFailure
        ? 'no'
        : verifiedPhase && targetDigest
          ? 'yes'
          : 'not verified';
      return `- ${service}: target ${shortDigest(targetDigest)}; deploy ${evidence[`${service}_deploy_id`] || 'not started'} (${evidence[`${service}_status`] || 'unknown'}); digest match ${digestMatch}`;
    };
    const checkByName = new Map(
      evidence.smoke_checks.map((check) => [check.name, check.status]),
    );
    const smokeLines = REQUIRED_SMOKE_CHECKS.map(
      (name) => `- Smoke ${name}: \`${checkByName.get(name) || 'not run'}\``,
    ).join('\n');
    const health = evidence.backend_health
      ? `${evidence.backend_health.http_status ?? 'unknown'} ${evidence.backend_health.status || ''}`.trim()
      : 'not evaluated';
    fs.appendFileSync(
      summaryFile,
      `### Staging rollback ${evidence.final_outcome}\n- Selected CD tag: \`${evidence.target_tag || 'not validated'}\` (source SHA \`${evidence.target_sha ? evidence.target_sha.slice(0, 7) : 'not validated'}\`)\n${deploymentLine('backend')}\n${deploymentLine('frontend')}\n- Backend health: \`${health}\`\n${smokeLines}\n- Overall rollback: \`${evidence.final_outcome === 'success' ? 'passed' : 'failed'}\`\n${evidence.failure_reason ? `- Failure: ${evidence.failure_reason}\n` : ''}`,
    );
  }
  return evidence;
}

async function main() {
  const mode = process.argv[2];
  try {
    if (mode === 'preflight') await preflight();
    else if (mode === 'mutation-check') mutationCheck();
    else if (mode === 'deploy') await deploy();
    else if (mode === 'verify') verifySuccess();
    else if (mode === 'evidence') writeEvidence();
    else throw new Error('Unknown staging rollback command.');
  } catch (error) {
    const message = safeReason(error.message).slice(0, 320);
    const label = mode === 'preflight' ? 'Preflight failed' : 'Rollback failed';
    if (mode !== 'preflight')
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY || '/dev/null',
        `${label}: ${message}\n`,
      );
    console.error(`::error::${message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = {
  deploy,
  mutationCheck,
  preflight,
  readTarget,
  runGit,
  verifySuccess,
  safeReason,
  validateDispatch,
  writeEvidence,
};
