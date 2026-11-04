# Backend Unit Testing

## 1. Overview

This record describes backend unit-test organization, representative behaviors,
execution, the latest dated result, and known coverage limits. The suite uses
synthetic inputs and mocks to exercise middleware, controllers, schemas,
configuration, and helper behavior. It does not establish behavior against a
live database, SMTP service, or running Express application.

## 2. Testing Strategy

Tests exercise backend behavior at isolated boundaries. They use synthetic
requests, tokens, identifiers, student records, rubric values, and CSV content;
mocked model methods, email transport, and Express `next` callbacks; and schema
validation without saving records. The suite does not require MongoDB, SMTP,
Mailpit, or live server startup. Some test files contain both successful and
rejected outcomes; the case table groups behaviors by purpose, not by exclusive
file-level success/failure classification.

## 3. Test Organization

The unit command selects 16 top-level test files under `src/backend/tests/`;
the separate `integration/` subdirectory is excluded by
[`vitest.config.mjs`](../../../../../src/backend/vitest.config.mjs).

| Test file | Recorded coverage |
| --- | --- |
| [auth.test.js](../../../../../src/backend/tests/auth.test.js) | Missing, valid, invalid, expired, empty, non-Bearer, and whitespace-only authorization-header behavior for `authenticateToken`. |
| [controllerValidation.test.js](../../../../../src/backend/tests/controllerValidation.test.js) | A successful login and validation contracts for authentication, courses, students, teams, reports, roster upload, destructive operations, and the current auto-assignment placeholder. |
| [controllerSuccessPaths.test.js](../../../../../src/backend/tests/controllerSuccessPaths.test.js) | Successful course, roster/student, team, evaluation, and reporting controller behavior with mocked database and email dependencies; also includes CSV escaping and missing-score output. |
| [controllerFailureBoundary.test.js](../../../../../src/backend/tests/controllerFailureBoundary.test.js) | Authentication failures, duplicate and missing records, empty bulk operations, team constraints, invalid/reused evaluation tokens, empty submissions, and empty-state reporting. |
| [csvParsing.test.js](../../../../../src/backend/tests/csvParsing.test.js) | Required roster fields, quoted CSV values, preferred and legacy team columns, blank assignments, and missing values. |
| [models.test.js](../../../../../src/backend/tests/models.test.js) | Required Mongoose fields, defaults, enum/rating constraints, student/course uniqueness index, and evaluation invariants. |
| [rubric.test.js](../../../../../src/backend/tests/rubric.test.js) | Required rubric criteria, score descriptions, score ranges, and overall-feedback limits. |
| [errorHandler.test.js](../../../../../src/backend/tests/errorHandler.test.js) | Standardized custom and default error responses, details, status codes, and timestamps. |
| [authenticationSuccess.test.js](../../../../../src/backend/tests/authenticationSuccess.test.js) | Login token and last-login behavior, password hashing at registration, and login persistence failure. |
| [courseAuthorization.test.js](../../../../../src/backend/tests/courseAuthorization.test.js) | Course ownership checks, malformed IDs, concealed missing/unowned courses, and database-error forwarding. |
| [evaluationSubmission.test.js](../../../../../src/backend/tests/evaluationSubmission.test.js) | Submission validation, duplicate recipients, revoked and repeated submission boundaries, and mocked transaction-session behavior. |
| [integrationTarget.test.js](../../../../../src/backend/tests/integrationTarget.test.js) | Isolated integration-test target and ownership-marker safeguards using stubs. |
| [invitationContent.test.js](../../../../../src/backend/tests/invitationContent.test.js) | Invitation context, links, defaults, deadline presentation, and rejected transport behavior with mocks. |
| [persistenceFailures.test.js](../../../../../src/backend/tests/persistenceFailures.test.js) | Controller failure contracts when mocked persistence operations reject. |
| [reporting.test.js](../../../../../src/backend/tests/reporting.test.js) | Score, grade, curve, team, and individual/team report response calculations. |
| [workflowTransitions.test.js](../../../../../src/backend/tests/workflowTransitions.test.js) | Course preservation, student/team membership, evaluation reset, and course-scoped cleanup transitions with mocks. |

