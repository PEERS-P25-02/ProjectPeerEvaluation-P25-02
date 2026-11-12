const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyPaths,
  compare,
  escaped,
  isExcludedPath,
} = require('./decideStaging.cjs');

const excluded = [
  'docs/guide.md',
  'README.md',
  'src/frontend/test/a.test.jsx',
  'src/frontend/tests/a.test.jsx',
  'src/backend/tests/a.test.js',
  'tests/e2e/spec.js',
  'Dockerfile.e2e',
  'Dockerfile.e2e.dockerignore',
  'src/backend/Dockerfile.test',
  'src/backend/Dockerfile.test.dockerignore',
  'playwright.config.cjs',
  'src/backend/vitest.config.mjs',
  'src/backend/vitest.coverage.config.mjs',
  'src/backend/vitest.integration.config.mjs',
  'compose.e2e.yml',
  'compose.test.yml',
  'compose.test.coverage.yml',
  'scripts/runE2ETests.cjs',
];

test('all audited directory and exact-file entries are excluded', () => {
  for (const path of excluded) assert.equal(isExcludedPath(path), true, path);
  assert.equal(classifyPaths(excluded).deploy, false);
});

test('an empty tree diff skips deployment with a valid baseline', () => {
  const output = [Buffer.alloc(0), Buffer.alloc(0)];
  const result = compare('b'.repeat(40), 'a'.repeat(40), () => output.shift());
  assert.equal(result.evaluated, true);
  assert.equal(result.deploy, false);
  assert.deepEqual(result.paths, []);
});

test('mixed changes and production inputs deploy both services', () => {
  const paths = [
    ...excluded,
    '.dockerignore',
    'src/backend/Dockerfile',
    'vite.config.mjs',
  ];
  assert.equal(classifyPaths(paths).deploy, true);
  for (const path of [
    'scripts/frontendInstrumentation.cjs',
    'scripts/coverage/policy.json',
    'src/backend/scripts/runtimeCoverage.cjs',
    'src/backend/.dockerignore',
    '.github/workflows/cd.yml',
    'package-lock.json',
  ])
    assert.equal(isExcludedPath(path), false, path);
});

test('exact paths prevent near matches from entering the denylist', () => {
  for (const path of [
    'README-historical.md',
    'docs-old/a.md',
    'Dockerfile.e2e.copy',
    'scripts/runE2ETests.cjs.bak',
  ]) {
    assert.equal(isExcludedPath(path), false, path);
  }
});

test('missing, invalid, non-ancestor and failed diff baselines fail open to deployment', () => {
  const candidate = 'a'.repeat(40);
  assert.equal(compare('', candidate).deploy, true);
  assert.equal(compare('bad', candidate).deploy, true);
  const failAncestor = () => {
    throw new Error('not ancestor');
  };
  assert.equal(compare('b'.repeat(40), candidate, failAncestor).deploy, true);
  let calls = 0;
  const failDiff = (_bin, args) => {
    calls += 1;
    if (args[0] === 'merge-base') return Buffer.alloc(0);
    throw new Error('diff failed');
  };
  assert.equal(compare('b'.repeat(40), candidate, failDiff).deploy, true);
  assert.equal(calls, 2);
});

test('valid tree diff handles deleted and renamed paths conservatively', () => {
  const candidate = 'a'.repeat(40);
  const outputs = [
    Buffer.alloc(0),
    Buffer.from('docs/deleted.md\0src/frontend/renamed.jsx\0'),
  ];
  const git = () => outputs.shift();
  assert.equal(compare('b'.repeat(40), candidate, git).deploy, true);
  const excludedRenameSides = [
    Buffer.alloc(0),
    Buffer.from('docs/old.md\0docs/new.md\0'),
  ];
  assert.equal(
    compare('b'.repeat(40), candidate, () => excludedRenameSides.shift())
      .deploy,
    false,
  );
});

test('invalid candidates fail closed before path decisions', () => {
  assert.throws(() => compare('b'.repeat(40), 'bad'), /Invalid candidate/);
});

test('later comparison includes changes accumulated during skipped runs', () => {
  const candidate = 'a'.repeat(40);
  const output = [
    Buffer.alloc(0),
    Buffer.from('docs/change-from-skipped-run.md\0src/frontend/App.jsx\0'),
  ];
  const result = compare('b'.repeat(40), candidate, () => output.shift());
  assert.equal(result.deploy, true);
  assert.deepEqual(result.paths, [
    'docs/change-from-skipped-run.md',
    'src/frontend/App.jsx',
  ]);
});

test('unfamiliar special-character paths deploy and are escaped for summaries', () => {
  const unusual = 'odd`name\n::warning::value';
  assert.equal(classifyPaths([unusual]).deploy, true);
  assert.equal(escaped(unusual), JSON.stringify(unusual));
  assert.equal(escaped(unusual).includes('\n'), false);
});
