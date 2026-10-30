const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { changedFiles } = require('./regressionChanges.cjs');
const { select } = require('./selectRegressionTests.cjs');
const { patchThreshold } = require('./coverage/policy.json');
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
function main() {
  const root = process.env.COVERAGE_ARTIFACTS || 'coverage-artifacts';
  const output = process.env.COVERAGE_OUTPUT || 'coverage';
  const suites = [];
  const add = (name, input, format, sourceRoot, capture) => {
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
  const suffix = `${sha}-${runId}-${attempt}`;
  const unit = path.join(root, `unit-coverage-${suffix}`);
  add('frontend-unit', path.join(unit, 'coverage/canonical'), 'istanbul');
  add(
    'backend-unit',
    path.join(unit, 'src/backend/coverage/coverage-final.json'),
    'istanbul',
  );
  const selection = JSON.parse(
    fs.readFileSync(
      path.join(root, `selection-${suffix}/selection.json`),
      'utf8',
    ),
  );
  const changes = JSON.parse(
    fs.readFileSync(
      path.join(root, `selection-${suffix}/changes.json`),
      'utf8',
    ),
  );
  const currentChanges = changedFiles(process.env.PR_BASE_SHA, sha);
  if (
    JSON.stringify(changes) !== JSON.stringify(currentChanges) ||
    JSON.stringify(selection) !==
      JSON.stringify(select(JSON.stringify(changes.files)))
  )
    throw new Error('Selection or merge-base provenance mismatch');
  if (!['selected', 'full'].includes(selection.mode))
    throw new Error('Coverage requires a code-change selection');
  console.log(
    `Integration selection: ${
      selection.mode === 'full'
        ? 'full discovery'
        : selection.integration.length
          ? selection.integration.join(', ')
          : 'none'
    }`,
  );
  if (process.env.REQUIRE_BROADEN === 'true' && selection.mode !== 'selected')
    throw new Error('Full discovery cannot request broadening');
  for (const suite of ['integration', 'e2e']) {
    // Require each expected artifact independently; several initial captures cannot
    // substitute for a missing broadened run.
    const artifactNames = [];
    if (selection[suite].length)
      artifactNames.push(`${suite}-results-${suffix}`);
    if (process.env.REQUIRE_BROADEN === 'true')
      artifactNames.push(`broaden-${suite}-results-${suffix}`);
    for (const [index, artifactName] of artifactNames.entries()) {
      const artifact = path.join(root, artifactName);
      const captures = directories(artifact).filter(
        (dir) => path.basename(dir) === 'coverage',
      );
      if (captures.length !== 1)
        throw new Error(
          `Expected one ${suite} coverage capture in ${artifactName}`,
        );
      const directory = captures[0];
      const capture = JSON.parse(
        fs.readFileSync(path.join(directory, 'capture.json'), 'utf8'),
      );
      validateCapture(capture, suite, { sha, runId, runAttempt: attempt });
      const name = `${suite}-${index}`;
      add(
        `${name}-backend`,
        path.join(directory, 'backend'),
        'v8',
        undefined,
        path.join(directory, 'capture.json'),
      );
      if (suite === 'e2e')
        add(
          `${name}-frontend`,
          path.join(directory, 'frontend'),
          'istanbul',
          undefined,
          path.join(directory, 'capture.json'),
        );
    }
  }
  fs.mkdirSync(output, { recursive: true });
  const plan = path.join(output, 'plan.json');
  fs.writeFileSync(
    plan,
    JSON.stringify({ sha, runId, runAttempt: attempt, suites }),
  );
  run(['merge', '--plan', plan, '--output', output]);
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
  const report = JSON.parse(
    fs.readFileSync(path.join(output, 'patch-report.json'), 'utf8'),
  );
  if (typeof report.pass !== 'boolean')
    throw new Error('Invalid patch decision');
  const broaden = !report.pass && selection.mode !== 'full';
  const coverage =
    report.percentage === null ? 'N/A' : `${report.percentage.toFixed(2)}%`;
  console.log(
    `Changed-line coverage: ${coverage} (${report.covered}/${report.total}); broadening: ${broaden ? 'required' : 'not required'}`,
  );
  if (process.env.GITHUB_OUTPUT)
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `broaden=${broaden}\n`);
  if (process.env.FINAL_COVERAGE === 'true' && !report.pass)
    throw new Error(
      `Changed executable line coverage is below ${patchThreshold}%`,
    );
}
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { main, validateCapture };
