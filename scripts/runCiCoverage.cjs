const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { changedFiles } = require('./regressionChanges.cjs');
const { select } = require('./selectRegressionTests.cjs');
const { patchThreshold } = require('./coverage/policy.json');
const { enforce } = require('./coverageDecision.cjs');
const { producer, validateFile } = require('./ciArtifactProvenance.cjs');

function validateCapture(capture, suite, provenance) {
  if (
    capture.complete !== true ||
    capture.suite !== suite ||
    capture.backend !== true ||
    capture.frontend !== true ||
    !Array.isArray(capture.errors) ||
    capture.errors.length ||
    Object.entries(provenance).some(([key, value]) => capture[key] !== value)
  )
    throw new Error(`Incomplete or mismatched ${suite} runtime capture`);
}

function run(args) {
  execFileSync(process.execPath, ['scripts/coverage/coverage.cjs', ...args], {
    stdio: 'inherit',
  });
}

function directories(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(root, entry.name);
    return entry.isDirectory() ? [name, ...directories(name)] : [];
  });
}

function addRuntime(add, artifact, suite, provenance, name) {
  const captures = directories(artifact).filter(
    (dir) => path.basename(dir) === 'coverage',
  );
  if (captures.length !== 1)
    throw new Error(`Expected one ${suite} coverage capture in ${artifact}`);
  const directory = captures[0];
  const capturePath = path.join(directory, 'capture.json');
  validateCapture(
    JSON.parse(fs.readFileSync(capturePath, 'utf8')),
    suite,
    provenance,
  );
  add(
    name,
    path.join(directory, 'backend'),
    'v8',
    undefined,
    capturePath,
    provenance.runAttempt,
  );
}

function main() {
  const kind = process.env.CI_CANDIDATE_KIND;
  if (!['pull_request', 'merge_group'].includes(kind))
    throw new Error('Unsupported coverage event');
  const queue = kind === 'merge_group';
  const root = process.env.COVERAGE_ARTIFACTS || 'coverage-artifacts';
  const output = process.env.COVERAGE_OUTPUT || 'coverage';
  const suites = [];
  const add = (name, input, format, sourceRoot, capture, producerAttempt) => {
    const report = path.join(output, 'inputs', `${name}.json`);
    run([
      'collect',
      '--suite',
      name,
      '--input',
      input,
      '--output',
      report,
      '--format',
      format,
      ...(sourceRoot ? ['--source-root', sourceRoot] : []),
      ...(capture ? ['--capture', capture] : []),
      ...(producerAttempt ? ['--producer-attempt', producerAttempt] : []),
    ]);
    suites.push({ name, report });
  };
  const sha = process.env.PR_HEAD_SHA;
  const runId = process.env.GITHUB_RUN_ID;
  const attempt = process.env.GITHUB_RUN_ATTEMPT;
  if (
    !/^[a-f0-9]{40,64}$/i.test(sha || '') ||
    !/^\d+$/.test(runId || '') ||
    !/^\d+$/.test(attempt || '')
  )
    throw new Error('Missing run provenance');
  const needs = JSON.parse(process.env.CI_PRODUCERS || '{}');
  const input = (job, suite, directory) => {
    if (needs[job]?.result !== 'success')
      throw new Error(`Required ${suite} producer did not succeed`);
    const metadata = producer(needs[job].outputs, suite, sha, runId);
    if (directory) validateFile(path.join(root, directory), metadata);
    return metadata;
  };
  const selectionProducer = input('select-tests', 'selection', 'selection');
  const unitProducer = input('unit-tests', 'unit', 'unit/coverage');
  const inputs = [selectionProducer, unitProducer];
  const unit = path.join(root, 'unit');
  const selection = JSON.parse(
    fs.readFileSync(path.join(root, 'selection/selection.json'), 'utf8'),
  );
  const changes = JSON.parse(
    fs.readFileSync(path.join(root, 'selection/changes.json'), 'utf8'),
  );
  const base = queue
    ? execFileSync('git', ['merge-base', 'refs/remotes/origin/main', sha], {
        encoding: 'utf8',
      }).trim()
    : process.env.PR_BASE_SHA;
  const currentChanges = changedFiles(base, sha);
  if (
    JSON.stringify(changes) !== JSON.stringify(currentChanges) ||
    JSON.stringify(selection) !==
      JSON.stringify(
        select(
          JSON.stringify(changes.files),
          queue,
          changes.uncertain === true,
        ),
      )
  )
    throw new Error('Selection or merge-base provenance mismatch');
  if (!['selected', 'full'].includes(selection.mode))
    throw new Error('Coverage requires a code-change selection');
  if (queue && selection.mode !== 'full')
    throw new Error('Queue coverage requires full selection');
  if (!Array.isArray(selection.integration))
    throw new Error('Invalid integration selection');
  if (queue && (!selection.integration.length || !selection.e2e?.length))
    throw new Error('Queue coverage requires complete API and E2E selection');
  add('frontend-unit', path.join(unit, 'coverage/canonical'), 'istanbul');
  add(
    'backend-unit',
    path.join(unit, 'src/backend/coverage/coverage-final.json'),
    'istanbul',
  );
  console.log(
    `Integration selection: ${
      selection.mode === 'full'
        ? 'full discovery'
        : selection.integration.length
          ? selection.integration.join(', ')
          : 'none'
    }`,
  );
  if (selection.integration.length) {
    const integrationProducer = input(
      'integration-tests',
      'integration-selected',
      'integration-selected',
    );
    inputs.push(integrationProducer);
    addRuntime(
      add,
      path.join(root, 'integration-selected'),
      'integration',
      {
        sha,
        runId,
        runAttempt: integrationProducer.attempt,
      },
      'integration-selected',
    );
  }
  fs.mkdirSync(output, { recursive: true });
  const plan = path.join(output, 'plan.json');
  fs.writeFileSync(
    plan,
    JSON.stringify({
      sha,
      runId,
      runAttempt: attempt,
      inputs,
      selectorMode: selection.mode,
      selectedIntegrationCount: selection.integration.length,
      suites,
    }),
  );
  run(['merge', '--plan', plan, '--output', output]);
  if (queue) {
    execFileSync(process.execPath, ['scripts/overallCoverage.cjs'], {
      stdio: 'inherit',
      env: { ...process.env, COVERAGE_OUTPUT: output },
    });
    return;
  }
  if (changes.uncertain === true)
    throw new Error('Changed-line coverage requires reliable change evidence');
  run([
    'patch',
    '--base',
    changes.mergeBase,
    '--head',
    sha,
    '--report',
    path.join(output, 'combined/coverage-final.json'),
    '--output',
    path.join(output, 'patch-report.json'),
    '--threshold',
    String(patchThreshold),
  ]);
  const patchReport = JSON.parse(
    fs.readFileSync(path.join(output, 'patch-report.json'), 'utf8'),
  );
  const coverage =
    patchReport.percentage === null
      ? 'N/A'
      : `${patchReport.percentage.toFixed(2)}%`;
  console.log(
    `Changed-line coverage: ${coverage} (${patchReport.covered}/${patchReport.total}); required: ${patchThreshold}%.`,
  );
  // The report is already on disk, so a failed threshold remains inspectable.
  enforce(patchReport);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { main, validateCapture, addRuntime };
