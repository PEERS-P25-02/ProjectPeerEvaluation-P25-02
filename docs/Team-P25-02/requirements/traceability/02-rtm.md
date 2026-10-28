# RTM

The recorded October 26, 2026 local integration results are two full runs passing 176 tests in 12 files with cleanup verified. This is historical execution evidence for the documented application and test sources; these earlier results are retained separately from the October 28 combined follow-up. It is not browser E2E, hosted integration CI, external email delivery, or code-coverage evidence. See the [API/database integration record](../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review), [authentication and authorization record](../../modernization/implementation/testing/authentication-authorization-integration.md), and [email integration record](../../modernization/implementation/testing/email-integration.md).

<table>
<tr>
<td>Requirement ID</td>
<td>Type</td>
<td>Requirement</td>
<td>Priority</td>
<td>Source</td>
<td>Design / Component</td>
<td>Implementation / Artifact</td>
<td>Test Case ID(s)</td>
<td>Verification Method</td>
<td>Status</td>
<td>Evidence / Link</td>
<td>Related Defect</td>
<td>Notes</td>
</tr>
<tr>
<td>FR-01</td>
<td>Functional</td>
<td>The system shall allow an authorized professor to authenticate and access professor functions.</td>
<td>High</td>
<td>Client</td>
<td>Authentication / Authorization</td>
<td><a href="../../../../src/backend/middleware/auth.js">Authentication middleware</a>; <a href="../../../../src/backend/tests/auth.test.js">Backend authentication test</a></td>
<td>UNIT-BE-001; UNIT-BE-002; UNIT-BE-003; UNIT-BE-014; UNIT-BE-015; UNIT-FE-001; OP-33-01; OP-33-34 through OP-33-36; REG-CW01-06</td>
<td>Unit Test + Integration Test + End-to-End Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/unit-testing.md#initial-test-results">Initial recorded results</a>; <a href="../../modernization/implementation/testing/frontend-unit-test-validation.md#frontend-unit-test-cases">Frontend validation</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Four persisted-login and eight account-support integration cases are recorded. Credential-boundary and protected-route assertions are covered by the authentication/authorization suite. Browser owner login and course access are exercised by the E2E fixture journey; see the <a href="../../modernization/implementation/testing/end-to-end-testing.md">E2E record</a>, <a href="../../modernization/implementation/testing/authentication-authorization-integration.md">authentication and authorization record</a>, and <a href="../../modernization/implementation/testing/regression-coverage-gaps.md">coverage gap inventory</a>.</td>
</tr>
<tr>
<td>FR-02</td>
<td>Functional</td>
<td>The system shall allow a professor to create and manage courses.</td>
<td>High</td>
<td>Client</td>
<td>Course Management</td>
<td><a href="../../../../src/backend/controllers/courseController.js">Course controller</a>; <a href="../../../../src/backend/models/Course.js">Course model</a></td>
<td>UNIT-BE-004; UNIT-BE-009; UNIT-BE-010; UNIT-BE-014; UNIT-BE-015; API-33-01 through API-33-07; OP-33-02 through OP-33-06; REG-CW02-01; REG-CW02-04; REG-CW02-05; REG-CW02-06; REG-CW02-07; REG-CW02-03</td>
<td>Unit Test + Integration Test + Functional Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md">API/database cases and results</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Seven course integration cases cover create, read/filter, update, deactivate/reactivate, and rejected writes. The instructor browser journey creates a course and verifies its list visibility after reload; it does not cover all management actions in one browser workflow. Authorization tests cover cross-professor boundaries. See the <a href="../../modernization/implementation/testing/end-to-end-testing.md">E2E record</a> and <a href="../../modernization/implementation/testing/regression-coverage-gaps.md">coverage gap inventory</a> for selected browser evidence and remaining partial targets. See the <a href="../../modernization/implementation/testing/api-database-integration.md#6-priority-workflow-regression-follow-up">October 28 priority integration cases/results</a>: the historical PR #134 baseline includes failures; the combined source subsequently passed all 200 integration tests with cleanup verified.</td>
</tr>
<tr>
<td>FR-03</td>
<td>Functional</td>
<td>The system shall allow a professor to upload and process a student roster from a CSV file.</td>
<td>High</td>
<td>Client</td>
<td>Roster Management / CSV Processing</td>
<td><a href="../../../../src/backend/controllers/courseController.js">Course controller</a>; <a href="../../../../src/backend/controllers/studentController.js">CSV roster parsing</a></td>
<td>UNIT-BE-004; UNIT-BE-005; UNIT-BE-007; UNIT-BE-008; UNIT-BE-013; UNIT-BE-014; UNIT-BE-015; OP-33-07 through OP-33-13; REG-CW03-01; REG-CW03-02; REG-CW03-04; REG-CW03-05; REG-CW03-07 through REG-CW03-10; REG-CW03-03; REG-CW03-06; REG-CW03-11</td>
<td>Unit Test + Integration Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td><a href="../../known-bugs.md#bug-019-csv-processing-failures-omit-partial-import-errors">BUG-019</a></td>
<td>Twelve roster cases cover multipart import, persistence/relationships, edits, deletes, clearing, and rejected writes. The instructor browser journey uploads a synthetic roster and verifies persisted team organization after reload. A foreign-professor upload denial is covered. Priority integration assertions now cover malformed rows, processing failure and manual creation; undisclosed processing errors were reproduced on the historical PR #134 baseline and are repaired and passed the focused and full combined integration runs. See the <a href="../../modernization/implementation/testing/end-to-end-testing.md">E2E record</a> and <a href="../../modernization/implementation/testing/regression-coverage-gaps.md">coverage gap inventory</a>. See the <a href="../../modernization/implementation/testing/api-database-integration.md#6-priority-workflow-regression-follow-up">October 28 priority integration cases/results</a>: the historical PR #134 baseline includes failures; the combined source subsequently passed all 200 integration tests with cleanup verified.</td>
</tr>
<tr>
<td>FR-04</td>
<td>Functional</td>
<td>The system shall allow students to be organized into course teams.</td>
<td>High</td>
<td>Client</td>
<td>Team Management</td>
<td><a href="../../../../src/backend/controllers/teamController.js">Team controller</a>; <a href="../../../../src/backend/models/Team.js">Team model</a></td>
<td>UNIT-BE-004; UNIT-BE-006; UNIT-BE-009; UNIT-BE-010; UNIT-BE-014; UNIT-BE-015; OP-33-14 through OP-33-20; REG-CW04-02 through REG-CW04-09; REG-CW04-11; REG-CW04-10</td>
<td>Unit Test + Integration Test + Functional Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Thirteen team integration cases cover CRUD, membership changes, counts, constraints, and course isolation. The instructor browser journey reorganizes uploaded students into teams and verifies persisted assignments after reload; other team operations remain integration-tested, not part of that browser journey. Cross-course child-resource denial is covered by authorization tests. See the <a href="../../modernization/implementation/testing/end-to-end-testing.md">E2E record</a>, <a href="../../modernization/implementation/testing/authentication-authorization-integration.md">authentication and authorization record</a>, and <a href="../../modernization/implementation/testing/regression-coverage-gaps.md">coverage gap inventory</a>. See the <a href="../../modernization/implementation/testing/api-database-integration.md#6-priority-workflow-regression-follow-up">October 28 priority integration cases/results</a>: the historical PR #134 baseline includes failures; the combined source subsequently passed all 200 integration tests with cleanup verified.</td>
</tr>
<tr>
<td>FR-05</td>
<td>Functional</td>
<td>The system shall allow a professor to create and distribute a peer-evaluation activity.</td>
<td>High</td>
<td>Client</td>
<td>Evaluation Management / Distribution</td>
<td><a href="../../../../src/backend/models/Evaluation.js">Evaluation model</a>; <a href="../../../../src/backend/controllers/evaluationController.js">Evaluation controller</a></td>
<td>UNIT-BE-009; UNIT-BE-011; UNIT-BE-012; UNIT-BE-013; UNIT-BE-014; UNIT-BE-015; OP-33-21 through OP-33-25; REG-CW05-03; REG-CW05-06; REG-CW05-10; REG-CW05-02; REG-CW05-04</td>
<td>Unit Test + Integration Test + End-to-End Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td><a href="../../known-bugs.md#bug-020-evaluation-reset-retains-completed-student-flags">BUG-020</a></td>
<td>Eight evaluation-management cases cover invitations, completion status, reminders, and reset using persisted state and captured SMTP. The browser suite exercises instructor launch and reset/relaunch using captured invitations; reset-prompt details remain outside the asserted journey. Cross-professor access and foreign-team invitation denial are covered. SMTP acceptance is not external delivery. See the <a href="../../modernization/implementation/testing/end-to-end-testing.md">E2E record</a>, <a href="../../modernization/implementation/testing/email-integration.md">email integration record</a>, and <a href="../../modernization/implementation/testing/regression-coverage-gaps.md">coverage gap inventory</a>. See the <a href="../../modernization/implementation/testing/api-database-integration.md#6-priority-workflow-regression-follow-up">October 28 priority integration cases/results</a>: the historical PR #134 baseline includes failures; the combined source subsequently passed all 200 integration tests with cleanup verified.</td>
</tr>
<tr>
<td>FR-06</td>
<td>Functional</td>
<td>The system shall generate individualized evaluation access links or tokens for eligible students.</td>
<td>High</td>
<td>Client</td>
<td>Evaluation Management / Token Generation</td>
<td><a href="../../../../src/backend/controllers/evaluationController.js">Evaluation controller</a></td>
<td>UNIT-BE-014; UNIT-BE-015; OP-33-21; OP-33-22; OP-33-26 through OP-33-28; REG-CW06-02; REG-CW07-01; REG-CW07-02; REG-CW06-03; REG-CW06-04</td>
<td>Unit Test + Integration Test + End-to-End Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Student-evaluation and email cases check assigned-token association, API context, captured personalized links, and intended recipients. Browser tests follow captured invitations and verify assigned-student submission and persisted responses. Priority integration assertions reject an altered assigned token and bind saved evaluator/course identity to its token despite forged request context. Broader token uniqueness, entropy, expiry, and cross-token security remain unverified; see the <a href="../../modernization/implementation/testing/end-to-end-testing.md">E2E record</a>, <a href="../../modernization/implementation/testing/email-integration.md">email integration record</a>, and <a href="../../modernization/implementation/testing/regression-coverage-gaps.md">coverage gap inventory</a>. See the <a href="../../modernization/implementation/testing/api-database-integration.md#6-priority-workflow-regression-follow-up">October 28 priority integration cases/results</a>: the historical PR #134 baseline includes failures; the combined source subsequently passed all 200 integration tests with cleanup verified.</td>
</tr>
<tr>
<td>FR-07</td>
<td>Functional</td>
<td>The system shall support evaluation invitations and reminders through the configured email service.</td>
<td>High</td>
<td>Client</td>
<td>Evaluation Management / Email Service</td>
<td><a href="../../../../src/backend/controllers/evaluationController.js">Evaluation controller</a>; <a href="../../../../src/backend/utils/emailUtils.js">Email utilities</a></td>
<td>UNIT-BE-014; OP-33-21; OP-33-22; OP-33-24; REG-CW07-01 through REG-CW07-04</td>
<td>Integration Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Email cases check captured invitation content/links, recipient selection, deterministic SMTP rejection, retry, and acceptance-state handling. Evidence establishes local Mailpit acceptance, not external provider delivery or browser navigation. See the <a href="../../modernization/implementation/testing/email-integration.md">email integration record</a>.</td>
</tr>
<tr>
<td>FR-08</td>
<td>Functional</td>
<td>The system shall allow a student to submit a peer evaluation through the assigned link.</td>
<td>High</td>
<td>Client</td>
<td>Student Evaluation / Submission</td>
<td><a href="../../../../src/backend/models/Evaluation.js">Evaluation model</a>; <a href="../../../../src/backend/controllers/evaluationController.js">Evaluation controller</a></td>
<td>UNIT-BE-009; UNIT-BE-011; UNIT-BE-012; UNIT-BE-014; UNIT-BE-015; OP-33-26 through OP-33-28; REG-CW08-02 through REG-CW08-13</td>
<td>Unit Test + Integration Test + End-to-End Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td><a href="../../known-bugs.md#bug-018-evaluation-submissions-can-persist-partial-or-duplicate-responses">BUG-018</a></td>
<td>Ten student-evaluation integration cases cover form context, submission/persistence, completion, repeat submission, and invalid requests. Browser coverage checks one assigned invitation submission, stored response values, repeat rejection, and invalid links. Authorization tests also reject self, foreign-course, and different-team recipients before writes. New submission integrity cases assert duplicate-recipient rejection, later-entry rating/feedback validation, concurrent submission coherence, and database write rollback with corrected retries. PR #137 at <code>649dc6f</code> recorded 12 focused and 188 full integration passes with cleanup verified on October 28, 2026. The combined PR #134 source reuses those assertions and adds participation-0/communication-0 cases; the 24 focused and 200 full integration checks passed with cleanup verified; see <a href="../../modernization/implementation/testing/api-database-integration.md#5-submission-integrity">the submission integrity record</a>. See the <a href="../../modernization/implementation/testing/end-to-end-testing.md">E2E record</a>, <a href="../../modernization/implementation/testing/authentication-authorization-integration.md">authentication and authorization record</a>, and <a href="../../modernization/implementation/testing/regression-coverage-gaps.md">coverage gap inventory</a>.</td>
</tr>
<tr>
<td>FR-09</td>
<td>Functional</td>
<td>The system shall store course, roster, team, evaluation, and response data in MongoDB.</td>
<td>High</td>
<td>Client</td>
<td>MongoDB / Data Persistence</td>
<td><a href="../../../../src/backend/tests/integration">API/database integration suites</a></td>
<td>OP-33-01 through OP-33-36; REG-CW02-03; REG-CW03-03; REG-CW03-06; REG-CW03-11; REG-CW04-10; REG-CW05-02; REG-CW05-04; REG-CW06-03; REG-CW06-04; REG-CW08-04; REG-CW08-06; REG-CW08-07; REG-CW08-11; REG-CW09-04</td>
<td>Integration Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/api-database-integration.md">API/database cases and results</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td><a href="../../known-bugs.md#bug-018-evaluation-submissions-can-persist-partial-or-duplicate-responses">BUG-018</a>; <a href="../../known-bugs.md#bug-019-csv-processing-failures-omit-partial-import-errors">BUG-019</a>; <a href="../../known-bugs.md#bug-020-evaluation-reset-retains-completed-student-flags">BUG-020</a></td>
<td>The API/database suite covers all 36 inventoried operations through HTTP requests and independently queried MongoDB state. Authentication/authorization and email cases add persisted ownership, token, and acceptance-state checks. Selected browser journeys verify visible and persisted workflow outcomes. The submission integrity extension adds bounded transaction rollback and concurrency assertions; PR #137 at <code>649dc6f</code> recorded historical October 28 focused/full integration passes with cleanup verified. The combined follow-up repairs CSV error disclosure and reset completion; all 200 integration tests and 13 browser tests passed with cleanup verified; see <a href="../../modernization/implementation/testing/api-database-integration.md#5-submission-integrity">Section 5 of the API/database record</a>. Exhaustive atomicity remains unestablished. See the <a href="../../modernization/implementation/testing/end-to-end-testing.md">E2E record</a>, <a href="../../modernization/implementation/testing/api-database-integration.md">API/database record</a>, and <a href="../../modernization/implementation/testing/regression-coverage-gaps.md">coverage gap inventory</a>.</td>
</tr>
<tr>
<td>FR-10</td>
<td>Functional</td>
<td>The system shall allow a professor to review and export supported evaluation results and reports.</td>
<td>High</td>
<td>Client</td>
<td>Reporting / Results Management</td>
<td><a href="../../../../src/backend/controllers/reportController.js">Report controller</a></td>
<td>UNIT-BE-004; UNIT-BE-013; UNIT-BE-014; UNIT-BE-015; OP-33-29 through OP-33-33; REG-CW09-02; REG-CW09-03; REG-CW09-05; REG-CW09-06; REG-CW09-08; REG-CW09-04</td>
<td>Unit Test + Integration Test + Functional Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Seven report integration cases cover mean/curved reports, CSV content, individual/team selection, the generate alias, and no-write behavior. A browser journey reviews stored results and independently checked scores and downloads CSV; it does not cover every report action or CSV edge case. Authorization tests check foreign-professor report access. Grading-boundary sweeps remain open; see the <a href="../../modernization/implementation/testing/end-to-end-testing.md">E2E record</a>, <a href="../../modernization/implementation/testing/authentication-authorization-integration.md">authentication and authorization record</a>, and <a href="../../modernization/implementation/testing/regression-coverage-gaps.md">coverage gap inventory</a>. See the <a href="../../modernization/implementation/testing/api-database-integration.md#6-priority-workflow-regression-follow-up">October 28 priority integration cases/results</a>: the historical PR #134 baseline includes failures; the combined source subsequently passed all 200 integration tests with cleanup verified.</td>
</tr>
<tr>
<td>FR-11</td>
<td>Functional</td>
<td>The project shall provide documented, repeatable setup procedures for the frontend, backend, database connection, and required external services.</td>
<td>High</td>
<td>Client</td>
<td>Development Environment / Configuration</td>
<td></td>
<td></td>
<td>Inspection + Demonstration</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-12</td>
<td>Functional</td>
<td>The project shall provide Dockerfiles and Docker Compose configuration that reflect the application's MongoDB architecture.</td>
<td>High</td>
<td>Client</td>
<td>Docker / Docker Compose Environment</td>
<td></td>
<td></td>
<td>Integration Test + Demonstration</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-13</td>
<td>Functional</td>
<td>Each code commit pushed to the repository and each pull request targeting main shall automatically trigger the required CI workflow.</td>
<td>High</td>
<td>Client</td>
<td>GitHub Actions / CI Pipeline</td>
<td></td>
<td></td>
<td>Integration Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-14</td>
<td>Functional</td>
<td>The CI workflow shall build the application and run configured linting and formatting checks.</td>
<td>High</td>
<td>Client</td>
<td>CI Build / Lint / Formatting</td>
<td></td>
<td></td>
<td>CI Validation</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-15</td>
<td>Functional</td>
<td>The CI workflow shall run automated unit and integration tests.</td>
<td>High</td>
<td>Client</td>
<td>CI Automated Test Execution</td>
<td><a href="../../../../.github/workflows/ci.yml">CI workflow</a>; <a href="../../../../src/backend/tests/integration">API/database integration suites</a></td>
<td>UNIT-CI-001; UNIT-CI-002; CI-45-03 through CI-45-06</td>
<td>CI Validation</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/continuous-integration.md">CI implementation and evidence</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Local integration results</a></td>
<td></td>
<td>Hosted unit tests and local service-backed integration tests are implemented; the hosted workflow has no integration-test job, so FR-15 remains In Progress. See the <a href="../../modernization/implementation/continuous-integration.md">CI implementation and evidence</a> and <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">local integration results</a>.</td>
</tr>
<tr>
<td>FR-16</td>
<td>Functional</td>
<td>The project shall use Jest and React Testing Library for appropriate frontend automated tests.</td>
<td>High</td>
<td>Client</td>
<td>Vitest / React Testing Library / jsdom</td>
<td><a href="../../../../package.json">Frontend package</a>; <a href="../../../../vite.config.mjs">Vitest configuration</a>; <a href="../../../../src/frontend/test/setup.js">DOM assertion setup</a>; <a href="../../../../src/frontend/tests/LoginPage.test.jsx">Frontend test</a></td>
<td>UNIT-FE-001; UNIT-FE-002; UNIT-FE-003; UNIT-FE-004; UNIT-CI-001; UNIT-CI-002</td>
<td>Unit Test + Integration Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/unit-testing.md#initial-test-results">Initial recorded results</a>; <a href="../../modernization/implementation/testing/unit-testing.md#verification-after-runtime-alignment">Verification after runtime alignment</a></td>
<td></td>
<td>The project uses Vitest and React Testing Library rather than the Jest framework named in FR-16; this requirement conflict remains open. See the <a href="../../modernization/implementation/testing/unit-testing.md">unit-testing record</a>. End-to-end verification remains separately tracked under FR-17.</td>
</tr>
<tr>
<td>FR-17</td>
<td>Functional</td>
<td>The project shall use Playwright for agreed end-to-end and regression workflows.</td>
<td>High</td>
<td>Client</td>
<td>Playwright / End-to-End Testing</td>
<td><a href="../../../../playwright.config.cjs">Playwright configuration</a>; <a href="../../../../scripts/runE2ETests.cjs">isolated E2E runner</a>; <a href="../../modernization/implementation/testing/end-to-end-testing.md">E2E implementation record</a></td>
<td>E2E-40-01; E2E-41-01 through E2E-41-02; E2E-42-01 through E2E-42-04; REG-CW01-01; REG-CW02-01; REG-CW03-01; REG-CW04-01; REG-CW05-03 through REG-CW05-05; REG-CW06-01; REG-CW08-01; REG-CW09-01/02/07</td>
<td>End-to-End Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/end-to-end-testing.md#3-test-results">Recorded local E2E results</a>; <a href="../../../../tests/e2e">Playwright browser specs</a></td>
<td></td>
<td>Selected isolated browser smoke, fixture, instructor, student, reset/relaunch, and results journeys are implemented and have historical local passing evidence. The implementation record documents four selected workflows; this does not mean every mapped workflow is a single test or that the full regression matrix is complete. Hosted E2E CI and remaining matrix gaps are open. See the <a href="../../modernization/implementation/testing/end-to-end-testing.md">E2E record</a> and <a href="../../modernization/implementation/testing/regression-coverage-gaps.md">coverage inventory</a>.</td>
</tr>
<tr>
<td>FR-18</td>
<td>Functional</td>
<td>The CI workflow shall perform dependency and security checks and make the results available to maintainers.</td>
<td>High</td>
<td>Client</td>
<td>CI Security / Dependency Checks</td>
<td></td>
<td></td>
<td>CI Validation</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-19</td>
<td>Functional</td>
<td>Required failed checks shall prevent a pull request from being merged into main.</td>
<td>High</td>
<td>Client</td>
<td>CI Quality Gates / Pull Requests</td>
<td></td>
<td></td>
<td>Functional Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-20</td>
<td>Functional</td>
<td>The main branch shall be protected so that application changes are merged through pull requests and required validation checks must pass before merging.</td>
<td>High</td>
<td>Client</td>
<td>GitHub Branch Protection / CI Quality Gates</td>
<td></td>
<td></td>
<td>Inspection + Demonstration</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-21</td>
<td>Functional</td>
<td>A successful approved change shall automatically deploy to the staging environment after required checks pass.</td>
<td>High</td>
<td>Client</td>
<td>Continuous Delivery / Staging Deployment</td>
<td></td>
<td></td>
<td>Integration Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-22</td>
<td>Functional</td>
<td>After each staging deployment, the pipeline shall execute health checks and the selected smoke tests to validate application availability, database connectivity, and critical workflows.</td>
<td>High</td>
<td>Client</td>
<td>Staging Health / Smoke Testing</td>
<td></td>
<td></td>
<td>Smoke Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-23</td>
<td>Functional</td>
<td>The project shall retain logs or reports sufficient to demonstrate pipeline, test, security, and deployment results.</td>
<td>High</td>
<td>Client</td>
<td>CI/CD Logging / Test &amp; Deployment Evidence</td>
<td></td>
<td></td>
<td>Inspection</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-24</td>
<td>Functional</td>
<td>The project shall automate deployment to a staging environment only. Production hosting, production deployment, and production-release automation shall remain outside the project's scope.</td>
<td>High</td>
<td>Client</td>
<td>Project Documentation</td>
<td></td>
<td></td>
<td>Inspection</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-25</td>
<td>Functional</td>
<td>The project shall document setup, configuration, testing, pipeline behavior, deployment, rollback, release, and troubleshooting procedures.</td>
<td>High</td>
<td>Client</td>
<td>Project Documentation</td>
<td></td>
<td></td>
<td>Inspection</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>NFR-01</td>
<td>Nonfunctional</td>
<td>Maintainability: New CI/CD code, tests, configuration, and documentation shall use clear organization, consistent naming, and documented responsibilities.</td>
<td>High</td>
<td>Client</td>
<td>CI/CD Code, Tests, Configuration &amp; Documentation</td>
<td></td>
<td></td>
<td>Inspection</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>NFR-02</td>
<td>Nonfunctional</td>
<td>Repeatability: The same source version and configuration shall produce a consistent build and test result in supported environments.</td>
<td>High</td>
<td>Client</td>
<td>Docker / CI Enviornment / Build Pipeline</td>
<td></td>
<td></td>
<td>Integration Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>NFR-03</td>
<td>Nonfunctional</td>
<td>Reliability: Failed required checks or failed deployment validation shall stop the applicable workflow and report the failure.</td>
<td>High</td>
<td>Client</td>
<td>CI/CD Pipeline / Quality Gates</td>
<td></td>
<td></td>
<td>Integration Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>NFR-04</td>
<td>Nonfunctional</td>
<td>Security: Credentials, tokens, connection strings, and environment values shall not be committed to the repository and shall use approved secret storage.</td>
<td>High</td>
<td>Client</td>
<td>Configuration / Secret Management</td>
<td></td>
<td></td>
<td>Inspection</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>NFR-05</td>
<td>Nonfunctional</td>
<td>Privacy: Automated and staging tests shall use synthetic, de-identified, or sponsor-approved data and shall not email real students unintentionally.</td>
<td>High</td>
<td>Client</td>
<td>Test Data / Email Sandbox</td>
<td></td>
<td></td>
<td>Integration Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>NFR-06</td>
<td>Nonfunctional</td>
<td>Traceability: Requirements, tests, defects, pull requests, pipeline results, and milestone evidence shall be traceable through the repository and project documentation.</td>
<td>High</td>
<td>Client</td>
<td>Requirements Traceability / Project Repository</td>
<td></td>
<td></td>
<td>Inspection</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>NFR-07</td>
<td>Nonfunctional</td>
<td>Portability: The documented containerized environment shall run consistently on supported developer systems and CI runners.</td>
<td>High</td>
<td>Client</td>
<td>Docker / Docker Compose Environment</td>
<td></td>
<td></td>
<td>Integration Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>NFR-08</td>
<td>Nonfunctional</td>
<td>Configurability: Environment-specific URLs, credentials, and service settings shall be supplied through configuration rather than hard-coded production values.</td>
<td>High</td>
<td>Client</td>
<td>Environment Configuration</td>
<td></td>
<td></td>
<td>Inspection</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>NFR-09</td>
<td>Nonfunctional</td>
<td>Usability: Setup, pipeline, deployment, and troubleshooting documentation shall be understandable to a future maintainer with relevant software-development skills.</td>
<td>Medium</td>
<td>Client</td>
<td>Project Documentation</td>
<td></td>
<td></td>
<td>Inspection</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>NFR-10</td>
<td>Nonfunctional</td>
<td>Recoverability: Deployment and release documentation shall identify how to return to the last known working version when supported by the selected platform.</td>
<td>Medium</td>
<td>Client</td>
<td>Deployment / Release Documentation</td>
<td></td>
<td></td>
<td>Inspection</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>NFR-11</td>
<td>Nonfunctional</td>
<td>Functional Preservation: Existing PEERS functionality shall be preserved whenever practical, and changes introduced by the project shall not cause validated workflows to regress.</td>
<td>High</td>
<td>Client</td>
<td>Existing PEERS Functional Workflows / Regression Suite</td>
<td></td>
<td></td>
<td>Functional Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
</table>
