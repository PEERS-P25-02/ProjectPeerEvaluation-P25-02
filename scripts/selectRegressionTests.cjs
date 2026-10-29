/*
 * Map changed paths to existing regression test files. Unknown or shared paths
 * select full suite discovery in CI, so an incomplete map cannot silently omit
 * newly added tests from the broad fallback.
 */
const fs = require('node:fs');
const path = require('node:path');

const FRONTEND_TESTS = [
  'src/frontend/tests/ApiService.test.js',
  'src/frontend/tests/AuthContext.test.jsx',
  'src/frontend/tests/CourseManagement.resetSequencing.test.jsx',
  'src/frontend/tests/CourseManagement.test.jsx',
  'src/frontend/tests/LoginPage.test.jsx',
  'src/frontend/tests/Reports.test.jsx',
  'src/frontend/tests/Settings.test.jsx',
  'src/frontend/tests/StudentEvaluation.test.jsx',
  'src/frontend/tests/TeamAssignment.test.jsx',
];

const BACKEND_TESTS = [
  'src/backend/tests/auth.test.js',
  'src/backend/tests/authenticationSuccess.test.js',
  'src/backend/tests/controllerFailureBoundary.test.js',
  'src/backend/tests/controllerSuccessPaths.test.js',
  'src/backend/tests/controllerValidation.test.js',
  'src/backend/tests/courseAuthorization.test.js',
  'src/backend/tests/csvParsing.test.js',
  'src/backend/tests/errorHandler.test.js',
  'src/backend/tests/evaluationSubmission.test.js',
  'src/backend/tests/integrationTarget.test.js',
  'src/backend/tests/invitationContent.test.js',
  'src/backend/tests/models.test.js',
  'src/backend/tests/persistenceFailures.test.js',
  'src/backend/tests/reporting.test.js',
  'src/backend/tests/rubric.test.js',
  'src/backend/tests/workflowTransitions.test.js',
];

const INTEGRATION_TESTS = [
  'src/backend/tests/integration/accountSupport.test.js',
  'src/backend/tests/integration/authentication.test.js',
  'src/backend/tests/integration/authenticationAccess.test.js',
  'src/backend/tests/integration/authorization.test.js',
  'src/backend/tests/integration/courses.test.js',
  'src/backend/tests/integration/emailIntegration.test.js',
  'src/backend/tests/integration/environment.test.js',
  'src/backend/tests/integration/evaluationManagement.test.js',
  'src/backend/tests/integration/priorityLifecycle.test.js',
  'src/backend/tests/integration/priorityRoster.test.js',
  'src/backend/tests/integration/reports.test.js',
  'src/backend/tests/integration/roster.test.js',
  'src/backend/tests/integration/studentEvaluation.test.js',
  'src/backend/tests/integration/submissionIntegrity.test.js',
  'src/backend/tests/integration/teams.test.js',
];

const E2E_TESTS = [
  'tests/e2e/fixtures.spec.cjs',
  'tests/e2e/instructor-setup-launch.spec.cjs',
  'tests/e2e/reset-relaunch.spec.cjs',
  'tests/e2e/results-export.spec.cjs',
  'tests/e2e/smoke.spec.cjs',
  'tests/e2e/student-invitation-submission.spec.cjs',
];

const ALL = {
  frontendUnit: FRONTEND_TESTS,
  backendUnit: BACKEND_TESTS,
  integration: INTEGRATION_TESTS,
  e2e: E2E_TESTS,
};

const EMPTY = { frontendUnit: [], backendUnit: [], integration: [], e2e: [] };

function decision(mode, reason, suites = EMPTY) {
  return { ...suites, reason, mode };
}

function fullDecision(reason) {
  return decision('full', reason, ALL);
}

