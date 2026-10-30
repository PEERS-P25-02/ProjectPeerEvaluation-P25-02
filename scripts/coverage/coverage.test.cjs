const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  mergeFile,
  locationKey,
  addedLines,
  baseline,
  libraries,
  verifySourceMap,
} = require('./coverage.cjs');
const location = (column) => ({
  start: { line: 1, column: 0 },
  end: { line: 1, column },
});
function file(column, count) {
  return {
    path: 'fixture.js',
    statementMap: { 0: location(column) },
    s: { 0: count },
    fnMap: {},
    f: {},
    branchMap: {},
    b: {},
  };
}
test('union merges hits by complete source positions and rejects incompatible counters', () => {
  const target = file(2, 0);
  mergeFile(target, file(2, 3));
  assert.throws(() => mergeFile(target, file(3, 1)), {
    code: 'COVERAGE_INCOMPATIBLE_SCHEMA',
  });
  assert.deepEqual(target.s, { 0: 3 });
  assert.notEqual(locationKey(location(2)), locationKey(location(3)));
});
test('missing counter IDs fail rather than dropping hits', () => {
  const incoming = file(2, 1);
  incoming.s = {};
  assert.throws(() => mergeFile(file(2, 0), incoming), /mismatched/);
});
test('changed lines parse hunk additions independently of quoted paths', () => {
  assert.deepEqual(
    addedLines(
      '+++ "b/a\\tb.js"\n@@ -1,2 +1,3 @@\n-old\n+new\n context\n+last\n',
    ),
    [1, 3],
  );
  assert.deepEqual(addedLines('@@ -4,2 +4,0 @@\n-a\n-b'), []);
});
test('source maps require mappings and embedded source content', () => {
  assert.throws(
    () => verifySourceMap({ version: 3, sources: [] }),
    /incomplete/,
  );
});
test('whole application baseline includes every production file with zero counters', async () => {
  const { manifest } = require('./coverage.cjs');
  const data = await baseline(await libraries());
  assert.deepEqual(Object.keys(data).sort(), manifest());
  for (const report of Object.values(data)) {
    assert.ok(Object.values(report.s).every((count) => count === 0));
    assert.ok(Object.values(report.f).every((count) => count === 0));
    assert.ok(
      Object.values(report.b)
        .flat()
        .every((count) => count === 0),
    );
  }
});

test('manifest excludes generated coverage assets', () => {
  const { manifest } = require('./coverage.cjs');
  assert.ok(manifest().every((file) => !file.split('/').includes('coverage')));
});

test('normalization unwraps Vitest FileCoverage instances before serializing', async () => {
  const { normalize, manifest } = require('./coverage.cjs');
  const name = manifest()[0];
  const report = file(2, 1);
  report.path = name;
  const lib = await libraries();
  const map = lib.coverage.createCoverageMap({ [name]: report });
  const normalized = normalize(map.toJSON());
  assert.deepEqual(normalized[name].statementMap, report.statementMap);
  assert.equal(normalized[name].s[0], 1);
});
test('added lines retain JavaScript increment expressions', () => {
  assert.deepEqual(addedLines('@@ -0,0 +1 @@\n+++counter;'), [1]);
});

test('union preserves sparse provider counter IDs', () => {
  const target = file(2, 4);
  target.statementMap = { 1: target.statementMap[0] };
  target.s = { 1: 4 };
  mergeFile(target, file(2, 2));
  assert.equal(Object.keys(target.statementMap).length, 1);
  assert.equal(target.s[1], 4);
});

test('synthetic baseline fills only absent files without duplicating observed counters', () => {
  const { includeMissingFiles } = require('./coverage.cjs');
  const observed = { 'observed.js': file(2, 1) };
  const missing = file(3, 0);
  includeMissingFiles(observed, {
    'observed.js': file(3, 0),
    'missing.js': missing,
  });
  assert.equal(Object.keys(observed['observed.js'].fnMap).length, 0);
  assert.deepEqual(observed['observed.js'].s, { 0: 1 });
  assert.equal(Object.keys(observed['observed.js'].statementMap).length, 1);
  assert.equal(observed['missing.js'], missing);
});

