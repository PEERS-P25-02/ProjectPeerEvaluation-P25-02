const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate: evaluateEvent } = require('./ciGate.cjs');
const evaluate = (needs, event = 'pull_request') => evaluateEvent(needs, event);
function fixture(mode = 'selected') {
  const needs = Object.fromEntries(
    [
      'select-tests',
      'frontend-build',
      'code-quality',
      'dependency-vulnerability-scan',
      'secret-scan',
      'policy-tests',
      'unit-tests',
      'integration-tests',
      'e2e-tests',
      'patch-coverage',
      'overall-coverage',
    ].map((key) => [key, { result: 'success' }]),
  );
  needs['overall-coverage'].result = 'skipped';
  needs['select-tests'].outputs = {
    mode,
    integration: mode === 'none' ? 'false' : 'true',
    e2e: mode === 'none' ? 'false' : 'true',
  };
  if (mode === 'none')
    for (const key of [
      'policy-tests',
      'unit-tests',
      'integration-tests',
      'e2e-tests',
      'patch-coverage',
    ])
      needs[key].result = 'skipped';
  return needs;
}
test('valid selected and docs-only graphs pass', () => {
  for (const needs of [fixture(), fixture('none')])
    assert.deepEqual(evaluate(needs), []);
});
test('all required failures, cancellations, missing and skipped jobs block', () => {
  for (const key of Object.keys(fixture()).filter(
    (key) => key !== 'overall-coverage',
  ))
    for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
      const needs = fixture();
      needs[key].result = result;
      assert.ok(evaluate(needs).length, `${key}: ${result}`);
    }
});
test('PR runs require the queue coverage job to be skipped', () => {
  for (const result of ['success', 'failure', 'cancelled', undefined]) {
    const needs = fixture();
    needs['overall-coverage'].result = result;
    assert.match(evaluate(needs).join('\n'), /overall-coverage/);
  }
});
test('selector failure or missing selection cannot authorize skipped tests', () => {
  const needs = fixture('none');
  delete needs['select-tests'].outputs;
  assert.ok(evaluate(needs).length);
});

test('full discovery rejects inconsistent selections', () => {
  assert.deepEqual(evaluate(fixture('full')), []);
  const full = fixture('full');
  full['select-tests'].outputs.e2e = 'false';
  full['e2e-tests'].result = 'skipped';
  assert.ok(evaluate(full).length);
});
test('a selected browser failure blocks even when coverage passes', () => {
  const needs = fixture();
  needs['e2e-tests'].result = 'failure';
  assert.match(evaluate(needs).join('\n'), /e2e-tests/);
});
test('single changed-line coverage job failure blocks the workflow', () => {
  const needs = fixture();
  needs['patch-coverage'].result = 'failure';
  assert.match(evaluate(needs).join('\n'), /patch-coverage/);
});
test('missing or cancelled changed-line coverage job blocks the workflow', () => {
  for (const result of [undefined, 'cancelled']) {
    const needs = fixture();
    needs['patch-coverage'].result = result;
    assert.match(evaluate(needs).join('\n'), /patch-coverage/);
  }
});
test('an unselected integration or browser job may be skipped', () => {
  const needs = fixture();
  needs['select-tests'].outputs.integration = 'false';
  needs['integration-tests'].result = 'skipped';
  needs['select-tests'].outputs.e2e = 'false';
  needs['e2e-tests'].result = 'skipped';
  assert.deepEqual(evaluate(needs), []);
});
test('merge-group code requires complete suites and overall coverage', () => {
  const needs = fixture('full');
  needs['patch-coverage'].result = 'skipped';
  needs['overall-coverage'] = { result: 'success' };
  assert.deepEqual(evaluate(needs, 'merge_group'), []);
  for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
    needs['overall-coverage'].result = result;
    assert.match(evaluate(needs, 'merge_group').join('\n'), /overall-coverage/);
  }
  needs['overall-coverage'].result = 'success';
  needs['select-tests'].outputs.mode = 'selected';
  assert.match(evaluate(needs, 'merge_group').join('\n'), /full selection/);
});
test('merge-group docs-only permits only authorized suite skips', () => {
  const needs = fixture('none');
  needs['overall-coverage'] = { result: 'skipped' };
  assert.deepEqual(evaluate(needs, 'merge_group'), []);
  needs['unit-tests'].result = 'success';
  assert.match(evaluate(needs, 'merge_group').join('\n'), /unit-tests/);
});
test('unsupported or missing event cannot pass', () => {
  for (const event of [undefined, 'push'])
    assert.match(evaluateEvent(fixture(), event).join('\n'), /Unsupported/);
});
const { addRuntime, validateCapture } = require('./runCiCoverage.cjs');
test('selected API coverage requires its expected artifact', () => {
  assert.throws(
    () =>
      addRuntime(
        () => {},
        '/missing-coverage-artifacts',
        'integration',
        { sha: 'a'.repeat(40), runId: '123', runAttempt: '1' },
        'integration-selected',
      ),
    /Expected one integration coverage capture/,
  );
});
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
