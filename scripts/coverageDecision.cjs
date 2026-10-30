// Validate the coverage engine's report before enforcing its threshold.
const { patchThreshold } = require('./coverage/policy.json');

function validatePatchReport(report, threshold) {
  if (
    !report ||
    !['evaluated', 'not-applicable'].includes(report.status) ||
    !Number.isInteger(report.total) ||
    report.total < 0 ||
    !Number.isInteger(report.covered) ||
    report.covered < 0 ||
    report.covered > report.total ||
    !Number.isFinite(report.threshold) ||
    report.threshold !== threshold ||
    typeof report.pass !== 'boolean' ||
    !report.files ||
    typeof report.files !== 'object' ||
    Array.isArray(report.files)
  )
    throw new Error('Invalid patch coverage report');

  let total = 0;
  let missed = 0;
  for (const [file, details] of Object.entries(report.files)) {
    if (
      !details ||
      !Array.isArray(details.executable) ||
      !Array.isArray(details.missed)
    )
      throw new Error(`Invalid patch file details: ${file}`);
    const executable = new Set(details.executable);
    if (
      executable.size !== details.executable.length ||
      details.executable.some(
        (line) => !Number.isSafeInteger(line) || line < 1,
      ) ||
      new Set(details.missed).size !== details.missed.length ||
      details.missed.some(
        (line) => !Number.isSafeInteger(line) || !executable.has(line),
      )
    )
      throw new Error(`Invalid executable or missed lines: ${file}`);
    total += details.executable.length;
    missed += details.missed.length;
  }
  if (total !== report.total || report.covered !== total - missed)
    throw new Error('Patch file counters do not reconcile with report totals');

  if (report.total === 0) {
    if (
      report.status !== 'not-applicable' ||
      report.covered !== 0 ||
      report.percentage !== null ||
      report.pass !== true
    )
      throw new Error('Invalid not-applicable patch coverage report');
  } else {
    const percentage = (report.covered / report.total) * 100;
    if (
      report.status !== 'evaluated' ||
      !Number.isFinite(report.percentage) ||
      report.percentage < 0 ||
      report.percentage > 100 ||
      Math.abs(report.percentage - percentage) > 1e-9 ||
      report.pass !== percentage >= threshold
    )
      throw new Error('Invalid evaluated patch coverage report');
  }
  return report;
}

function enforce(report, threshold = patchThreshold) {
  validatePatchReport(report, threshold);
  if (!report.pass)
    throw new Error(
      'Coverage failed. Review the missed lines and the selected regression tests.',
    );
  return report;
}

module.exports = { enforce, validatePatchReport };
