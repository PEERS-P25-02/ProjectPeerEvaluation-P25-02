const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('./ciGate.cjs');
function fixture(mode = 'selected', broaden = 'false') {
  const needs = Object.fromEntries(
    [
      'select-tests',
      'frontend-build',
      'code-quality',
      'dependency-vulnerability-scan',
      'secret-scan',
      'unit-tests',
      'integration-tests',
      'e2e-tests',
      'patch-coverage',
      'final-coverage',
      'broaden-regression',
    ].map((key) => [key, { result: 'success' }]),
  );
  needs['select-tests'].outputs = {
    mode,
    integration: mode === 'none' ? 'false' : 'true',
    e2e: mode === 'none' ? 'false' : 'true',
  };
  needs['patch-coverage'].outputs = { broaden };
  if (broaden !== 'true') needs['broaden-regression'].result = 'skipped';
  if (mode === 'none')
    for (const key of [
      'unit-tests',
      'integration-tests',
      'e2e-tests',
      'patch-coverage',
      'final-coverage',
    ])
      needs[key].result = 'skipped';
  return needs;
}
test('valid selected, broadened and docs-only graphs pass', () => {
  for (const needs of [fixture(), fixture('selected', 'true'), fixture('none')])
    assert.deepEqual(evaluate(needs), []);
});
test('all required failures, cancellations, missing and skipped jobs block', () => {
  for (const key of Object.keys(fixture()).filter(
    (key) => key !== 'broaden-regression',
  ))
    for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
      const needs = fixture();
      needs[key].result = result;
      assert.ok(evaluate(needs).length, `${key}: ${result}`);
    }
});
test('selector failure or missing selection cannot authorize skipped tests', () => {
  const needs = fixture('none');
  delete needs['select-tests'].outputs;
  assert.ok(evaluate(needs).length);
});

test('full discovery and docs-only decisions reject inconsistent selections', () => {
  assert.deepEqual(evaluate(fixture('full')), []);
  const full = fixture('full');
  full['select-tests'].outputs.e2e = 'false';
  full['e2e-tests'].result = 'skipped';
  assert.ok(evaluate(full).length);
  assert.ok(evaluate(fixture('full', 'true')).length);
  assert.ok(evaluate(fixture('none', 'true')).length);
});
const { validateCapture } = require('./runCiCoverage.cjs');
test('runtime coverage requires complete captures and immutable run provenance', () => {
  const provenance = { sha: 'a'.repeat(40), runId: '123', runAttempt: '1' };
  const capture = {
    ...provenance,
    suite: 'e2e',
    complete: true,
    backend: true,
    frontend: true,
    errors: [],
  };
  assert.doesNotThrow(() => validateCapture(capture, 'e2e', provenance));
  for (const change of [
    { complete: false },
    { backend: false },
    { frontend: false },
    { errors: ['capture failed'] },
    { suite: 'integration' },
    { sha: 'b'.repeat(40) },
    { runId: '122' },
    { runAttempt: '2' },
  ])
    assert.throws(() =>
      validateCapture({ ...capture, ...change }, 'e2e', provenance),
    );
});
