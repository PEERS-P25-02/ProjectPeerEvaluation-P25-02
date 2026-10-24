# Backend Coverage Tooling Fix

**Updated:** October 24, 2026
**Status:** Implemented and verified locally on base `4a731b03677ae327f402de881db3d66bd21cbef5`

## Finding

The backend's default `npm --prefix src/backend run test:coverage` command
passed all 49 tests but did not reliably count executed CommonJS controller
functions. Before the fix, `controllerSuccessPaths.test.js` called
`courseController.createCourse` successfully. Its source body had hit statement
counters, while the function entry mapped to `courseController.js:81` remained
zero. This made function coverage untrustworthy even though the test itself
passed.

The test suite mixed CommonJS `createRequire` with dynamic and static ESM
imports of the CommonJS controllers. Changing those controller test imports to
`createRequire` retained the same requests, dependency stubs, and assertions,
and restored function counts at the corresponding source declarations. No
production modules, coverage counters, or dependencies were changed.

## Measurement Configuration

`src/backend/vitest.coverage.config.mjs` provides a dedicated coverage run so
the default backend test command remains isolated. It preserves Vitest's
default test discovery and exclusions within the backend root, adds exclusions
for future integration-test paths, and uses the Node environment. The coverage
denominator includes `src/backend/index.js` and
JavaScript below `config`, `controllers`, `middleware`, `models`, `routes`, and
`utils`, including unexecuted application files. It excludes tests, the
`testData` route fixture, migrations, scripts, `debug_student.js`, and
`test_api.js`.

Run from the repository root:

```sh
npm --prefix src/backend run test:coverage
```

The command emits text, HTML, LCOV, and JSON reports in the ignored
`src/backend/coverage/` directory. The configured reporters also emit `coverage-summary.json` for future baseline
consumers. The command then runs `src/backend/scripts/assertCoverage.cjs` to
check the report artifact and exact expected source manifest; it enforces no
percentage threshold. The guard
requires positive mapped function counts for the five course operations
exercised by the suite, positive coverage for
`studentController.bulkDeleteStudents`, a mapped branch hit in `getCourse`,
and zero for the uncalled `migrateCourses` endpoint. It also checks that the
three `listCourses` callbacks exercised by the fixture map to positive
function counts. The uncalled control is fixture-relative: if a future unit
test calls `migrateCourses`, update that assertion to expect a positive count
instead of excluding or suppressing the function. Negative
controls verify that a report copy with `createCourse` set to zero, the
uncalled function set positive, the root entry removed, or an unexpected
fixture added fails the guard.

## Verification

The fixed coverage command and the ordinary service-free backend test command
each passed all 9 test files and 49 tests. The post-fix whole-backend report
contains 30 application files and these raw V8 counts:

| Metric | Covered / total |
| --- | ---: |
| Statements | 811 / 1,524 |
| Branches | 293 / 679 |
| Functions | 85 / 123 |
| Lines | 803 / 1,510 |

The called course exports `createCourse`, `listCourses`, `getCourse`,
`updateCourse`, and `deleteCourse` map to positive function counts; the
independent student-controller check is positive; `migrateCourses` remains at
zero. Independent review rejected eight defective report inputs: a zeroed called
function, missing or nonnumeric counters, a positive uncalled function, a missing
entrypoint, an unexpected fixture, duplicate function mappings, and a missing
report. Each guard check exited 1; the actual report remained untouched and
passed. Strict repository ESLint (`--max-warnings=0`), formatting, and
`git diff --check` passed.

The original default run's aggregate counts were statements 513/1,367,
branches 197/643, functions 52/111, and lines 508/1,356. Those values use a
different, incomplete denominator and must not be compared to the corrected
whole-backend report as a coverage increase. The corrected report is diagnostic
whole-application coverage; it does not define the priority-workflow source
denominator or establish coverage floors. That scope mapping remains separate.
