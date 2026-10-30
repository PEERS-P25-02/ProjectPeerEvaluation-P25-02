const test = require('node:test');
const assert = require('node:assert/strict');
const {
  select,
  FRONTEND_TESTS,
  BACKEND_TESTS,
} = require('./selectRegressionTests.cjs');
const choose = (paths) => select(JSON.stringify(paths));
test('docs-only omits application tests', () => {
  const result = choose(['README.md']);
  assert.equal(result.mode, 'none');
  assert.deepEqual(result.integration, []);
});
test('code changes always run both full unit suites', () => {
  const result = choose(['src/frontend/pages/StudentEvaluation.jsx']);
  assert.equal(result.mode, 'selected');
  assert.deepEqual(result.frontendUnit, FRONTEND_TESTS);
  assert.deepEqual(result.backendUnit, BACKEND_TESTS);
  assert.ok(
    result.integration.includes(
      'src/backend/tests/integration/submissionIntegrity.test.js',
    ),
  );
  assert.ok(
    result.integration.every((file) =>
      /^src\/backend\/tests\/integration\/[A-Za-z0-9_.-]+\.test\.js$/.test(
        file,
      ),
    ),
  );
  assert.ok(result.regressionIds.includes('REG-CW08-04'));
  assert.ok(result.workflowIds.includes('CW-08'));
  assert.match(result.reasons[0], /exact feature mapping/);
});
test('backend authentication and roster changes retain full dependency discovery', () => {
  for (const file of [
    'src/backend/controllers/authController.js',
    'src/backend/controllers/studentController.js',
  ])
    assert.equal(choose([file]).mode, 'full');
});
test('shared and unknown paths use full discovery', () => {
  for (const file of [
    'src/backend/models/Course.js',
    'src/frontend/services/api.js',
    'src/frontend/pages/LoginPageClone.jsx',
  ])
    assert.equal(choose([file]).mode, 'full');
});
test('deleted and renamed paths cannot narrow selection', () => {
  for (const status of ['D', 'R100', 'renamed'])
    assert.equal(choose([{ path: 'README.md', status }]).mode, 'full');
});
test('invalid input blocks selection rather than silently selecting', () => {
  for (const raw of ['[]', '{bad', '["../README.md"]', '[""]'])
    assert.throws(() => select(raw));
});
