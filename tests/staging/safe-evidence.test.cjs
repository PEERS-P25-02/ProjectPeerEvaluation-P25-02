const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  REQUIRED_SMOKE_CHECKS,
  makeSafeCheckRecord,
  sanitizeFailureDiagnostic,
} = require('./safe-evidence.cjs');

const token = 'synthetic_token_123456';
const encodedToken = encodeURIComponent(token);
const failedCheck = makeSafeCheckRecord(
  { title: 'pre-seeded synthetic evaluation loads without submitting' },
  {
    status: 'failed',
    duration: 125,
    error: {
      message: `Expected 200; got 401 at https://projectpeerevaluation-p25-02-frontend.onrender.com/#/evaluate/${token}; request /api/evaluate/${encodedToken}`,
    },
  },
  token,
);

assert.equal(failedCheck.status, 'failed');
assert.equal(failedCheck.failure_category, 'assertion-or-request-failure');
assert.match(failedCheck.diagnostic, /Expected 200; got 401/);
assert.doesNotMatch(failedCheck.diagnostic, new RegExp(token));
assert.doesNotMatch(failedCheck.diagnostic, /https?:\/\//);
assert.doesNotMatch(
  failedCheck.diagnostic,
  new RegExp(`/api/evaluate/${token}`),
);
assert.ok(failedCheck.diagnostic.length <= 320);

const timeoutCheck = makeSafeCheckRecord(
  { title: 'backend health confirms MongoDB connectivity' },
  { status: 'timedOut', duration: 45000, errors: [] },
  token,
);
assert.equal(timeoutCheck.failure_category, 'timeout');
assert.equal(timeoutCheck.diagnostic, 'Check timed out.');
assert.equal(
  sanitizeFailureDiagnostic(`Request contained ${encodedToken}`, token),
  'Request contained [TOKEN REDACTED]',
);

const passedChecks = REQUIRED_SMOKE_CHECKS.map((name) => ({
  name,
  status: 'passed',
  duration_ms: 1,
}));

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'peers-smoke-evidence-'));
const reportDir = path.join(workDir, 'test-results/staging');
const writer = path.resolve(
  __dirname,
  '../../scripts/writeStagingSmokeEvidence.cjs',
);
const imageDigest = 'a'.repeat(64);
const writerEnv = {
  ...process.env,
  SOURCE_SHA: 'b'.repeat(40),
  FRONTEND_IMAGE: `ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-frontend@sha256:${imageDigest}`,
  BACKEND_IMAGE: `ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-backend@sha256:${imageDigest}`,
  STAGING_EVALUATION_TOKEN: token,
  GITHUB_STEP_SUMMARY: path.join(workDir, 'summary.md'),
};

function runWriter(checks, outcome = 'success') {
  fs.writeFileSync(
    path.join(reportDir, 'smoke-checks.json'),
    JSON.stringify({ checks }),
  );
  const command = spawnSync(process.execPath, [writer], {
    cwd: workDir,
    env: { ...writerEnv, SMOKE_OUTCOME: outcome },
    encoding: 'utf8',
  });
  return {
    exitCode: command.status,
    evidence: JSON.parse(
      fs.readFileSync(path.join(workDir, 'staging-smoke-result.json'), 'utf8'),
    ),
  };
}

try {
  fs.mkdirSync(reportDir, { recursive: true });
  const success = runWriter(passedChecks);
  assert.equal(success.exitCode, 0);
  assert.equal(success.evidence.validation_result, 'success');

  const incompleteChecks = [
    passedChecks.slice(0, 2),
    [passedChecks[0], passedChecks[1], passedChecks[1]],
    ...['skipped', 'interrupted', 'timedOut', 'failed'].map((status) => [
      passedChecks[0],
      passedChecks[1],
      { ...passedChecks[2], status },
    ]),
  ];
  for (const checks of incompleteChecks) {
    const failure = runWriter(checks);
    assert.notEqual(failure.exitCode, 0);
    assert.equal(failure.evidence.validation_result, 'failure');
  }
  assert.notEqual(runWriter(passedChecks, 'skipped').exitCode, 0);

  const redacted = runWriter([
    passedChecks[0],
    passedChecks[1],
    {
      ...passedChecks[2],
      status: 'failed',
      diagnostic: `Request failed at https://example.invalid/api/evaluate/${token}`,
    },
  ]);
  assert.doesNotMatch(JSON.stringify(redacted.evidence), new RegExp(token));
  assert.doesNotMatch(JSON.stringify(redacted.evidence), /example\.invalid/);
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}
console.log('Staging evidence redaction and required-check gate passed.');