test('function declaration metadata does not split an identical function body', () => {
  const target = file(2, 0);
  target.fnMap = { 0: { decl: location(1), loc: location(9) } };
  target.f = { 0: 0 };
  const incoming = structuredClone(target);
  incoming.fnMap[0].decl = location(2);
  incoming.f[0] = 1;
  mergeFile(target, incoming);
  assert.deepEqual(target.f, { 0: 1 });
});

test('Istanbul runtime snapshots require matching source hashes and completion', () => {
  const { istanbulSnapshot, sourceHashes } = require('./coverage.cjs');
  const sourceHashesMap = sourceHashes();
  const name = Object.keys(sourceHashesMap)[0];
  const report = file(2, 1);
  report.path = name;
  const snapshot = {
    complete: true,
    format: 'istanbul',
    coverage: { [name]: report },
    sourceHashes: sourceHashesMap,
  };
  assert.equal(istanbulSnapshot(snapshot)[name].s[0], 1);
  assert.throws(
    () => istanbulSnapshot({ ...snapshot, complete: false }),
    /Incomplete/,
  );
  assert.throws(
    () => istanbulSnapshot({ ...snapshot, sourceHashes: {} }),
    /hash mismatch/,
  );
});

test('shared source instrumentation unions complementary unit and browser branch hits', () => {
  const vm = require('node:vm');
  const { instrumentSource } = require('../frontendInstrumentation.cjs');
  const name = 'src/frontend/services/login.js';
  const original = 'function choose(value) { return value ? "yes" : "no"; }';
  const instrumented = instrumentSource(original, name);
  const unit = {};
  const browser = {};
  vm.runInNewContext(instrumented.code + '\nchoose(true);', unit);
  vm.runInNewContext(instrumented.code + '\nchoose(false);', browser);
  const combined = structuredClone(instrumented.coverage);
  mergeFile(combined, unit.__coverage__[name]);
  mergeFile(combined, browser.__coverage__[name]);
  assert.equal(Object.keys(combined.fnMap).length, 1);
  assert.equal(Object.values(combined.f)[0], 1);
  assert.deepEqual(Object.values(combined.b).flat(), [1, 1]);
});

test('duplicate source-span occurrences preserve independent hit counters', () => {
  const target = file(2, 0);
  target.statementMap[1] = structuredClone(target.statementMap[0]);
  target.s[1] = 0;
  const incoming = structuredClone(target);
  incoming.s[0] = 1;
  mergeFile(target, incoming);
  assert.deepEqual(target.s, { 0: 1, 1: 0 });
});

test('patch selection uses merge-base and preserves renames with unusual paths', () => {
  const { changedSourceLines } = require('./coverage.cjs');
  const base = 'a'.repeat(40);
  const head = 'b'.repeat(40);
  const ancestor = 'c'.repeat(40);
  const previous = 'src/frontend/old\tfile.jsx';
  const current = 'src/frontend/new\tfile.jsx';
  const calls = [];
  const git = (_command, args) => {
    calls.push(args);
    if (args[0] === 'merge-base') return ancestor + '\n';
    if (args.includes('--name-status'))
      return `R100\0${previous}\0${current}\0`;
    return `diff --git "a/old\\tfile.jsx" "b/new\\tfile.jsx"\nsimilarity index 100%\nrename from old\nrename to new\n`;
  };
  const result = changedSourceLines(base, head, git);
  assert.equal(result.mergeBase, ancestor);
  assert.deepEqual(result.changed[current], []);
  assert.ok(calls[2].includes('--find-renames'));
  assert.deepEqual(calls[2].slice(-5), [
    ancestor,
    head,
    '--',
    previous,
    current,
  ]);
});
