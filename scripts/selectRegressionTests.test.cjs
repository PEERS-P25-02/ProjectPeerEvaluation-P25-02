const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  select,
  discoverTests,
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
test('a deleted historical test uses only the current discovered inventory', () => {
  const result = choose([
    { path: 'src/frontend/tests/Removed.test.jsx', status: 'D' },
  ]);
  assert.equal(result.mode, 'full');
  assert.ok(
    !result.frontendUnit.includes('src/frontend/tests/Removed.test.jsx'),
  );
});
test('a renamed historical test uses the current destination inventory', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'regression-rename-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const oldTest = path.join(root, 'Old.test.jsx');
  const newTest = path.join(root, 'New.test.jsx');
  fs.writeFileSync(oldTest, '');
  fs.renameSync(oldTest, newTest);
  assert.deepEqual(discoverTests(root, /\.test\.jsx$/), ['New.test.jsx']);

  const oldRepoTest = path.join(
    __dirname,
    '..',
    'src/frontend/tests/SelectorOld.test.jsx',
  );
  const newRepoTest = path.join(
    __dirname,
    '..',
    'src/frontend/tests/SelectorNew.test.jsx',
  );
  fs.writeFileSync(oldRepoTest, '');
  fs.renameSync(oldRepoTest, newRepoTest);
  t.after(() => fs.rmSync(newRepoTest, { force: true }));

  const result = choose([
    {
      path: 'src/frontend/tests/SelectorNew.test.jsx',
      previousPath: 'src/frontend/tests/SelectorOld.test.jsx',
      status: 'R100',
    },
  ]);
  assert.equal(result.mode, 'full');
  assert.ok(
    result.frontendUnit.includes('src/frontend/tests/SelectorNew.test.jsx'),
  );
  assert.ok(
    !result.frontendUnit.includes('src/frontend/tests/SelectorOld.test.jsx'),
  );
});
test('newly added tests are discovered for the full fallback inventory', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'regression-tests-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(root, 'nested', 'New.test.jsx'), '');
  const inventory = discoverTests(root, /\.test\.jsx$/);
  assert.deepEqual(inventory, [path.join('nested', 'New.test.jsx')]);
});
test('added application tests use full discovery while added docs do not', (t) => {
  const addedTest = path.join(
    __dirname,
    '..',
    'src/frontend/tests/SelectorAdded.test.jsx',
  );
  fs.writeFileSync(addedTest, '');
  t.after(() => fs.rmSync(addedTest, { force: true }));
  const addedDoc = path.join(__dirname, '..', 'docs/SelectorAdded.md');
  fs.writeFileSync(addedDoc, '');
  t.after(() => fs.rmSync(addedDoc, { force: true }));

  const result = choose([
    { path: 'src/frontend/tests/SelectorAdded.test.jsx', status: 'A' },
  ]);
  assert.equal(result.mode, 'full');
  assert.ok(
    result.frontendUnit.includes('src/frontend/tests/SelectorAdded.test.jsx'),
  );
  assert.equal(
    choose([{ path: 'docs/SelectorAdded.md', status: 'A' }]).mode,
    'none',
  );
});
test('course and student evaluation changes include their related browser journeys', () => {
  const course = choose(['src/frontend/pages/CourseManagement.jsx']);
  const student = choose(['src/frontend/pages/StudentEvaluation.jsx']);
  assert.ok(FRONTEND_TESTS.includes('src/frontend/test/setup.test.js'));
  assert.ok(course.e2e.includes('tests/e2e/results-export.spec.cjs'));
  assert.ok(
    student.e2e.includes('tests/e2e/student-invitation-submission.spec.cjs'),
  );
  assert.ok(student.e2e.includes('tests/e2e/reset-relaunch.spec.cjs'));
});
test('invalid input blocks selection rather than silently selecting', () => {
  for (const raw of ['[]', '{bad', '["../README.md"]', '[""]'])
    assert.throws(() => select(raw));
});
