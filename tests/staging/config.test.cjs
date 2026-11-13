const fs = require('node:fs');
const assert = require('node:assert/strict');
const { readStagingSmokeConfig } = require('./config.cjs');
const { isEvaluationGetForToken } = require('./request-matchers.cjs');

const validEnv = {
  STAGING_FRONTEND_URL:
    'https://projectpeerevaluation-p25-02-frontend.onrender.com',
  STAGING_BACKEND_URL: 'https://peers-staging-backend.onrender.com',
  STAGING_EVALUATION_TOKEN: 'synthetic_token_123456',
};

assert.deepEqual(readStagingSmokeConfig(validEnv), {
  frontendUrl: validEnv.STAGING_FRONTEND_URL,
  backendUrl: validEnv.STAGING_BACKEND_URL,
  evaluationToken: validEnv.STAGING_EVALUATION_TOKEN,
});

for (const invalid of [
  'http://localhost:3000',
  'https://projectpeerevaluation-p25-02-frontend.onrender.com.evil.example',
  'https://projectpeerevaluation-p25-02-frontend.onrender.com/other',
]) {
  assert.throws(() =>
    readStagingSmokeConfig({ ...validEnv, STAGING_FRONTEND_URL: invalid }),
  );
}

assert.throws(() =>
  readStagingSmokeConfig({ ...validEnv, STAGING_EVALUATION_TOKEN: '' }),
);

const makeResponse = (
  pathToken,
  origin = validEnv.STAGING_BACKEND_URL,
  method = 'GET',
) => ({
  url: () => `${origin}/api/evaluate/${pathToken}`,
  request: () => ({ method: () => method }),
});
assert.equal(
  isEvaluationGetForToken(
    makeResponse(validEnv.STAGING_EVALUATION_TOKEN),
    validEnv.STAGING_BACKEND_URL,
    validEnv.STAGING_EVALUATION_TOKEN,
  ),
  true,
);
assert.equal(
  isEvaluationGetForToken(
    makeResponse('another_synthetic_token'),
    validEnv.STAGING_BACKEND_URL,
    validEnv.STAGING_EVALUATION_TOKEN,
  ),
  false,
);

const workflow = fs.readFileSync('.github/workflows/cd.yml', 'utf8');
assert.match(
  workflow,
  /validate-staging-smoke:\n[\s\S]*?needs: \[decide-staging, publish-staging-images, deploy-staging\]/,
);
assert.match(workflow, /validate-staging-smoke\.result == 'success'/);
assert.match(
  workflow,
  /Upload staging smoke evidence[\s\S]*?if: \$\{\{ always\(\) \}\}[\s\S]*?if-no-files-found: error/,
);
assert.match(
  workflow,
  /STAGING_EVALUATION_TOKEN: \$\{\{ secrets\.STAGING_EVALUATION_TOKEN \}\}/,
);
assert.match(
  fs.readFileSync('playwright.staging.config.cjs', 'utf8'),
  /testMatch: '\*\*\/smoke\.spec\.cjs'/,
);
console.log('Staging origin, token, and CD gate checks passed.');
