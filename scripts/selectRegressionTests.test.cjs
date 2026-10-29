const test = require('node:test');
const assert = require('node:assert/strict');
const {
  select,
  FRONTEND_TESTS,
  BACKEND_TESTS,
  INTEGRATION_TESTS,
  E2E_TESTS,
} = require('./selectRegressionTests.cjs');

const allPaths = {
  frontendUnit: FRONTEND_TESTS,
  backendUnit: BACKEND_TESTS,
  integration: INTEGRATION_TESTS,
  e2e: E2E_TESTS,
};

function assertFull(decision) {
  assert.equal(decision.mode, 'full');
  for (const [suite, paths] of Object.entries(allPaths))
    assert.deepEqual(decision[suite], paths);
}

test('documentation-only changes select no test files', () => {
  const result = select(
    JSON.stringify([
      'docs/Team-P25-02/requirements/regression-test-matrix.md',
      'README-historical.md',
    ]),
    {},
  );
  assert.equal(result.mode, 'none');
  assert.deepEqual(result.frontendUnit, []);
  assert.deepEqual(result.backendUnit, []);
  assert.deepEqual(result.integration, []);
  assert.deepEqual(result.e2e, []);
});

test('a mapped frontend page selects its unit test and related browser journey', () => {
  const result = select(
    JSON.stringify(['src/frontend/pages/StudentEvaluation.jsx']),
    {},
  );
  assert.equal(result.mode, 'selected');
  assert.deepEqual(result.frontendUnit, [
    'src/frontend/tests/StudentEvaluation.test.jsx',
  ]);
  assert.deepEqual(result.e2e, [
    'tests/e2e/student-invitation-submission.spec.cjs',
  ]);
  assert.deepEqual(result.backendUnit, []);
  assert.deepEqual(result.integration, []);
});

test('shared frontend API transport selects all frontend unit and browser tests', () => {
  const result = select(JSON.stringify(['src/frontend/services/api.js']), {});
  assert.equal(result.mode, 'selected');
  assert.deepEqual(result.frontendUnit, FRONTEND_TESTS);
  assert.deepEqual(result.e2e, E2E_TESTS);
  assert.deepEqual(result.backendUnit, []);
  assert.deepEqual(result.integration, []);
});

test('authentication context changes select every browser journey', () => {
  const result = select(
    JSON.stringify(['src/frontend/contexts/AuthContext.jsx']),
    {},
  );
  assert.equal(result.mode, 'selected');
  assert.deepEqual(result.frontendUnit, [
    'src/frontend/tests/AuthContext.test.jsx',
  ]);
  assert.deepEqual(result.e2e, E2E_TESTS);
});

test('a changed backend test file selects only its matching unit file', () => {
  const result = select(
    JSON.stringify(['src/backend/tests/csvParsing.test.js']),
    {},
  );
  assert.equal(result.mode, 'selected');
  assert.deepEqual(result.backendUnit, [
    'src/backend/tests/csvParsing.test.js',
  ]);
  assert.deepEqual(result.frontendUnit, []);
  assert.deepEqual(result.integration, []);
  assert.deepEqual(result.e2e, []);
});

test('shared backend models select every suite', () => {
  assertFull(select(JSON.stringify(['src/backend/models/Course.js']), {}));
});

test('report controller selects report, access, and browser export checks', () => {
  const result = select(
    JSON.stringify(['src/backend/controllers/reportController.js']),
    {},
  );
  assert.equal(result.mode, 'selected');
  assert.ok(
    result.integration.includes(
      'src/backend/tests/integration/reports.test.js',
    ),
  );
  assert.ok(
    result.integration.includes(
      'src/backend/tests/integration/authorization.test.js',
    ),
  );
  assert.ok(result.backendUnit.includes('src/backend/tests/reporting.test.js'));
  assert.deepEqual(result.e2e, ['tests/e2e/results-export.spec.cjs']);
});

test('a changed test file selects that exact test file, including E2E tests', () => {
  const result = select(JSON.stringify(['tests/e2e/smoke.spec.cjs']), {});
  assert.equal(result.mode, 'selected');
  assert.deepEqual(result.e2e, ['tests/e2e/smoke.spec.cjs']);
  assert.deepEqual(result.backendUnit, []);
});

test('unknown application paths fail closed to every suite', () => {
  assertFull(
    select(JSON.stringify(['src/backend/migrations/migrateCourses.js']), {}),
  );
  assertFull(select(JSON.stringify(['src/frontend/new/UnmappedPage.jsx']), {}));
});

test('pushes to main select every suite using CI environment names', () => {
  assertFull(select('[]', { CI_EVENT_NAME: 'push', CI_BRANCH: 'main' }));
});

test('malformed and empty non-main inputs fail closed', () => {
  assertFull(select('{bad json', {}));
  assertFull(select('[]', {}));
  assertFull(select(JSON.stringify(['']), {}));
});

test('deleted paths fail closed rather than selecting a removed test', () => {
  assertFull(
    select(
      JSON.stringify([{ path: 'src/backend/tests/auth.test.js', status: 'D' }]),
      {},
    ),
  );
  assertFull(select(JSON.stringify(['src/backend/tests/removed.test.js']), {}));
});

test('unknown test paths and arbitrary text configuration are not treated as docs-only', () => {
  assertFull(select(JSON.stringify(['src/backend/tests/future.test.js']), {}));
  assertFull(select(JSON.stringify(['src/backend/settings.txt']), {}));
});

test('only recognized documentation filenames are docs-only', () => {
  assertFull(select(JSON.stringify(['README.js']), {}));
  assertFull(select(JSON.stringify(['CHANGELOG.json']), {}));
});