function parseChangedFiles(raw) {
  if (typeof raw !== 'string') throw new Error('CHANGED_FILES is missing');
  const input = JSON.parse(raw);
  if (!Array.isArray(input))
    throw new Error('CHANGED_FILES must be a JSON array');
  return input.map((entry) => {
    if (typeof entry === 'string' && entry.trim())
      return { path: entry.trim(), deleted: false };
    if (
      entry &&
      typeof entry === 'object' &&
      typeof entry.path === 'string' &&
      entry.path.trim()
    ) {
      return {
        path: entry.path.trim(),
        deleted:
          entry.deleted === true ||
          entry.status === 'deleted' ||
          entry.status === 'D',
      };
    }
    throw new Error(
      'CHANGED_FILES entries must be non-empty paths or path objects',
    );
  });
}

function normalizePath(filePath) {
  const normalized = filePath.replaceAll('\\', '/').replace(/^\.\//, '');
  if (normalized.startsWith('/') || normalized.split('/').includes('..')) {
    throw new Error(`path is not repository-relative: ${filePath}`);
  }
  return normalized;
}

function isDocumentation(filePath) {
  return (
    filePath.startsWith('docs/') ||
    filePath === 'docs' ||
    /^LICENSE$/i.test(filePath) ||
    /^(README|CHANGELOG)(-[a-z0-9-]+)?\.(md|mdx|rst|txt)$/i.test(filePath) ||
    /^docs?\/.*\.(md|mdx|rst|png|jpe?g|svg)$/i.test(filePath)
  );
}

function emptySelection() {
  return fullDecision(
    'No changed paths were supplied; running all suites fail-closed.',
  );
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function select(changed, environment = {}) {
  const event =
    environment.CI_EVENT_NAME ||
    environment.GITHUB_EVENT_NAME ||
    environment.EVENT_NAME ||
    '';
  const branch =
    environment.CI_BRANCH ||
    environment.GITHUB_REF_NAME ||
    environment.BRANCH_NAME ||
    '';

  if (event === 'push' && branch === 'main')
    return fullDecision('Push to main runs every regression suite.');

  let files;
  try {
    files = parseChangedFiles(changed);
  } catch (error) {
    return fullDecision(
      `Invalid changed-file input; running all suites fail-closed (${error.message}).`,
    );
  }
  if (files.length === 0) return emptySelection();

  const paths = [];
  try {
    for (const file of files)
      paths.push({ ...file, path: normalizePath(file.path) });
  } catch (error) {
    return fullDecision(
      `Invalid repository path; running all suites fail-closed (${error.message}).`,
    );
  }

  if (
    paths.some(
      (file) =>
        file.deleted ||
        !fs.existsSync(path.resolve(__dirname, '..', file.path)),
    )
  ) {
    return fullDecision(
      'A deleted path may remove a selected test or application behavior; running all suites.',
    );
  }
  if (paths.every((file) => isDocumentation(file.path))) {
    return decision(
      'none',
      'Documentation-only changes do not select automated regression suites.',
    );
  }

  const selected = {
    frontendUnit: new Set(),
    backendUnit: new Set(),
    integration: new Set(),
    e2e: new Set(),
  };
  const selectExistingTest = (suite, testPath) => {
    if (!ALL[suite].includes(testPath)) return false;
    selected[suite].add(testPath);
    return true;
  };

  for (const { path } of paths) {
    if (isDocumentation(path)) continue;

    if (path.startsWith('src/frontend/tests/')) {
      if (!selectExistingTest('frontendUnit', path))
        return fullDecision(`Unknown frontend test path: ${path}.`);
      continue;
    }
    if (path.startsWith('src/backend/tests/integration/')) {
      if (!selectExistingTest('integration', path))
        return fullDecision(`Unknown integration test path: ${path}.`);
      continue;
    }
    if (path.startsWith('src/backend/tests/')) {
      if (!selectExistingTest('backendUnit', path))
        return fullDecision(`Unknown backend test path: ${path}.`);
      continue;
    }
    if (path.startsWith('tests/e2e/')) {
      if (!selectExistingTest('e2e', path))
        return fullDecision(`Unknown E2E test path: ${path}.`);
      continue;
    }

    if (
      /^(package(-lock)?\.json|src\/backend\/package(-lock)?\.json|\.github\/.*|.*workflow.*|scripts\/selectRegressionTests\.(cjs|test\.cjs))$/.test(
        path,
      )
    ) {
      return fullDecision(`Shared dependency or CI selector change: ${path}.`);
    }
    if (
      /^(src\/backend\/(models|middleware|routes|utils|config)\/|src\/backend\/(index\.js|tests\/helpers\/|scripts\/runIntegrationTests\.js|vitest.*\.mjs))/.test(
        path,
      )
    ) {
      return fullDecision(
        `Shared backend behavior or test infrastructure changed: ${path}.`,
      );
    }

    if (path.startsWith('src/frontend/')) {
      const featureTests = {
        AuthContext: [['src/frontend/tests/AuthContext.test.jsx'], E2E_TESTS],
        LoginPage: [['src/frontend/tests/LoginPage.test.jsx'], E2E_TESTS],
        CourseManagement: [
          [
            'src/frontend/tests/CourseManagement.test.jsx',
            'src/frontend/tests/CourseManagement.resetSequencing.test.jsx',
          ],
          [
            'tests/e2e/instructor-setup-launch.spec.cjs',
            'tests/e2e/reset-relaunch.spec.cjs',
          ],
        ],
        Reports: [
          ['src/frontend/tests/Reports.test.jsx'],
          ['tests/e2e/results-export.spec.cjs'],
        ],
        Settings: [['src/frontend/tests/Settings.test.jsx'], []],
        StudentEvaluation: [
          ['src/frontend/tests/StudentEvaluation.test.jsx'],
          ['tests/e2e/student-invitation-submission.spec.cjs'],
        ],
        TeamAssignment: [
          ['src/frontend/tests/TeamAssignment.test.jsx'],
          ['tests/e2e/instructor-setup-launch.spec.cjs'],
        ],
        'services/api': [FRONTEND_TESTS, E2E_TESTS],
        'services/login': [
          ['src/frontend/tests/ApiService.test.js'],
          E2E_TESTS,
        ],
      };
      const matching = Object.entries(featureTests).find(([feature]) =>
        path.includes(feature),
      );
      if (!matching) return fullDecision(`Unmapped frontend path: ${path}.`);
      matching[1][0].forEach((test) => selected.frontendUnit.add(test));
      matching[1][1].forEach((test) => selected.e2e.add(test));
      continue;
    }

    if (path === 'src/backend/controllers/reportController.js') {
      // Reports have a bounded API surface; include its authorization boundary
      // and browser export journey alongside the report-specific assertions.
      [
        'src/backend/tests/controllerSuccessPaths.test.js',
        'src/backend/tests/controllerFailureBoundary.test.js',
        'src/backend/tests/controllerValidation.test.js',
        'src/backend/tests/persistenceFailures.test.js',
        'src/backend/tests/reporting.test.js',
      ].forEach((test) => selected.backendUnit.add(test));
      [
        'src/backend/tests/integration/reports.test.js',
        'src/backend/tests/integration/authorization.test.js',
        'src/backend/tests/integration/authenticationAccess.test.js',
      ].forEach((test) => selected.integration.add(test));
      selected.e2e.add('tests/e2e/results-export.spec.cjs');
      continue;
    }

    if (path.startsWith('src/backend/controllers/')) {
      return fullDecision(
        `Backend controller changes can affect connected workflows: ${path}.`,
      );
    }

    return fullDecision(`Unknown application or configuration path: ${path}.`);
  }

  const result = Object.fromEntries(
    Object.entries(selected).map(([suite, tests]) => [
      suite,
      uniqueSorted([...tests]),
    ]),
  );
  const count = Object.values(result).reduce(
    (total, tests) => total + tests.length,
    0,
  );
  if (count === 0)
    return fullDecision(
      'No safe narrow mapping was found; running all suites fail-closed.',
    );
  return decision(
    'selected',
    `Selected ${count} test file(s) from ${paths.length} changed path(s).`,
    result,
  );
}

if (require.main === module) {
  const result = select(process.env.CHANGED_FILES, process.env);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

module.exports = {
  select,
  parseChangedFiles,
  FRONTEND_TESTS,
  BACKEND_TESTS,
  INTEGRATION_TESTS,
  E2E_TESTS,
};
