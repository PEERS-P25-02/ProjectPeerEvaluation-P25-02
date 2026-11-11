const test = require('node:test');
const assert = require('node:assert/strict');
const { changedFiles } = require('./regressionChanges.cjs');
const head = 'a'.repeat(40);
test('event SHA validation rejects absent or shell-shaped input', () => {
  assert.throws(() => changedFiles('', 'main'));
  assert.throws(() => changedFiles('HEAD; echo unsafe', 'HEAD'));
});
test('null-delimited changes preserve rename, deletion and whitespace paths', () => {
  const calls = [];
  const result = changedFiles(head, head, (_command, args) => {
    calls.push(args);
    return args[0] === 'merge-base'
      ? `${head}\n`
      : 'R100\0old name.js\0new name.js\0D\0deleted.js\0M\0space file.js\0A\0added.js\0';
  });
  assert.deepEqual(result.files, [
    { path: 'new name.js', status: 'R100', previousPath: 'old name.js' },
    { path: 'deleted.js', status: 'D' },
    { path: 'space file.js', status: 'M' },
    { path: 'added.js', status: 'A' },
  ]);
  assert.equal(result.base, head);
  assert.equal(result.head, head);
  assert.deepEqual(calls[1], [
    'diff',
    '--name-status',
    '-z',
    '--find-renames',
    head,
    head,
  ]);
});
test('missing or empty Git change evidence is marked uncertain', () => {
  const unavailable = changedFiles(head, head, () => {
    throw new Error('commit unavailable');
  });
  assert.equal(unavailable.uncertain, true);
  assert.deepEqual(unavailable.files, []);

  const empty = changedFiles(head, head, (_command, args) =>
    args[0] === 'merge-base' ? `${head}\n` : '',
  );
  assert.equal(empty.uncertain, true);
  assert.deepEqual(empty.files, []);
});
test('unexpected Git change status cannot authorize a docs-only skip', () => {
  const result = changedFiles(head, head, (_command, args) =>
    args[0] === 'merge-base' ? `${head}\n` : 'U\0README.md\0',
  );
  assert.equal(result.uncertain, true);
  assert.deepEqual(result.files, []);
});
