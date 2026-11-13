const assert = require('node:assert/strict');
const {
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
console.log('Safe failure evidence redaction checks passed.');
