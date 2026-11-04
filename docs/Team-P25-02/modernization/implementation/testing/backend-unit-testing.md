# Backend Unit Testing Implementation

**Status:** Backend unit-test cases are implemented; service-backed integration coverage remains separate.

## Purpose and Scope

This document records backend unit-test behaviors, organization, cases, the latest dated verification result, and remaining coverage. The initial test in `auth.test.js` was retained and expanded with valid, invalid, and empty-token cases; it is included alongside the additional backend test files documented here.

The tests are intentionally isolated from MongoDB, SMTP, Mailpit, and live
Express startup. They use synthetic in-memory requests, model and email mocks,
CSV files, and mocked Express `next` callbacks where appropriate. Success-path tests and failure/boundary tests are kept in separate files to avoid duplicating their purposes.

## Testing Environment and Tools

| Area | Implementation |
| --- | --- |
| Test runner | Vitest `^5.0.5` using the backend package's default Node environment. |
| Test command | `npm --prefix src/backend test` runs the backend suite once and exits with a failure status when an assertion fails. |
| Unit selection | [`vitest.config.mjs`](../../../../../src/backend/vitest.config.mjs) excludes `tests/integration/**` from ordinary unit, watch, and coverage runs. |
| Test location | Backend tests are stored in `src/backend/tests/` and use `.test.js` filenames. |
| Test data | Synthetic request data, tokens, IDs, student records, rubric values, and CSV content. |
| External services | MongoDB, SMTP, Mailpit, and live server startup are not required for this unit suite. |
| Assertions | Vitest assertions verify response contracts, model constraints, parsing behavior, and middleware outcomes. |

## Test Organization

The current unit command selects 16 top-level test files under `src/backend/tests/`; the separate `integration/` subdirectory is excluded.

| Test file | Coverage |
| --- | --- |
| [`auth.test.js`](../../../../../src/backend/tests/auth.test.js) | The initial missing-token test, retained and expanded with valid, invalid, expired, empty, non-Bearer, and whitespace-only authorization-header behavior for `authenticateToken`. |
| [`controllerValidation.test.js`](../../../../../src/backend/tests/controllerValidation.test.js) | Validation contracts for authentication, courses, students, teams, reports, roster upload, destructive operations, and the current auto-assignment placeholder. |
| [`controllerSuccessPaths.test.js`](../../../../../src/backend/tests/controllerSuccessPaths.test.js) | Successful course, roster/student, team, evaluation, and reporting controller behavior with mocked database and email dependencies. |
| [`controllerFailureBoundary.test.js`](../../../../../src/backend/tests/controllerFailureBoundary.test.js) | Invalid credentials, duplicate and missing records, empty bulk operations, team constraints, invalid/reused evaluation tokens, empty submissions, and empty-state reporting. |
| [`csvParsing.test.js`](../../../../../src/backend/tests/csvParsing.test.js) | Required roster fields, quoted CSV values, preferred and legacy team columns, blank assignments, and missing values. |
| [`models.test.js`](../../../../../src/backend/tests/models.test.js) | Required Mongoose fields, defaults, enum/rating constraints, student/course uniqueness index, and evaluation invariants. |
| [`rubric.test.js`](../../../../../src/backend/tests/rubric.test.js) | Required rubric criteria, score descriptions, score ranges, and overall-feedback limits. |
| [`errorHandler.test.js`](../../../../../src/backend/tests/errorHandler.test.js) | Standardized custom and default error responses, details, status codes, and timestamps. |
| [`authenticationSuccess.test.js`](../../../../../src/backend/tests/authenticationSuccess.test.js) | Login, registration, and persistence-failure contracts with mocked dependencies. |
| [`courseAuthorization.test.js`](../../../../../src/backend/tests/courseAuthorization.test.js) | Course ownership and malformed-ID boundaries. |
| [`evaluationSubmission.test.js`](../../../../../src/backend/tests/evaluationSubmission.test.js) | Submission validation, duplicate recipients, and transaction-session behavior with mocked persistence. |
| [`integrationTarget.test.js`](../../../../../src/backend/tests/integrationTarget.test.js) | Isolated test-target and ownership-marker safeguards using stubs. |
| [`invitationContent.test.js`](../../../../../src/backend/tests/invitationContent.test.js) | Invitation context, links, and rejected transport behavior with mocks. |
| [`persistenceFailures.test.js`](../../../../../src/backend/tests/persistenceFailures.test.js) | Controller failure contracts when mocked persistence operations reject. |
| [`reporting.test.js`](../../../../../src/backend/tests/reporting.test.js) | Score, grade, curve, team, and report response calculations. |
| [`workflowTransitions.test.js`](../../../../../src/backend/tests/workflowTransitions.test.js) | Course, student, team, and evaluation state transitions with mocks. |

