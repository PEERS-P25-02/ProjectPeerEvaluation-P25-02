const test = require('node:test');
const assert = require('node:assert/strict');
const {
  patchChanges,
  requiresOverallCoverage,
} = require('./runCiCoverage.cjs');

test('pull requests use changed-line coverage only', () => {
  assert.equal(requiresOverallCoverage('pull_request'), false);
  const git = (_command, args) =>
    args[0] === 'merge-base' ? `${'a'.repeat(40)}\n` : `M\0src/file.js\0`;
  assert.deepEqual(
    patchChanges('pull_request', 'b'.repeat(40), 'c'.repeat(40), git),
    {
      base: 'b'.repeat(40),
      head: 'c'.repeat(40),
      mergeBase: 'a'.repeat(40),
      files: [{ path: 'src/file.js', status: 'M' }],
    },
  );
});

test('merge groups and pushes enforce overall coverage without changed-line coverage', () => {
  for (const event of ['merge_group', 'push']) {
    assert.equal(requiresOverallCoverage(event), true);
    assert.equal(patchChanges(event), null);
  }
});
