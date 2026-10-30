/*
 * Map changed paths to existing regression test files. Unknown or shared paths
 * select full suite discovery in CI, so an incomplete map cannot silently omit
 * newly added tests from the broad fallback.
 */
const fs = require('node:fs');
const path = require('node:path');

function discoverTests(directory, pattern) {
  const repositoryRoot = path.resolve(__dirname, '..');
  const root = path.resolve(repositoryRoot, directory);
  const relativeBase = path.isAbsolute(directory) ? root : repositoryRoot;
  const found = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && pattern.test(entry.name))
        found.push(path.relative(relativeBase, absolute));
    }
  }
  visit(root);
  return found.sort();
}

const FRONTEND_TESTS = discoverTests('src/frontend', /\.test\.(js|jsx)$/);
const BACKEND_TESTS = discoverTests('src/backend/tests', /\.test\.js$/).filter(
  (file) => !file.startsWith('src/backend/tests/integration/'),
);

const INTEGRATION_TESTS = discoverTests(
  'src/backend/tests/integration',
  /\.test\.js$/,
);

const E2E_TESTS = discoverTests('tests/e2e', /\.spec\.cjs$/);

function discoverAllTests() {
  return {
    frontendUnit: discoverTests('src/frontend', /\.test\.(js|jsx)$/),
    backendUnit: discoverTests('src/backend/tests', /\.test\.js$/).filter(
      (file) => !file.startsWith('src/backend/tests/integration/'),
    ),
    integration: discoverTests('src/backend/tests/integration', /\.test\.js$/),
    e2e: discoverTests('tests/e2e', /\.spec\.cjs$/),
  };
}