Success-path tests cover successful backend behavior; failure and boundary tests cover invalid-input, failure, and edge behavior. `controllerSuccessPaths.test.js` contains
successful response contracts, while `controllerFailureBoundary.test.js` and
`controllerValidation.test.js` contain the coordinated negative and edge
cases. The cases intentionally use separate test names and files so a
successful workflow assertion is not mistaken for validation or failure
coverage. The current failure and boundary cases include invalid credentials, malformed
authorization headers, expired tokens, duplicate and missing records, empty bulk operations,
team membership constraints,
invalid and reused evaluation tokens, empty submissions, and empty report and
reminder states.

The authentication tests reset the test JWT secret before and after each case,
use synthetic tokens only, and assert that rejected requests do not receive a
`req.user` value. This keeps repeated runs isolated and prevents tests from
masking token disclosure or authorization-scheme defects.

## Test Cases

| Test ID | Area | Purpose and expected result | Source |
| --- | --- | --- | --- |
| UNIT-BE-001 | Authentication middleware | A request without an authorization token calls `next` with a 401 unauthorized error. | [`auth.test.js`](../../../../../src/backend/tests/auth.test.js) |
| UNIT-BE-002 | Authentication middleware | A valid bearer token attaches the decoded user payload and calls `next` without an error. | [`auth.test.js`](../../../../../src/backend/tests/auth.test.js) |
| UNIT-BE-003 | Authentication middleware | Invalid, expired, and empty bearer tokens produce a standardized unauthorized error without exposing JWT details. | [`auth.test.js`](../../../../../src/backend/tests/auth.test.js) |
| UNIT-BE-004 | Controller validation | Missing authentication, course, student, team, report, and destructive-operation inputs are rejected with validation errors. | [`controllerValidation.test.js`](../../../../../src/backend/tests/controllerValidation.test.js) |
| UNIT-BE-005 | Controller validation | A roster upload without a file is rejected with a validation error. | [`controllerValidation.test.js`](../../../../../src/backend/tests/controllerValidation.test.js) |
| UNIT-BE-006 | Controller contract | The unimplemented automatic team-assignment endpoint reports its explicit 501 contract. | [`controllerValidation.test.js`](../../../../../src/backend/tests/controllerValidation.test.js) |
| UNIT-BE-007 | CSV processing | Valid roster rows, quoted fields, preferred team names, legacy team columns, and blank assignments are normalized as expected. | [`csvParsing.test.js`](../../../../../src/backend/tests/csvParsing.test.js) |
| UNIT-BE-008 | CSV processing | Missing required roster values remain detectable for controller validation. | [`csvParsing.test.js`](../../../../../src/backend/tests/csvParsing.test.js) |
| UNIT-BE-009 | Model validation | Course, student, team, and evaluation required fields and allowed values are enforced. | [`models.test.js`](../../../../../src/backend/tests/models.test.js) |
| UNIT-BE-010 | Model defaults | New course, team, and student documents receive safe default state and counts. | [`models.test.js`](../../../../../src/backend/tests/models.test.js) |
| UNIT-BE-011 | Model constraints | Evaluation rating limits and the student/course uniqueness index are defined. | [`models.test.js`](../../../../../src/backend/tests/models.test.js) |
| UNIT-BE-012 | Rubric configuration | Required criteria, score descriptions, score ranges, and feedback limits remain internally consistent. | [`rubric.test.js`](../../../../../src/backend/tests/rubric.test.js) |
| UNIT-BE-013 | Error handling | Custom errors preserve status, code, message, details, and a valid timestamp. Empty errors receive safe defaults. | [`errorHandler.test.js`](../../../../../src/backend/tests/errorHandler.test.js) |
| UNIT-BE-014 | Controller success paths | Course, student, team, evaluation, roster, and report controller operations return their successful response contracts while database and email dependencies are mocked. | [`controllerSuccessPaths.test.js`](../../../../../src/backend/tests/controllerSuccessPaths.test.js) |
| UNIT-BE-015 | Failure and boundary paths | Invalid credentials, duplicate/missing records, empty bulk operations, team membership constraints, invalid/reused tokens, empty submissions, and empty report/reminder states return detectable outcomes. | [`controllerFailureBoundary.test.js`](../../../../../src/backend/tests/controllerFailureBoundary.test.js) |
| UNIT-BE-016 | Authentication boundary | Non-Bearer and whitespace-only authorization headers produce the standardized 401 unauthorized contract, even when a valid JWT is supplied with the wrong scheme. | [`auth.test.js`](../../../../../src/backend/tests/auth.test.js) |

