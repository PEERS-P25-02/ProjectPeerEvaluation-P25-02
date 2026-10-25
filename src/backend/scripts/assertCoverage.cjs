/*
 * This check helps catch backend coverage reports that omit application files
 * or fail to show selected controller paths were exercised.
 *
 * It validates report contents and source mappings; it does not run tests or
 * calculate a coverage percentage.
 *
 * TLDR: compares the report file manifest with backend app sources and checks
 * mapped function, callback, and branch counters for required controller paths.
 */
const fs = require('node:fs');
const path = require('node:path');

const reportPath =
  process.argv[2] ||
  path.join(__dirname, '..', 'coverage', 'coverage-final.json');
const backendRoot = path.resolve(__dirname, '..');

function normalizedPath(file) {
  return path.resolve(file).replaceAll('\\', '/');
}

function fail(message) {
  console.error(`Coverage artifact check failed: ${message}`);
  process.exitCode = 1;
}

function validCounter(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  );
}

if (!fs.existsSync(reportPath)) {
  fail(`missing ${path.relative(process.cwd(), reportPath)}`);
  process.exit();
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

function fileEntry(relativeFile) {
  const expectedPath = normalizedPath(path.join(backendRoot, relativeFile));
  const entry = Object.entries(report).find(
    ([file]) => normalizedPath(file) === expectedPath,
  );
  if (!entry) {
    throw new Error(`coverage report does not include ${relativeFile}`);
  }
  return entry;
}

function appSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return appSourceFiles(absolutePath);
    }
    const relativePath = path.relative(backendRoot, absolutePath);
    const normalizedRelativePath = relativePath.replaceAll('\\', '/');
    if (
      !entry.isFile() ||
      !relativePath.endsWith('.js') ||
      normalizedRelativePath === 'routes/testData.js' ||
      normalizedRelativePath.split('/').includes('tests') ||
      /\.test\.js$/.test(relativePath)
    ) {
      return [];
    }
    return [normalizedPath(absolutePath)];
  });
}

// Build the denominator from production modules so unimported app code cannot disappear from coverage.
function expectedAppSourceFiles() {
  return [
    normalizedPath(path.join(backendRoot, 'index.js')),
    ...[
      'config',
      'controllers',
      'middleware',
      'models',
      'routes',
      'utils',
    ].flatMap((directory) => appSourceFiles(path.join(backendRoot, directory))),
  ].sort();
}

// Reject missing or extra report entries so the measured application scope stays fixed.
function verifyAppSourceManifest() {
  const expected = expectedAppSourceFiles();
  const actual = Object.keys(report).map(normalizedPath).sort();
  if (
    expected.length !== actual.length ||
    expected.some((file, index) => file !== actual[index])
  ) {
    const missing = expected.filter((file) => !actual.includes(file));
    const unexpected = actual.filter((file) => !expected.includes(file));
    throw new Error(
      `app source manifest mismatch (missing: ${missing.join(', ') || 'none'}; unexpected: ${unexpected.join(', ') || 'none'})`,
    );
  }
}

function sourceLine(file, pattern) {
  const source = fs.readFileSync(file, 'utf8');
  const lineIndex = source
    .split(/\r?\n/)
    .findIndex((line) => pattern.test(line));
  if (lineIndex < 0) {
    throw new Error(`could not find source declaration in ${file}`);
  }
  return lineIndex + 1;
}

// Match a named CommonJS export to its source location before checking V8's function count.
function mappedFunction(fileSuffix, exportName, expectedCount) {
  const [file, coverage] = fileEntry(fileSuffix);
  const expectedLine = sourceLine(
    file,
    new RegExp(`exports\\.${exportName}\\s*=`),
  );
  const functionEntries = Object.entries(coverage.fnMap).filter(
    ([, fn]) => fn.loc.start.line === expectedLine,
  );
  if (functionEntries.length !== 1) {
    throw new Error(
      `${fileSuffix} exports.${exportName} at line ${expectedLine} must have one mapped function entry; found ${functionEntries.length}`,
    );
  }
  const [id, fn] = functionEntries[0];
  const count = coverage.f[id];
  if (
    !validCounter(count) ||
    (expectedCount === 0 ? count !== 0 : count <= 0)
  ) {
    throw new Error(
      `${fileSuffix} exports.${exportName} at line ${expectedLine} must map to a ${expectedCount === 0 ? 'zero' : 'positive'} function count; got ${count}`,
    );
  }
  return { file, coverage, fn };
}

// Check callback coverage by source line when a callback is not a named export.
function mappedFunctionAtSource(fileSuffix, pattern, expectedCount) {
  const [file, coverage] = fileEntry(fileSuffix);
  const line = sourceLine(file, pattern);
  const functionEntries = Object.entries(coverage.fnMap).filter(
    ([, fn]) => fn.loc.start.line === line,
  );
  if (functionEntries.length !== 1) {
    throw new Error(
      `${fileSuffix} callback at line ${line} must have one mapped function entry; found ${functionEntries.length}`,
    );
  }
  const [id] = functionEntries[0];
  const count = coverage.f[id];
  if (
    !validCounter(count) ||
    (expectedCount === 0 ? count !== 0 : count <= 0)
  ) {
    throw new Error(
      `${fileSuffix} callback at line ${line} must map to a ${expectedCount === 0 ? 'zero' : 'positive'} function count; got ${count}`,
    );
  }
}

try {
  // Keep the denominator anchored to app source, including files not loaded by
  // the unit suite, while excluding fixture and maintenance-only modules.
  verifyAppSourceManifest();

  // These body-line checks catch regressions where V8 reports statements but
  // loses the called CommonJS function during source-map remapping.
  mappedFunction('controllers/courseController.js', 'createCourse', 1);
  mappedFunction('controllers/courseController.js', 'listCourses', 1);
  mappedFunction('controllers/courseController.js', 'getCourse', 1);
  mappedFunction('controllers/courseController.js', 'updateCourse', 1);
  mappedFunction('controllers/courseController.js', 'deleteCourse', 1);
  mappedFunction('controllers/courseController.js', 'migrateCourses', 0);
  mappedFunction('controllers/studentController.js', 'bulkDeleteStudents', 1);

  // listCourses executes its three callbacks with the current success fixture.
  mappedFunctionAtSource(
    'controllers/courseController.js',
    /courses\.map\(\(c\) =>/,
    1,
  );
  mappedFunctionAtSource(
    'controllers/courseController.js',
    /teamCounts\.forEach\(\(tc\) =>/,
    1,
  );
  mappedFunctionAtSource(
    'controllers/courseController.js',
    /courses = courses\.map\(\(course\) =>/,
    1,
  );

  const { coverage, fn } = mappedFunction(
    'controllers/courseController.js',
    'getCourse',
    1,
  );
  const hasHitBranch = Object.entries(coverage.branchMap).some(
    ([id, branch]) => {
      const line = branch.loc.start.line;
      return (
        line >= fn.loc.start.line &&
        line <= fn.loc.end.line &&
        coverage.b[id].some((count) => count > 0)
      );
    },
  );
  if (!hasHitBranch) {
    throw new Error(
      'getCourse has no mapped branch hit from the success-path test',
    );
  }

  console.log(
    'Coverage artifact checks passed: called, uncalled, and branch mappings are present.',
  );
} catch (error) {
  fail(error.message);
}
