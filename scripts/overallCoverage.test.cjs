const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { evaluateOverall } = require('./overallCoverage.cjs');

function summary(covered, total = 100) {
  const counts = { covered, total };
  return {
    total: {
      statements: counts,
      functions: counts,
      branches: counts,
      lines: counts,
    },
  };
}

function runCli(t, frontend, backend) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'overall-coverage-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [name, report] of [
    ['frontend', frontend],
    ['backend', backend],
  ]) {
    if (report === undefined) continue;
    const directory = path.join(root, name);
    fs.mkdirSync(directory);
    fs.writeFileSync(
      path.join(directory, 'coverage-summary.json'),
      JSON.stringify(report),
    );
  }
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, 'overallCoverage.cjs')],
    {
      env: { ...process.env, COVERAGE_OUTPUT: root },
      encoding: 'utf8',
    },
  );
  return { result, reportPath: path.join(root, 'overall-report.json') };
}

test('exactly 70% lines passes separately in both packages', () => {
  const report = evaluateOverall(summary(70), summary(70));
  assert.equal(report.pass, true);
  assert.equal(report.packages.frontend.linePercentage, 70);
  assert.equal(report.packages.backend.linePercentage, 70);
});

test('below 70% lines in either package fails', () => {
  for (const [frontend, backend] of [
    [summary(69), summary(70)],
    [summary(70), summary(69)],
  ])
    assert.equal(evaluateOverall(frontend, backend).pass, false);
});

test('other metrics do not affect the line threshold', () => {
  const frontend = summary(0);
  frontend.total.lines = { covered: 70, total: 100 };
  assert.equal(evaluateOverall(frontend, summary(70)).pass, true);
});

test('invalid required counts and zero denominators fail', () => {
  for (const report of [
    undefined,
    {},
    { total: { lines: { covered: 70, total: 100 } } },
    summary(101),
    summary(0, 0),
    summary(NaN),
    summary(Infinity),
    summary(70.5),
    summary(-1),
    summary('70'),
    summary(70, Infinity),
  ])
    assert.throws(() => evaluateOverall(report, summary(70)));
  assert.throws(() => evaluateOverall(summary(70), undefined));
});

test('CLI writes passing and failing reports and fails on missing input', (t) => {
  const passing = runCli(t, summary(70), summary(70));
  assert.equal(passing.result.status, 0);
  assert.equal(JSON.parse(fs.readFileSync(passing.reportPath)).pass, true);

  const failing = runCli(t, summary(69), summary(70));
  assert.notEqual(failing.result.status, 0);
  assert.equal(JSON.parse(fs.readFileSync(failing.reportPath)).pass, false);

  const missing = runCli(t, summary(70), undefined);
  assert.notEqual(missing.result.status, 0);
});