The cases summarize behavior represented by these files; they do not enumerate
every assertion. Regression targets are listed only where a unit assertion
directly matches a matrix scenario. A `unit safeguard` label means the unit
case checks a related rule but does not satisfy the matrix's integration-level
behavior.

<a id="test-cases"></a>

## 4. Test Cases

| ID | Objective | Steps | Expected result | Regression target | Source |
| --- | --- | --- | --- | --- | --- |
| TC-UNIT-BE-001 | Verify missing authorization credentials. | Call `authenticateToken` without an authorization header. | `next` receives a 401 unauthorized error and no user is attached. | — | [auth.test.js](../../../../../src/backend/tests/auth.test.js) |
| TC-UNIT-BE-002 | Verify accepted Bearer authentication. | Call middleware with a valid synthetic Bearer token. | The decoded user is attached to the request and `next` receives no error. | — | [auth.test.js](../../../../../src/backend/tests/auth.test.js) |
| TC-UNIT-BE-003 | Verify rejected token values. | Supply invalid, expired, and empty Bearer tokens. | Each request receives a sanitized 401 error; rejected credentials do not attach a user. | REG-CW01-06 (unit safeguard) | [auth.test.js](../../../../../src/backend/tests/auth.test.js) |
| TC-UNIT-BE-004 | Verify controller input and identifier validation. | Omit required login, registration, course, and student fields; submit malformed identifiers for team membership, report, and destructive student operations. | Missing required values and invalid identifiers forward validation errors. | REG-CW01-03 (missing login credentials only) | [controllerValidation.test.js](../../../../../src/backend/tests/controllerValidation.test.js) |
| TC-UNIT-BE-005 | Verify roster upload requires a file. | Call roster upload without a file. | The controller forwards a validation error. | — | [controllerValidation.test.js](../../../../../src/backend/tests/controllerValidation.test.js) |
| TC-UNIT-BE-006 | Record the current auto-assignment contract. | Call the auto-assignment handler. | The handler returns the explicit not-implemented 501 error. | — | [controllerValidation.test.js](../../../../../src/backend/tests/controllerValidation.test.js) |
| TC-UNIT-BE-007 | Verify supported CSV normalization. | Parse valid rows with quoted values, preferred or legacy team columns, and blank assignments. | Parsed roster fields and team assignments are normalized as expected. | REG-CW03-02 (unit safeguard) | [csvParsing.test.js](../../../../../src/backend/tests/csvParsing.test.js) |
| TC-UNIT-BE-008 | Verify missing roster values remain detectable. | Parse rows missing required values. | Missing values are represented for controller validation rather than treated as complete rows. | — | [csvParsing.test.js](../../../../../src/backend/tests/csvParsing.test.js) |
| TC-UNIT-BE-009 | Verify model required fields and allowed values. | Validate incomplete and representative course, student, team, and evaluation documents. | Required fields, enum values, ratings, and feedback constraints are enforced by schema validation. | — | [models.test.js](../../../../../src/backend/tests/models.test.js) |
| TC-UNIT-BE-010 | Verify model defaults. | Construct new course, team, and student documents without optional state. | Safe active, zero-count, empty-membership, and unevaluated defaults are applied. | — | [models.test.js](../../../../../src/backend/tests/models.test.js) |
| TC-UNIT-BE-011 | Verify participation rating maximum and uniqueness definition. | Validate a participation rating of 5 and inspect the student/course schema index. | Participation value 5 fails against its maximum of 4, and the compound uniqueness index is defined. | — | [models.test.js](../../../../../src/backend/tests/models.test.js) |
| TC-UNIT-BE-012 | Verify rubric consistency. | Inspect required criteria, descriptions for every allowed score, and feedback limits. | Criteria and score descriptions cover the configured ranges; feedback is required with configured length limits. | — | [rubric.test.js](../../../../../src/backend/tests/rubric.test.js) |
| TC-UNIT-BE-013 | Verify standardized error formatting. | Format a custom error and an otherwise empty error. | Custom status, code, message, details, and timestamp are retained; safe defaults are supplied when absent. | — | [errorHandler.test.js](../../../../../src/backend/tests/errorHandler.test.js) |
| TC-UNIT-BE-014 | Verify successful course controller contracts. | Create, list, read, update, and deactivate a course using mocked model methods. | Controller responses and requested model changes match the successful course contracts. | — | [controllerSuccessPaths.test.js](../../../../../src/backend/tests/controllerSuccessPaths.test.js) |
| TC-UNIT-BE-015 | Verify authentication failure boundaries. | Attempt login for an unknown user and wrong password, then register an existing user. | Authentication failures return 401; duplicate registration returns 409. | REG-CW01-02 (unit safeguard) | [controllerFailureBoundary.test.js](../../../../../src/backend/tests/controllerFailureBoundary.test.js) |
| TC-UNIT-BE-016 | Verify authorization-scheme boundaries. | Supply non-Bearer and whitespace-only authorization headers, including a valid JWT under the wrong scheme. | Middleware returns 401 and does not attach a user. | REG-CW01-06 (unit safeguard) | [auth.test.js](../../../../../src/backend/tests/auth.test.js) |
| TC-UNIT-BE-017 | Verify student and roster controller success contracts. | Add, list, update, delete, and bulk-delete students through mocked controller requests. | Successful responses and mocked persistence calls reflect the requested roster operation. | — | [controllerSuccessPaths.test.js](../../../../../src/backend/tests/controllerSuccessPaths.test.js) |
| TC-UNIT-BE-018 | Verify team controller success contracts. | Create, list, update, add/remove membership, and delete teams through mocked requests. | Successful response contracts and mocked team operations reflect each request. | — | [controllerSuccessPaths.test.js](../../../../../src/backend/tests/controllerSuccessPaths.test.js) |
| TC-UNIT-BE-019 | Verify invitation and reminder controller success contracts. | Send course/team invitations and reminders with email utilities mocked. | The controller reports successful dispatch according to mocked email outcomes. | — | [controllerSuccessPaths.test.js](../../../../../src/backend/tests/controllerSuccessPaths.test.js) |
| TC-UNIT-BE-020 | Verify evaluation form, submission, and status success contracts. | Request forms and token status, submit evaluations, and request evaluation status using mocked dependencies. | Successful responses report the expected evaluation data and status. | — | [controllerSuccessPaths.test.js](../../../../../src/backend/tests/controllerSuccessPaths.test.js) |
| TC-UNIT-BE-021 | Verify report download success behavior. | Request a curved report and download CSV containing quoted fields and a student without scores. | The response includes the report contract and correctly escaped CSV with missing scores blank. | — | [controllerSuccessPaths.test.js](../../../../../src/backend/tests/controllerSuccessPaths.test.js) |
| TC-UNIT-BE-022 | Verify course and student failure boundaries. | Request a missing course, add a duplicate student, delete a missing student, and submit an empty bulk-delete request. | Missing and duplicate records return detectable errors; empty bulk deletion is rejected. | — | [controllerFailureBoundary.test.js](../../../../../src/backend/tests/controllerFailureBoundary.test.js) |
| TC-UNIT-BE-023 | Verify team failure boundaries. | Add an already-present member and attempt to delete a populated team. | Duplicate membership and constrained deletion are rejected with conflict errors. | REG-CW04-11 (unit safeguard) | [controllerFailureBoundary.test.js](../../../../../src/backend/tests/controllerFailureBoundary.test.js) |
| TC-UNIT-BE-024 | Verify evaluation and empty-state failure boundaries. | Use invalid/reused tokens, submit no evaluations, and request status, reminders, and reports for empty data. | Invalid, repeated, and empty submissions fail; empty data returns explicit empty-state results. | REG-CW08-05; REG-CW08-09 (unit safeguard; matching rejection cases only) | [controllerFailureBoundary.test.js](../../../../../src/backend/tests/controllerFailureBoundary.test.js) |
| TC-UNIT-BE-025 | Verify successful professor login and registration hashing. | Log in with valid credentials, then register a professor with valid fields. | Login returns a token and persists last-login state; registration stores a derived password hash. | — | [controllerValidation.test.js](../../../../../src/backend/tests/controllerValidation.test.js), [authenticationSuccess.test.js](../../../../../src/backend/tests/authenticationSuccess.test.js) |
| TC-UNIT-BE-026 | Verify login persistence failure response. | Reject saving last-login state during an otherwise successful login. | The handler does not return a usable access token. | — | [authenticationSuccess.test.js](../../../../../src/backend/tests/authenticationSuccess.test.js) |
| TC-UNIT-BE-027 | Verify course ownership middleware boundary. | Supply malformed, owned, absent/unowned course requests and a query failure. | Malformed IDs stop before querying; only a matching owner is attached; absent/unowned data is concealed and failures reach `next`. | REG-CW01-05; REG-CW02-04 (unit safeguard) | [courseAuthorization.test.js](../../../../../src/backend/tests/courseAuthorization.test.js) |
| TC-UNIT-BE-028 | Verify invalid and duplicate evaluation entries are rejected before writes. | Submit incomplete or out-of-range ratings, invalid feedback, and duplicate recipients. | Validation fails before transaction start or evaluation writes. | REG-CW08-04; REG-CW08-10; REG-CW08-11; REG-CW08-12 (unit safeguard; matching input cases only) | [evaluationSubmission.test.js](../../../../../src/backend/tests/evaluationSubmission.test.js) |
| TC-UNIT-BE-029 | Verify mocked transaction and session outcomes. | Submit valid peers, then exercise stale completion, revoked token, and a later save failure. | Valid saves and completion use the same mocked session; stale/revoked cases fail; save failure rejects without a success response. | REG-CW08-07 (mocked session only) | [evaluationSubmission.test.js](../../../../../src/backend/tests/evaluationSubmission.test.js) |
| TC-UNIT-BE-030 | Verify integration-test target safeguards. | Try unsafe environment, URI, database, or ownership markers, then a matching dedicated target. | Unsafe or foreign targets are rejected before access; only the matching target and marker are accepted. | — | [integrationTarget.test.js](../../../../../src/backend/tests/integrationTarget.test.js) |
| TC-UNIT-BE-031 | Verify invitation context and link composition. | Compose invitation messages with course context, configured/default destination, and absent deadline. | Personalized context and encoded links are included; defaults and absent-deadline text are applied. | — | [invitationContent.test.js](../../../../../src/backend/tests/invitationContent.test.js) |
| TC-UNIT-BE-032 | Verify rejected email transport outcome. | Reject an invitation transport send. | The helper returns its failure contract rather than reporting successful delivery. | — | [invitationContent.test.js](../../../../../src/backend/tests/invitationContent.test.js) |
| TC-UNIT-BE-033 | Verify persistence failures propagate without success responses. | Reject representative mocked model operations across course, student, team, evaluation, and report handlers, including token lookups. | The original error reaches `next` as a server error and the response does not claim success. | — | [persistenceFailures.test.js](../../../../../src/backend/tests/persistenceFailures.test.js) |
| TC-UNIT-BE-034 | Verify score, grade, curve, and team calculations. | Calculate report data across evaluated/unevaluated students, multiple received scores, curve boundaries, and populated/empty teams. | Scores, grades, curves, and team means follow the tested calculation rules and handle empty or single-score boundaries. | — | [reporting.test.js](../../../../../src/backend/tests/reporting.test.js) |
| TC-UNIT-BE-035 | Verify individual and team report contracts. | Request individual and team reports with evaluated, unevaluated, and empty records. | Responses include scoped score details and averages, distinguish no evaluations from a failing grade, and avoid division by zero. | — | [reporting.test.js](../../../../../src/backend/tests/reporting.test.js) |
| TC-UNIT-BE-036 | Verify course state transitions. | Reactivate a matching inactive course, search by legacy course numbers and names, and attempt protected course edits. | The matching course is reactivated without duplicate creation; owner filtering remains in the search; protected identity/counter changes are discarded. | REG-CW02-05; REG-CW02-07 (unit safeguard) | [workflowTransitions.test.js](../../../../../src/backend/tests/workflowTransitions.test.js) |
| TC-UNIT-BE-037 | Verify student/team membership transitions. | Edit student details, move or clear team assignment, and delete a student with evaluations. | Membership and counts are updated as tested; protected fields are ignored; dependent evaluations and team links are removed in mocked calls. | REG-CW03-07; REG-CW03-08; REG-CW04-07; REG-CW04-08 (unit safeguard) | [workflowTransitions.test.js](../../../../../src/backend/tests/workflowTransitions.test.js) |
| TC-UNIT-BE-038 | Verify selected-course evaluation reset and cleanup. | Reset evaluation state, trigger token cleanup failure, delete a roster, and clear teams. | Cleanup calls are scoped to the selected course; failure stops later cleanup and does not claim success; tested roster/team links and counts are updated. | — | [workflowTransitions.test.js](../../../../../src/backend/tests/workflowTransitions.test.js) |

