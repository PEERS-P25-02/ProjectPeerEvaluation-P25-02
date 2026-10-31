const fs = require('node:fs');
const path = require('node:path');
const { overallLineThreshold } = require('./coverage/policy.json');

const metrics = ['statements', 'functions', 'branches', 'lines'];

function packageResult(summary, name) {
  const total = summary?.total;
  if (!total || typeof total !== 'object')
    throw new Error(`Missing ${name} coverage totals`);
  for (const metric of metrics) {
    const counts = total[metric];
    if (
      !counts ||
      !Number.isSafeInteger(counts.total) ||
      !Number.isSafeInteger(counts.covered) ||
      counts.total < 0 ||
      counts.covered < 0 ||
      counts.covered > counts.total
    )
      throw new Error(`Invalid ${name} ${metric} coverage counts`);
  }
  const lines = total.lines;
  if (lines.total === 0) throw new Error(`Zero ${name} line denominator`);
  return {
    metrics: Object.fromEntries(
      metrics.map((metric) => [metric, total[metric]]),
    ),
    linePercentage: (lines.covered / lines.total) * 100,
    pass:
      BigInt(lines.covered) * 100n >=
      BigInt(lines.total) * BigInt(overallLineThreshold),
  };
}

function evaluateOverall(frontend, backend) {
  const packages = {
    frontend: packageResult(frontend, 'frontend'),
    backend: packageResult(backend, 'backend'),
  };
  return {
    threshold: overallLineThreshold,
    packages,
    pass: packages.frontend.pass && packages.backend.pass,
  };
}

if (require.main === module) {
  try {
    const root = process.env.COVERAGE_OUTPUT || 'coverage';
    const read = (name) =>
      JSON.parse(
        fs.readFileSync(path.join(root, name, 'coverage-summary.json'), 'utf8'),
      );
    const report = evaluateOverall(read('frontend'), read('backend'));
    fs.writeFileSync(
      path.join(root, 'overall-report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    if (!report.pass)
      throw new Error(
        `Overall line coverage is below ${overallLineThreshold}%`,
      );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { evaluateOverall };
