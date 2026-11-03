const fs = require('node:fs');
const path = require('node:path');

const suites = new Set(['selection', 'unit', 'integration-selected']);

function producer(outputs, suite, sha, runId) {
  if (
    !outputs ||
    !suites.has(suite) ||
    outputs.suite !== suite ||
    outputs.sha !== sha ||
    String(outputs['run-id']) !== String(runId) ||
    !/^[1-9]\d*$/.test(String(outputs.attempt || '')) ||
    !/^[1-9]\d*$/.test(String(outputs['artifact-id'] || ''))
  )
    throw new Error(`Missing or mismatched ${suite} artifact producer`);
  return {
    suite,
    sha,
    runId: String(runId),
    attempt: String(outputs.attempt),
    artifactId: String(outputs['artifact-id']),
  };
}

function validateFile(directory, expected) {
  const actual = JSON.parse(
    fs.readFileSync(path.join(directory, 'artifact-provenance.json'), 'utf8'),
  );
  for (const key of ['suite', 'sha', 'runId', 'attempt'])
    if (String(actual[key]) !== String(expected[key]))
      throw new Error(`${expected.suite} artifact ${key} mismatch`);
  return expected;
}

function writeFile(directory, suite) {
  const sha = process.env.PR_HEAD_SHA;
  const runId = process.env.GITHUB_RUN_ID;
  const attempt = process.env.GITHUB_RUN_ATTEMPT;
  if (
    !suites.has(suite) ||
    !/^[a-f\d]{40,64}$/i.test(sha || '') ||
    !/^[1-9]\d*$/.test(runId || '') ||
    !/^[1-9]\d*$/.test(attempt || '')
  )
    throw new Error('Invalid artifact producer provenance');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, 'artifact-provenance.json'),
    JSON.stringify({ suite, sha, runId, attempt }) + '\n',
  );
}

if (require.main === module) {
  try {
    if (process.argv[2] === 'check') {
      const needs = JSON.parse(process.env.CI_PRODUCERS || '{}');
      const suites = [
        ['select-tests', 'selection'],
        ['unit-tests', 'unit'],
        ...(needs['integration-tests']?.result === 'success'
          ? [['integration-tests', 'integration-selected']]
          : []),
      ];
      for (const [job, suite] of suites)
        producer(
          needs[job]?.outputs,
          suite,
          process.env.PR_HEAD_SHA,
          process.env.GITHUB_RUN_ID,
        );
    } else writeFile(process.argv[2], process.argv[3]);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { producer, validateFile, writeFile };
