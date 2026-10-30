const test = require('node:test');
const assert = require('node:assert/strict');
const { toContainerPaths } = require('./integrationTestPaths');

test('converts one repository-relative integration path', () => {
  assert.deepEqual(
    toContainerPaths([
      'src/backend/tests/integration/authentication.test.js',
    ]),
    ['tests/integration/authentication.test.js'],
  );
});

test('converts multiple repository-relative integration paths', () => {
  assert.deepEqual(
    toContainerPaths([
      'src/backend/tests/integration/authentication.test.js',
      'src/backend/tests/integration/courses.test.js',
    ]),
    [
      'tests/integration/authentication.test.js',
      'tests/integration/courses.test.js',
    ],
  );
});

test('preserves container-relative paths and no-argument full discovery', () => {
  assert.deepEqual(
    toContainerPaths(['tests/integration/authentication.test.js']),
    ['tests/integration/authentication.test.js'],
  );
  assert.deepEqual(toContainerPaths([]), []);
});

test('rejects unexpected integration paths with a clear message', () => {
  for (const input of [
    'src/frontend/tests/integration/authentication.test.js',
    '../tests/integration/authentication.test.js',
    'tests/integration/nested/authentication.test.js',
    'tests/integration/authentication.spec.js',
    '/app/tests/integration/authentication.test.js',
  ])
    assert.throws(() => toContainerPaths([input]), {
      message: `Unexpected integration test path: ${input}`,
    });
});
