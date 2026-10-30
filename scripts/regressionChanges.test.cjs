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
  assert.deepEqual(calls[1], [
    'diff',
    '--name-status',
    '-z',
    '--find-renames',
    head,
    head,
  ]);
});
