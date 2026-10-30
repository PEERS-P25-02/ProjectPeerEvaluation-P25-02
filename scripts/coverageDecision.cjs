// This validator intentionally uses only Node's standard library. It checks
// artifact identity and the runner's recorded decision without recalculating
// patch coverage in the final workflow job.
const fs = require('node:fs');
const path = require('node:path');
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
  return {
    missedBackendLines: Object.entries(report.files)
      .filter(([file]) => file.startsWith('src/backend/'))
      .flatMap(([, details]) => details.missed),
  };
}

function decide(report, selectorMode, provenance) {
  if (!['selected', 'full'].includes(selectorMode))
    throw new Error('Invalid selector mode');
  if (!report || !provenance || report.threshold !== provenance.threshold)
    throw new Error('Patch report threshold mismatch');
  const { missedBackendLines } = validatePatchReport(
    report,
    provenance.threshold,
  );
  // Broad discovery targets API misses; frontend-only misses stay below threshold.
  let decision;
  if (!report.total) decision = 'na';
  else if (report.pass) decision = 'pass';
  else if (
    selectorMode === 'selected' &&
    missedBackendLines.length &&
    !provenance.broadened
  )
    decision = 'broaden';
  else decision = 'below';
  return {
    schemaVersion: 1,
    ...provenance,
    selectorMode,
    decision,
    missedBackendLines,
  };
}

function readJson(directory, name) {
  return JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
}

function validate(directory, expected) {
  const decision = readJson(directory, 'decision.json');
  const report = readJson(directory, 'patch-report.json');
  const provenance = readJson(directory, 'provenance.json');
  const same = (actual, value) => String(actual) === String(value);
  if (
    decision.schemaVersion !== 1 ||
    !['selected', 'full'].includes(decision.selectorMode) ||
    !['pass', 'na', 'broaden', 'below'].includes(decision.decision) ||
    !Number.isInteger(decision.selectedIntegrationCount) ||
    decision.selectedIntegrationCount < 0 ||
    typeof decision.broadened !== 'boolean' ||
    !Array.isArray(decision.missedBackendLines) ||
    !same(decision.sha, expected.sha) ||
    !same(decision.runId, expected.runId) ||
    !same(decision.runAttempt, expected.runAttempt) ||
    decision.threshold !== patchThreshold ||
    decision.threshold !== report.threshold ||
    !same(report.sha, expected.sha) ||
    !same(report.head, expected.sha) ||
    !same(provenance.sha, expected.sha) ||
    !same(provenance.runId, expected.runId) ||
    !same(provenance.runAttempt, expected.runAttempt) ||
    provenance.selectorMode !== decision.selectorMode ||
    provenance.selectedIntegrationCount !== decision.selectedIntegrationCount ||
    !Array.isArray(provenance.suites) ||
    !Array.isArray(decision.suites)
  )
    throw new Error('Coverage artifact schema or provenance mismatch');
  const { missedBackendLines } = validatePatchReport(
    report,
    decision.threshold,
  );
  if (
    JSON.stringify(decision.missedBackendLines) !==
    JSON.stringify(missedBackendLines)
  )
    throw new Error('Decision missed-line provenance does not match report');
  const suites = new Set(provenance.suites.map((suite) => suite.name));
  if (
    !suites.has('frontend-unit') ||
    !suites.has('backend-unit') ||
    (decision.selectedIntegrationCount > 0 &&
      !suites.has('integration-selected')) ||
    [...suites].some((name) => name.startsWith('e2e')) ||
    JSON.stringify([...suites].sort()) !==
      JSON.stringify([...decision.suites].sort())
  )
    throw new Error('Coverage artifact is missing required suite provenance');
  const broadeningEvidence = suites.has('integration-broadened');
  if (decision.selectorMode === 'full' && decision.broadened)
    throw new Error('Full selector cannot declare a broadened run');
  if (decision.broadened && !broadeningEvidence)
    throw new Error(
      'Broadened run is missing broadened integration provenance',
    );
  if (!decision.broadened && broadeningEvidence)
    throw new Error('Unexpected broadened integration provenance');
  if (decision.decision === 'broaden' && broadeningEvidence)
    throw new Error('Broadened coverage artifact still requests broadening');
  const expectedDecision = decide(report, decision.selectorMode, decision);
  if (decision.decision !== expectedDecision.decision)
    throw new Error('Coverage decision does not match the patch report');
  if (decision.decision !== 'pass' && decision.decision !== 'na')
    throw new Error(`Changed-line coverage decision is ${decision.decision}`);
  return decision;
}

function main() {
  const directory = process.env.REPORT_DIR;
  const sha = process.env.PR_HEAD_SHA;
  const runId = process.env.GITHUB_RUN_ID;
  const runAttempt = process.env.GITHUB_RUN_ATTEMPT;
  if (
    !directory ||
    !/^[a-f0-9]{40,64}$/i.test(sha || '') ||
    !/^\d+$/.test(runId || '') ||
    !/^\d+$/.test(runAttempt || '')
  )
    throw new Error('Missing coverage validator provenance');
  const result = validate(directory, { sha, runId, runAttempt });
  console.log(`Changed-line coverage decision: ${result.decision}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { decide, validate, validatePatchReport };
