const { execFileSync } = require('node:child_process');

const EXCLUDED_DIRECTORIES = [
  'docs/',
  'src/frontend/test/',
  'src/frontend/tests/',
  'src/backend/tests/',
  'tests/e2e/',
];

const EXCLUDED_FILES = new Set([
  'README.md',
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
]);

function isExcludedPath(path) {
  return (
    EXCLUDED_FILES.has(path) ||
    EXCLUDED_DIRECTORIES.some((prefix) => path.startsWith(prefix))
  );
}

function classifyPaths(paths) {
  const excluded = [];
  const included = [];
  for (const path of paths)
    (isExcludedPath(path) ? excluded : included).push(path);
  return { deploy: included.length > 0, excluded, included };
}

function validSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

function compare(baseline, candidate, git = execFileSync) {
  if (!validSha(candidate)) throw new Error('Invalid candidate SHA.');
  if (!validSha(baseline))
    return {
      deploy: true,
      evaluated: false,
      reason: 'missing-or-invalid-baseline',
      paths: [],
    };
  try {
    git('git', ['merge-base', '--is-ancestor', baseline, candidate], {
      stdio: 'ignore',
    });
    const raw = git(
      'git',
      ['diff', '--name-only', '-z', '--no-renames', baseline, candidate],
      { encoding: 'buffer' },
    );
    const paths = raw.toString('utf8').split('\0').filter(Boolean);
    return {
      ...classifyPaths(paths),
      evaluated: true,
      reason: 'tree-diff',
      paths,
    };
  } catch {
    return {
      deploy: true,
      evaluated: false,
      reason: 'baseline-or-diff-error',
      paths: [],
    };
  }
}

function escaped(path) {
  return JSON.stringify(path);
}

function main() {
  const candidate = process.env.CI_CANDIDATE_SHA;
  const baseline = process.env.BASELINE_SHA || '';
  const result = compare(baseline, candidate);
  const included = result.included || [];
  const excluded = result.excluded || [];
  const summary = [
    '### Staging path decision',
    `- Decision: **${result.deploy ? 'deploy both services' : 'skip deployment'}** (${result.reason})`,
    `- Baseline SHA: \`${validSha(baseline) ? baseline : 'unavailable'}\``,
    `- Candidate SHA: \`${candidate}\``,
    `- Changed paths: ${result.evaluated ? result.paths.length : 'not evaluated'}; excluded: ${result.evaluated ? excluded.length : 'not evaluated'}; included: ${result.evaluated ? included.length : 'not evaluated'}`,
    ...result.paths
      .slice(0, 30)
      .map(
        (path) =>
          `- ${isExcludedPath(path) ? 'excluded' : 'included'}: ${escaped(path)}`,
      ),
    ...(result.paths.length > 30
      ? [`- Additional paths omitted: ${result.paths.length - 30}`]
      : []),
  ].join('\n');
  process.stdout.write(
    `${JSON.stringify({ deploy: result.deploy, baseline: validSha(baseline) ? baseline : 'unavailable', candidate, reason: result.reason, changed: result.evaluated ? result.paths.length : null, excluded: result.evaluated ? excluded.length : null, included: result.evaluated ? included.length : null })}\n`,
  );
  if (process.env.GITHUB_OUTPUT) {
    require('node:fs').appendFileSync(
      process.env.GITHUB_OUTPUT,
      `deploy=${result.deploy}\nreason=${result.reason}\n`,
    );
  }
  if (process.env.GITHUB_STEP_SUMMARY)
    require('node:fs').appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `${summary}\n`,
    );
}

if (require.main === module) main();
module.exports = { classifyPaths, compare, escaped, isExcludedPath, validSha };
