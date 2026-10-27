/*
 * Run Chromium smoke checks against a disposable, same-origin Compose stack.
 * Each invocation owns its project, database and JWT secret. Preserve logs and
 * browser artifacts before removing and verifying only that project's resources.
 */
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const baseURL = 'http://frontend';
const testArguments = process.argv.slice(2);
// Fail early on a mistaken target or config override instead of silently ignoring
// it. The isolated network also prevents runtime access to external services.
if (process.env.E2E_BASE_URL && process.env.E2E_BASE_URL !== baseURL) {
  throw new Error(`E2E_BASE_URL must be ${baseURL}`);
}
if (
  testArguments.some(
    (argument) =>
      /^--(?:config|output)(?:=|$)/.test(argument) || /^-[co]/.test(argument),
  )
) {
  throw new Error(
    'The smoke runner owns the Playwright config and output directory',
  );
}

const root = path.resolve(__dirname, '..');
const runId = randomBytes(8).toString('hex');
const project = `peers-e2e-${runId}`;
const testContainer = `${project}-tests`;
const resultsDirectory = path.join(root, 'test-results/e2e', runId);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'peers-e2e-'));
const emptyEnvironmentFile = path.join(temporaryDirectory, 'empty.env');
fs.writeFileSync(emptyEnvironmentFile, '');
fs.mkdirSync(resultsDirectory, { recursive: true });

// Explicit file/project arguments and an empty env file prevent development
// Compose configuration and local .env credentials from entering this stack.
const environment = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('COMPOSE_')),
);
environment.E2E_RUN_ID = runId;
environment.E2E_JWT_SECRET = randomBytes(32).toString('hex');
const composeArguments = [
  'compose',
  '--project-directory',
  root,
  '--env-file',
  emptyEnvironmentFile,
  '--file',
  path.join(root, 'compose.e2e.yml'),
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
      record(`Docker command failed: ${error.message}\n`);
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
  let testsAttempted = false;
  let cleanupVerified = false;
  console.log(`E2E project: ${project}`);
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
      'frontend',
    ]);
    if (startup.code !== 0 || interrupted) return;
    testsAttempted = true;
    const tests = await docker([
      ...composeArguments,
      'run',
      '--build',
      '--no-deps',
      '--no-TTY',
      '--name',
      testContainer,
      'tests',
      'node',
      'node_modules/@playwright/test/cli.js',
      'test',
      ...testArguments,
    ]);
    exitCode = tests.code;
  } finally {
    cleaningUp = true;
    if (startupAttempted) {
      // Keep the stopped test container until artifacts have been copied. On a
      // build failure there may be no container or browser artifacts to collect.
      if (testsAttempted) {
        const exists = await docker(
          [
            'container',
            'inspect',
            '--format',
            '{{.State.Status}}',
            testContainer,
          ],
          { quiet: true },
        );
        if (exists.code === 0) {
          const artifacts = await docker([
            'cp',
            `${testContainer}:/app/test-results/e2e/playwright`,
            path.join(resultsDirectory, 'playwright'),
          ]);
          if (artifacts.code !== 0) exitCode = exitCode || 1;
        }
      }
      await docker(
        [...composeArguments, 'logs', '--no-color', '--timestamps'],
        { quiet: true, log: 'services.log' },
      );
      const cleanup = await docker([
        ...composeArguments,
        'down',
        '--volumes',
        '--remove-orphans',
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
      `E2E exit: ${process.exitCode}; cleanup verified: ${cleanupVerified}`,
    );
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = interrupted || 1;
});
