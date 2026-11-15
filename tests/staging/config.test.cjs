const fs = require('node:fs');
const assert = require('node:assert/strict');
const {
  readStagingServiceConfig,
  readStagingSmokeConfig,
} = require('./config.cjs');
const { isEvaluationGetForToken } = require('./request-matchers.cjs');

const validEnv = {
  STAGING_EVALUATION_TOKEN: 'synthetic_token_123456',
};
const serviceDefaults = readStagingServiceConfig({});
assert.deepEqual(serviceDefaults, {
  backendName: 'peers-staging-backend',
  frontendName: 'PEERS Staging Frontend',
  backendUrl: 'https://peers-staging-backend.onrender.com',
  frontendUrl: 'https://projectpeerevaluation-p25-02-frontend.onrender.com',
});
Object.assign(validEnv, {
  STAGING_FRONTEND_URL: serviceDefaults.frontendUrl,
  STAGING_BACKEND_URL: serviceDefaults.backendUrl,
});

assert.deepEqual(readStagingSmokeConfig(validEnv), {
  frontendUrl: validEnv.STAGING_FRONTEND_URL,
  backendUrl: validEnv.STAGING_BACKEND_URL,
  evaluationToken: validEnv.STAGING_EVALUATION_TOKEN,
});

for (const invalid of [
  'http://localhost:3000',
  'https://projectpeerevaluation-p25-02-frontend.onrender.com.evil.example',
  'https://projectpeerevaluation-p25-02-frontend.onrender.com/other',
  'https://user:pass@projectpeerevaluation-p25-02-frontend.onrender.com',
  'https://projectpeerevaluation-p25-02-frontend.onrender.com:8443',
  'https://projectpeerevaluation-p25-02-frontend.onrender.com?x=1',
  'https://projectpeerevaluation-p25-02-frontend.onrender.com#frag',
]) {
  assert.throws(() =>
    readStagingSmokeConfig({ ...validEnv, STAGING_FRONTEND_URL: invalid }),
  );
}
assert.deepEqual(
  readStagingServiceConfig({
    STAGING_BACKEND_NAME: 'Replacement API',
    STAGING_FRONTEND_NAME: 'Replacement Web',
    STAGING_BACKEND_URL: 'https://api-replacement.onrender.com',
    STAGING_FRONTEND_URL: 'https://web-replacement.onrender.com',
  }),
  {
    backendName: 'Replacement API',
    frontendName: 'Replacement Web',
    backendUrl: 'https://api-replacement.onrender.com',
    frontendUrl: 'https://web-replacement.onrender.com',
  },
);

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
assert.ok(
  workflow.indexOf('Validate configured staging origins before image builds') <
    workflow.indexOf('Build and publish frontend'),
);
assert.match(workflow, /VITE_API_BASE_URL=\$\{\{ vars\.STAGING_BACKEND_URL/);
assert.match(
  workflow,
  /validate-staging-smoke:\n[\s\S]*?needs: \[publish-staging-images, deploy-staging\]/,
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
