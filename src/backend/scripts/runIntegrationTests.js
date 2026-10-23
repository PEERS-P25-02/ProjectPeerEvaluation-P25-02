/*
 * This script manages a complete temporary test run. It gives the run its own
 * data and email inbox, starts the required parts, waits until they are ready,
 * runs the checks, and saves the results. It keeps this work separate from
 * everyday development settings and data.
 *
 * After a run passes, fails, or is interrupted normally, it removes the items
 * created for that run and checks that cleanup worked. Saved results remain
 * available for troubleshooting. If Docker stops working or the computer shuts
 * down unexpectedly, some items may need to be removed manually.
 *
 * This script manages the environment; the test files decide what behavior is
 * checked. It does not start the website or provide complete feature coverage.
 *
 * TLDR: orchestrates compose.test.yml with a unique project/database and an
 * ephemeral JWT secret, runs Vitest, retains logs and result.json, and verifies
 * project-scoped cleanup. Handles SIGINT/SIGTERM and returns a nonzero exit code
 * for failed setup, tests, cleanup, or interruption. Run: npm run test:integration.
 */
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const runId = randomBytes(8).toString('hex');
const project = `peers-test-${runId}`;
const resultsDirectory = path.join(root, 'test-results/integration', runId);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'peers-test-'),
);
const emptyEnvironmentFile = path.join(temporaryDirectory, 'empty.env');
fs.writeFileSync(emptyEnvironmentFile, '');
fs.mkdirSync(resultsDirectory, { recursive: true });

// Ignore ambient Compose configuration and the developer .env. Only these two
// generated values are interpolated by the standalone test Compose definition.
const environment = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('COMPOSE_')),
);
environment.TEST_RUN_ID = runId;
environment.TEST_JWT_SECRET = randomBytes(32).toString('hex');
const composeArguments = [
  'compose',
  '--project-directory',
  root,
  '--env-file',
  emptyEnvironmentFile,
  '--file',
  path.join(root, 'compose.test.yml'),
  '--project-name',
  project,
];
let activeChild;
let interrupted = 0;
let cleaningUp = false;

function handleSignal(signal) {
  if (interrupted) return;
  interrupted = signal === 'SIGINT' ? 130 : 143;
  if (!cleaningUp) activeChild?.kill('SIGTERM');
}
process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);

function docker(argumentsList, { quiet = false, log = 'runner.log' } = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    const child = spawn('docker', argumentsList, {
      cwd: root,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: cleaningUp ? 120000 : 600000,
    });
    activeChild = child;
    function record(chunk) {
      fs.appendFileSync(path.join(resultsDirectory, log), chunk);
      if (!quiet) process.stdout.write(chunk);
    }
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      record(chunk);
    });
    child.stderr.on('data', record);
    child.on('error', (error) => {
      console.error(`Docker command failed: ${error.message}`);
    });
    child.on('close', (code) => {
      activeChild = undefined;
      resolve({ code: code ?? 1, stdout });
    });
  });
}

async function main() {
  let exitCode = 1;
  let startupAttempted = false;
  let cleanupVerified = false;
  console.log(`Integration project: ${project}`);
  console.log(`Results: ${resultsDirectory}`);
  try {
    const version = await docker(['compose', 'version']);
    if (version.code !== 0 || interrupted) return;
    startupAttempted = true;
    const startup = await docker([
      ...composeArguments,
      'up',
      '--build',
      '--wait',
      '--wait-timeout',
      '120',
      'backend',
    ]);
    if (startup.code !== 0 || interrupted) return;
    const tests = await docker([
      ...composeArguments,
      'run',
      '--build',
      '--rm',
      '--no-deps',
      'tests',
      'npm',
      'run',
      'test:integration',
      '--',
      ...process.argv.slice(2),
    ]);
    exitCode = tests.code;
  } finally {
    cleaningUp = true;
    if (startupAttempted) {
      // Preserve evidence before deleting only this generated project's resources.
      await docker(
        [
          ...composeArguments,
          'logs',
          '--no-color',
          '--timestamps',
          'backend',
          'mailpit',
        ],
        { quiet: true, log: 'services.log' },
      );
      const cleanup = await docker([
        ...composeArguments,
        'down',
        '--volumes',
        '--remove-orphans',
        '--rmi',
        'local',
        '--timeout',
        '10',
      ]);
      const leftovers = [];
      for (const resource of ['container', 'network', 'volume']) {
        const check = await docker(
          [
            resource,
            'ls',
            ...(resource === 'container' ? ['--all'] : []),
            '--quiet',
            '--filter',
            `label=com.docker.compose.project=${project}`,
          ],
          { quiet: true },
        );
        leftovers.push(check.code !== 0 || check.stdout.trim().length > 0);
      }
      cleanupVerified =
        cleanup.code === 0 && leftovers.every((remaining) => !remaining);
      if (!cleanupVerified) {
        console.error(
          `Cleanup failed; inspect Docker resources for ${project}`,
        );
        exitCode = exitCode || 1;
      }
    }
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    process.exitCode = interrupted || exitCode;
    fs.writeFileSync(
      path.join(resultsDirectory, 'result.json'),
      JSON.stringify(
        {
          project,
          runId,
          exitCode: process.exitCode,
          cleanupVerified,
          interrupted: Boolean(interrupted),
        },
        null,
        2,
      ) + '\n',
    );
    console.log(
      `Integration exit: ${process.exitCode}; cleanup verified: ${cleanupVerified}`,
    );
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = interrupted || 1;
});
