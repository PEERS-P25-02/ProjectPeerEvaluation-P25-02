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

test('missing aggregate frontend unit coverage still fails collection', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { collect } = require('./coverage.cjs');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-unit-'));
  try {
    await assert.rejects(
      collect({
        suite: 'frontend-unit',
        format: 'istanbul',
        input: directory,
        output: path.join(directory, 'report.json'),
      }),
      /No coverage input files/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('artifact producers accept different attempts within one SHA and run', () => {
  const { producer } = require('../ciArtifactProvenance.cjs');
  const sha = 'a'.repeat(40);
  const selection = {
    suite: 'selection',
    sha,
    'run-id': '12',
    attempt: '1',
    'artifact-id': '101',
  };
  const unit = {
    suite: 'unit',
    sha,
    'run-id': '12',
    attempt: '2',
    'artifact-id': '102',
  };
  assert.equal(producer(selection, 'selection', sha, '12').attempt, '1');
  assert.equal(producer(unit, 'unit', sha, '12').attempt, '2');
  for (const bad of [
    { ...unit, sha: 'b'.repeat(40) },
    { ...unit, 'run-id': '13' },
    { ...unit, suite: 'selection' },
    { ...unit, 'artifact-id': '' },
  ])
    assert.throws(() => producer(bad, 'unit', sha, '12'), /producer/);
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

test('changed-line threshold validation reconciles synthetic file counters', () => {
  const { validatePatchReport, enforce } = require('../coverageDecision.cjs');
  const threshold = 80;
  assert.equal(threshold, 80);
  const passing = {
    status: 'evaluated',
    total: 5,
    covered: 4,
    percentage: 80,
    threshold,
    pass: true,
    files: {
      'src/backend/a.js': { executable: [2, 3], missed: [3] },
      'src/frontend/b.jsx': { executable: [8, 9, 10], missed: [] },
    },
  };
  assert.deepEqual(validatePatchReport(passing, threshold), passing);
  assert.equal(enforce(passing, threshold).pass, true);
  const below = {
    ...passing,
    covered: 3,
    percentage: 60,
    pass: false,
    files: {
      'src/backend/a.js': { executable: [2, 3], missed: [3] },
      'src/frontend/b.jsx': { executable: [8, 9, 10], missed: [8] },
    },
  };
  assert.throws(() => enforce(below, threshold), /Coverage failed/);
  // A rounded display value must not turn 79.5% into a passing report.
  const roundedBelow = {
    ...passing,
    total: 200,
    covered: 159,
    percentage: 79.5,
    pass: false,
    files: {
      'src/backend/a.js': {
        executable: Array.from({ length: 100 }, (_, index) => index + 1),
        missed: Array.from({ length: 20 }, (_, index) => index + 1),
      },
      'src/frontend/b.jsx': {
        executable: Array.from({ length: 100 }, (_, index) => index + 101),
        missed: Array.from({ length: 21 }, (_, index) => index + 101),
      },
    },
  };
  assert.throws(() => enforce(roundedBelow, threshold), /Coverage failed/);
  assert.throws(
    () => enforce({ ...passing, threshold: 75 }, threshold),
    /Invalid patch coverage report/,
  );
  assert.throws(
    () => validatePatchReport({ ...passing, covered: 5 }, threshold),
    /do not reconcile/,
  );
});

test('empty changed-line set is a valid not-applicable report', () => {
  const { enforce } = require('../coverageDecision.cjs');
  const report = {
    status: 'not-applicable',
    total: 0,
    covered: 0,
    percentage: null,
    threshold: 80,
    pass: true,
    files: {},
  };
  assert.deepEqual(enforce(report, 80), report);
});

test('artifact producers may come from mixed attempts within one workflow run', () => {
  const { producer } = require('../ciArtifactProvenance.cjs');
  const sha = 'a'.repeat(40);
  const selection = producer(
    {
      suite: 'selection',
      sha,
      'run-id': '12',
      attempt: '1',
      'artifact-id': '101',
    },
    'selection',
    sha,
    '12',
  );
  const unit = producer(
    { suite: 'unit', sha, 'run-id': '12', attempt: '2', 'artifact-id': '102' },
    'unit',
    sha,
    '12',
  );
  assert.equal(selection.attempt, '1');
  assert.equal(unit.attempt, '2');
  assert.equal(selection.runId, unit.runId);
  assert.throws(
    () =>
      producer(
        {
          suite: 'unit',
          sha,
          'run-id': '13',
          attempt: '2',
          'artifact-id': '102',
        },
        'unit',
        sha,
        '12',
      ),
    /producer/,
  );
});

test('coverage orchestration retains its report when the changed-line threshold fails', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { select } = require('../selectRegressionTests.cjs');
  const { patchThreshold } = require('./policy.json');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-coverage-'));
  const sha = 'a'.repeat(40);
  const base = 'b'.repeat(40);
  const runId = '12';
  const root = path.join(directory, 'artifacts');
  const output = path.join(directory, 'coverage');
  const changes = {
    base,
    head: sha,
    mergeBase: base,
    files: [
      { path: 'src/frontend/tests/StudentEvaluation.test.jsx', status: 'M' },
    ],
  };
  const selection = select(JSON.stringify(changes.files));
  const writeJson = (file, value) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value));
  };
  const artifact = (relative, suite, attempt, artifactId) => {
    writeJson(path.join(root, relative, 'artifact-provenance.json'), {
      suite,
      sha,
      runId,
      attempt,
    });
    return {
      result: 'success',
      outputs: {
        suite,
        sha,
        'run-id': runId,
        attempt,
        'artifact-id': artifactId,
      },
    };
  };
  try {
    writeJson(path.join(root, 'selection/selection.json'), selection);
    writeJson(path.join(root, 'selection/changes.json'), changes);
    const producers = {
      'select-tests': artifact('selection', 'selection', '1', '101'),
      'unit-tests': artifact('unit/coverage', 'unit', '2', '102'),
    };
    const changedPath = changes.files[0].path;
    const preload = path.join(directory, 'mock-coverage-cli.cjs');
    fs.writeFileSync(
      preload,
      `const cp = require('node:child_process');
const original = cp.execFileSync;
cp.execFileSync = (file, args, options) => {
  if (file === 'git') return args[0] === 'merge-base'
    ? process.env.PR_BASE_SHA + '\\n'
    : 'M\\0' + process.env.TEST_CHANGED_PATH + '\\0';
  if (args[0] === 'scripts/coverage/coverage.cjs') {
    const command = args[1];
    const value = (flag) => args[args.indexOf(flag) + 1];
    const fs = require('node:fs');
    const path = require('node:path');
    if (command === 'collect') {
      const reportPath = value('--output');
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, '{}');
    } else if (command === 'merge') {
      const reportPath = path.join(value('--output'), 'combined/coverage-final.json');
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, '{}');
    } else if (command === 'patch') {
      const report = {
        status: 'evaluated', total: 1, covered: 0, percentage: 0,
        threshold: Number(value('--threshold')), pass: false,
        files: { [process.env.TEST_CHANGED_PATH]: { executable: [1], missed: [1] } },
      };
      fs.writeFileSync(value('--output'), JSON.stringify(report));
    }
    return Buffer.from('');
  }
  return original(file, args, options);
};\n`,
    );
    const result = spawnSync(
      process.execPath,
      [path.resolve(__dirname, '../runCiCoverage.cjs')],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          CI_CANDIDATE_KIND: 'pull_request',
          COVERAGE_ARTIFACTS: root,
          COVERAGE_OUTPUT: output,
          PR_HEAD_SHA: sha,
          PR_BASE_SHA: base,
          GITHUB_RUN_ID: runId,
          GITHUB_RUN_ATTEMPT: '3',
          TEST_CHANGED_PATH: changedPath,
          CI_PRODUCERS: JSON.stringify(producers),
          NODE_OPTIONS: `--require=${preload}`,
        },
      },
    );
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    // The CLI reaches enforcement only after writing patch-report.json; a nonzero
    // status plus that report proves threshold failure did not discard evidence.
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const retained = JSON.parse(
      fs.readFileSync(path.join(output, 'patch-report.json'), 'utf8'),
    );
    assert.equal(retained.pass, false);
    assert.equal(retained.percentage, 0);
    assert.equal(retained.threshold, patchThreshold);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