const EMPTY = { frontendUnit: [], backendUnit: [], integration: [], e2e: [] };
// Exact source paths keep similarly named files from accidentally receiving a narrow selection.
const mappings = {
  'src/frontend/pages/LoginPage.jsx': [
    'authentication',
    'authenticationAccess',
    'authorization',
  ],
  'src/frontend/contexts/AuthContext.jsx': [
    'authentication',
    'authenticationAccess',
    'authorization',
  ],
  'src/frontend/pages/CourseManagement.jsx': [
    'courses',
    'roster',
    'priorityRoster',
    'teams',
    'priorityLifecycle',
    'evaluationManagement',
  ],
  'src/frontend/pages/TeamAssignment.jsx': [
    'teams',
    'priorityRoster',
    'authorization',
  ],
  'src/frontend/pages/Reports.jsx': [
    'reports',
    'priorityLifecycle',
    'authorization',
  ],
  'src/backend/controllers/reportController.js': [
    'reports',
    'priorityLifecycle',
    'authenticationAccess',
    'authorization',
  ],
  'src/frontend/pages/StudentEvaluation.jsx': [
    'studentEvaluation',
    'submissionIntegrity',
    'priorityLifecycle',
  ],
  'src/frontend/pages/Settings.jsx': ['accountSupport'],
};
const journeys = {
  'src/frontend/pages/LoginPage.jsx': E2E_TESTS,
  'src/frontend/contexts/AuthContext.jsx': E2E_TESTS,
  'src/frontend/pages/CourseManagement.jsx': [
    'tests/e2e/instructor-setup-launch.spec.cjs',
    'tests/e2e/reset-relaunch.spec.cjs',
    'tests/e2e/results-export.spec.cjs',
  ],
  'src/frontend/pages/TeamAssignment.jsx': [
    'tests/e2e/instructor-setup-launch.spec.cjs',
  ],
  'src/frontend/pages/Reports.jsx': ['tests/e2e/results-export.spec.cjs'],
  'src/backend/controllers/reportController.js': [
    'tests/e2e/results-export.spec.cjs',
  ],
  'src/frontend/pages/StudentEvaluation.jsx': [
    'tests/e2e/student-invitation-submission.spec.cjs',
    'tests/e2e/reset-relaunch.spec.cjs',
  ],
  'src/frontend/pages/Settings.jsx': [],
};
function parseChangedFiles(raw) {
  const input = JSON.parse(raw);
  if (!Array.isArray(input) || !input.length)
    throw new Error('Changed paths must be a nonempty array');
  return input.map((entry) => {
    const record = typeof entry === 'string' ? { path: entry } : entry;
    if (
      !record ||
      typeof record.path !== 'string' ||
      !record.path ||
      record.path.includes('\\') ||
      record.path.startsWith('/') ||
      record.path
        .split('/')
        .some((part) => !part || part === '..' || part === '.')
    )
      throw new Error('Invalid repository path');
    return record;
  });
}
function isDocumentation(file) {
  return (
    /^docs\/.*\.(md|mdx|rst|txt|png|jpe?g|svg|pdf)$/i.test(file) ||
    /^(README|CHANGELOG)(-[a-z0-9-]+)?\.(md|mdx|rst|txt)$/i.test(file) ||
    file === 'LICENSE'
  );
}
function evidence(files) {
  const ids = new Set();
  for (const file of files) {
    const content = fs.readFileSync(
      path.resolve(__dirname, '..', file),
      'utf8',
    );
    for (const match of content.matchAll(/REG-CW\d{2}-\d{2}/g))
      ids.add(match[0]);
  }
  return {
    regressionIds: [...ids].sort(),
    workflowIds: [
      ...new Set([...ids].map((id) => `CW-${id.slice(6, 8)}`)),
    ].sort(),
  };
}
function decision(mode, reason, suites = EMPTY, reasons = []) {
  return {
    ...suites,
    mode,
    reason,
    reasons,
    ...evidence([...suites.integration, ...suites.e2e]),
  };
}
function fullDecision(reason) {
  return decision('full', reason, discoverAllTests(), [reason]);
}
function select(raw) {
  const paths = parseChangedFiles(raw);
  if (
    paths.some(
      (file) =>
        file.deleted ||
        /^(D|R\d*|C\d*|deleted|renamed|copied)$/.test(file.status || '') ||
        file.previousPath ||
        file.previous_filename ||
        !fs.existsSync(path.resolve(__dirname, '..', file.path)),
    )
  )
    return fullDecision(
      'Deleted, renamed, copied, or missing path requires full discovery.',
    );
  if (paths.every((file) => isDocumentation(file.path)))
    return decision(
      'none',
      'Documentation-only change; application tests are not required.',
    );
  if (paths.some((file) => /^(A|added)$/.test(file.status || '')))
    return fullDecision(
      'Added application or test path requires full discovery.',
    );
  const integration = new Set();
  const e2e = new Set();
  const reasons = [];
  for (const { path: file } of paths) {
    if (isDocumentation(file)) continue;
    if (mappings[file]) {
      for (const name of mappings[file])
        integration.add(`src/backend/tests/integration/${name}.test.js`);
      for (const name of journeys[file]) e2e.add(name);
      reasons.push(`${file}: exact feature mapping`);
    } else if (INTEGRATION_TESTS.includes(file)) {
      integration.add(file);
      reasons.push(`${file}: changed integration test`);
    } else if (E2E_TESTS.includes(file)) {
      e2e.add(file);
      reasons.push(`${file}: changed browser test`);
    } else if (FRONTEND_TESTS.includes(file) || BACKEND_TESTS.includes(file))
      reasons.push(`${file}: both complete unit suites run`);
    else
      return fullDecision(
        `Shared, unknown, or ambiguous path requires full discovery: ${file}`,
      );
  }
  return decision(
    'selected',
    'Both complete unit suites and mapped integration/browser tests.',
    {
      frontendUnit: FRONTEND_TESTS,
      backendUnit: BACKEND_TESTS,
      integration: [...integration].sort(),
      e2e: [...e2e].sort(),
    },
    reasons,
  );
}
if (require.main === module) {
  try {
    process.stdout.write(
      `${JSON.stringify(select(process.env.CHANGED_FILES))}\n`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = {
  select,
  discoverTests,
  parseChangedFiles,
  FRONTEND_TESTS,
  BACKEND_TESTS,
  INTEGRATION_TESTS,
  E2E_TESTS,
};