The existing `UNIT-BE` case IDs represent grouped testing behaviors established during the initial backend implementation. They do not individually enumerate every assertion or test in the expanded 143-test suite. The Test Organization section identifies all 16 currently documented unit test files.

## Execution Instructions

Run from the repository root:

```bash
npm --prefix src/backend test
```

The backend package runs `vitest run`; a failed assertion exits nonzero. The integration suite uses a separate configuration and is not included in this unit result.

## Verification Results

The latest documented local verification was performed on October 31, 2026,
at revision `d0088f7`.

| Command | Recorded result |
| --- | --- |
| `npm --prefix src/backend test` | 16 files, 143 tests passed |

Source: [October 31 recorded unit results](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/dd7d26d1aa3b4431b6cd477271e19ca8f792435f/docs/Team-P25-02/modernization/implementation/testing/unit-testing.md#test-results).

The project-level record also reports clean installations and passing unit
suites on Node 22.22.2, 24.15.0, and 26.0.0. These are previously recorded
results, not a new execution at this branch's revision. A local pass does
not establish that the corresponding CI check is required before merging.

## Limitations and Remaining Work

### CommonJS dependency loading

Backend controllers use CommonJS `require()` calls while the tests run through
Vitest's ESM-compatible test execution. Directly mocking controller
dependencies did not consistently intercept the CommonJS-loaded models and
utilities.

### Mongoose model initialization

Importing Mongoose model modules through different loading paths during tests
caused duplicate model registration errors such as
`OverwriteModelError`. Directly replacing model constructors also did not
faithfully reproduce the Mongoose behavior used by the controllers.

### Import-time email configuration

The email utility creates its Nodemailer transport while the module is
imported and validates SMTP configuration immediately. Controller tests that
import authentication or evaluation modules can therefore initialize SMTP
behavior before a test can safely replace the dependency. A local SMTP service
must not be required for unit tests.

### Controller responsibilities are combined

Several controllers combine request validation, authorization, Mongoose
queries, state mutation, response formatting, and email delivery in one
function. This makes isolated success-path tests difficult without either
recreating a large portion of the Mongoose API or refactoring production code
to introduce dependency-injection or service boundaries.

### Scope decision

The suite covers deterministic controller response contracts and important
business-rule branches with model and email mocks. It does not claim that
mocked calls prove MongoDB persistence, SMTP delivery, transactionality, or
cross-request concurrency behavior.

### Remaining Backend Coverage

The backend unit suite verifies isolated behavior using mocks and
synthetic data. It includes authorization boundaries, persistence
failure handling, transaction-session interactions, and email
composition, but does not establish their behavior against real
external services.

The following require service-backed verification:

- Authorization enforcement through actual HTTP requests and
  persisted course ownership.
- Email delivery and message capture through Mailpit.
- MongoDB persistence, indexes, transaction rollback, and
  concurrency behavior.
- Database failures involving actual partial writes or
  simultaneous requests.
- Real multipart file uploads and filesystem cleanup under failure.

Some of these behaviors are covered by the separate integration
and E2E suites. Their implementation and verification evidence
are documented in those records.

### Completion assessment

The recorded backend unit-test scope is complete for the cases listed here:

- Backend tests have meaningful assertions.
- Tests use synthetic, repeatable data.
- Success paths are covered separately from failure and boundary paths.
- Database and email dependencies are mocked; no secrets or real student data are used.
- The one-shot backend test command passed in the October 31, 2026 verification at revision `d0088f7`. This documentation reorganization does not establish a new test execution.
- Documentation records the actual command, result, evidence, and remaining integration gaps.

This document does not claim complete production workflow verification.
Integration, regression, end-to-end, and staging health coverage remain
separate testing responsibilities.
