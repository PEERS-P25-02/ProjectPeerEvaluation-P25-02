const fs = require('node:fs');
const { makeSafeCheckRecord } = require('../tests/staging/safe-evidence.cjs');

let checks = [];
try {
  const recorded = JSON.parse(
    fs.readFileSync('test-results/staging/smoke-checks.json', 'utf8'),
  );
  checks = Array.isArray(recorded.checks)
    ? recorded.checks.map((check) => ({
        ...makeSafeCheckRecord(
          { title: check.name },
          {
            status: check.status,
            duration: check.duration_ms,
            error: { message: check.diagnostic },
          },
          process.env.STAGING_EVALUATION_TOKEN,
        ),
      }))
    : [];
} catch {
  // Keep a bounded empty list when setup fails before Playwright starts.
}

const validSha = /^[0-9a-f]{40}$/.test(process.env.SOURCE_SHA || '');
const validImage = (value) =>
  /^ghcr\.io\/peers-p25-02\/projectpeerevaluation-p25-02-(frontend|backend)@sha256:[0-9a-f]{64}$/.test(
    value || '',
  );
const outcome = ['success', 'failure', 'cancelled', 'skipped'].includes(
  process.env.SMOKE_OUTCOME,
)
  ? process.env.SMOKE_OUTCOME
  : 'failure';
const result = {
  source_sha: validSha ? process.env.SOURCE_SHA : 'invalid',
  frontend_image: validImage(process.env.FRONTEND_IMAGE)
    ? process.env.FRONTEND_IMAGE
    : 'invalid',
  backend_image: validImage(process.env.BACKEND_IMAGE)
    ? process.env.BACKEND_IMAGE
    : 'invalid',
  smoke_outcome: outcome,
  checks,
};
fs.writeFileSync(
  'staging-smoke-result.json',
  `${JSON.stringify(result, null, 2)}\n`,
);
const summary = `### Staging smoke validation ${outcome}\n- Source SHA: \`${result.source_sha}\`\n- Frontend image: \`${result.frontend_image}\`\n- Backend image: \`${result.backend_image}\`\n- Smoke outcome: \`${outcome}\`\n`;
fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY || '/dev/null', summary);
if (
  !validSha ||
  !validImage(process.env.FRONTEND_IMAGE) ||
  !validImage(process.env.BACKEND_IMAGE)
) {
  console.error('::error::Staging smoke evidence inputs were invalid.');
  process.exitCode = 1;
}