Regression targets identify matching unit-level behaviors only. They do not
establish completion of broader regression scenarios or their required service
effects.

## 5. Execution Instructions

Prerequisites: Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`, npm 9 or newer,
and backend dependencies installed. Run the suite from the repository root:

```bash
npm --prefix src/backend test
```

The backend package runs `vitest run` and exits nonzero on an assertion
failure. The integration suite uses a separate configuration and is not
included in this unit command.

<a id="verification-results"></a>

## 6. Test Results

Latest recorded local backend verification: October 31, 2026, revision
`d0088f7`.

| Command | Recorded result | Detailed record |
| --- | --- | --- |
| `npm --prefix src/backend test` | 16 files, 143 tests passed | [October 31 recorded unit results](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/dd7d26d1aa3b4431b6cd477271e19ca8f792435f/docs/Team-P25-02/modernization/implementation/testing/unit-testing.md#test-results) |

The project-level record also reports clean installations and passing unit
suites on Node 22.22.2, 24.15.0, and 26.0.0. Those are historical results.
No local unit-suite run was performed for this document edit. This table does
not report current PR CI results, and a local pass does not establish whether
the corresponding CI check is required before merging.

## 7. Limitations and Remaining Coverage

- Controllers use CommonJS `require()` while tests run through Vitest's
  ESM-compatible execution; direct dependency mocks do not consistently
  intercept CommonJS-loaded modules.
- Loading Mongoose model modules through different paths can cause duplicate
  model-registration errors, and replacing constructors does not reproduce
  all Mongoose behavior.
- The email utility validates SMTP configuration and creates its transport at
  import time, so tests must prepare configuration before loading affected
  controllers.
- Several controllers combine validation, authorization, database queries,
  state changes, response formatting, and email delivery, making isolated
  controller tests difficult without extensive Mongoose mocks.
- Mocked calls and schema checks do not prove MongoDB persistence or indexes
  in a live database, SMTP delivery, transaction rollback, partial-write
  behavior, or cross-request concurrency. Those behaviors require their
  separate integration or end-to-end evidence.
