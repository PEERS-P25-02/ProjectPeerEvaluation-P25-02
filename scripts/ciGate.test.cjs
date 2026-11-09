const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('./ciGate.cjs');

function fixture(event = 'pull_request') {
  return Object.fromEntries(
    [
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
    ].map((name) => [
      name,
      {
        result:
          (name === 'e2e-tests' || name === 'overall-coverage') &&
          event === 'pull_request'
            ? 'skipped'
            : name === 'patch-coverage' && event !== 'pull_request'
              ? 'skipped'
              : 'success',
      },
    ]),
  );
}

test('PR candidates require full unit and API suites plus changed-line coverage', () => {
  const needs = fixture('pull_request');
  assert.deepEqual(evaluate(needs, 'pull_request'), []);
  for (const name of ['unit-tests', 'integration-tests', 'patch-coverage']) {
    for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
      needs[name].result = result;
      assert.ok(evaluate(needs, 'pull_request').length, `${name}: ${result}`);
    }
    needs[name].result = 'success';
  }
});

test('PR candidates skip E2E and overall coverage as event-inapplicable', () => {
  const needs = fixture('pull_request');
  assert.deepEqual(evaluate(needs, 'pull_request'), []);
  for (const name of ['e2e-tests', 'overall-coverage']) {
    for (const result of ['success', 'failure', 'cancelled', undefined]) {
      needs[name].result = result;
      assert.match(
        evaluate(needs, 'pull_request').join('\n'),
        new RegExp(name),
      );
    }
    needs[name].result = 'skipped';
  }
});

test('merge groups require full unit, API and E2E suites plus overall coverage', () => {
  const needs = fixture('merge_group');
  assert.deepEqual(evaluate(needs, 'merge_group'), []);
  for (const name of [
    'unit-tests',
    'integration-tests',
    'e2e-tests',
    'overall-coverage',
  ]) {
    for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
      needs[name].result = result;
      assert.ok(evaluate(needs, 'merge_group').length, `${name}: ${result}`);
    }
    needs[name].result = 'success';
  }
});

test('merge groups skip changed-line coverage as event-inapplicable', () => {
  const needs = fixture('merge_group');
  assert.deepEqual(evaluate(needs, 'merge_group'), []);
  for (const result of ['success', 'failure', 'cancelled', undefined]) {
    needs['patch-coverage'].result = result;
    assert.match(evaluate(needs, 'merge_group').join('\n'), /patch-coverage/);
  }
});

test('main pushes require merge-group checks and skip changed-line coverage', () => {
  const needs = fixture('push');
  assert.deepEqual(evaluate(needs, 'push'), []);
  for (const name of [
    'frontend-build',
    'code-quality',
    'dependency-vulnerability-scan',
    'secret-scan',
    'policy-tests',
    'unit-tests',
    'integration-tests',
    'e2e-tests',
    'overall-coverage',
  ]) {
    for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
      needs[name].result = result;
      assert.ok(evaluate(needs, 'push').length, `${name}: ${result}`);
    }
    needs[name].result = 'success';
  }
  for (const result of ['success', 'failure', 'cancelled', undefined]) {
    needs['patch-coverage'].result = result;
    assert.match(evaluate(needs, 'push').join('\n'), /patch-coverage/);
  }
});

test('every event requires build, quality, policy, and security checks', () => {
  for (const event of ['pull_request', 'merge_group', 'push']) {
    const needs = fixture(event);
    for (const name of [
      'frontend-build',
      'code-quality',
      'policy-tests',
      'dependency-vulnerability-scan',
      'secret-scan',
    ]) {
      needs[name].result = 'skipped';
      assert.match(evaluate(needs, event).join('\n'), new RegExp(name));
      needs[name].result = 'success';
    }
  }
});

test('unsupported or missing event cannot pass', () => {
  for (const event of [undefined, 'schedule'])
    assert.match(evaluate(fixture(), event).join('\n'), /Unsupported/);
});
