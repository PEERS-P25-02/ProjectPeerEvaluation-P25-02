# RTM

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
<td>UNIT-BE-001; UNIT-BE-002; UNIT-BE-003; UNIT-BE-014; UNIT-BE-015; UNIT-FE-001; OP-33-01; OP-33-34 through OP-33-36</td>
<td>Unit Test + Integration Test + End-to-End Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/unit-testing.md#initial-test-results">Initial recorded results</a>; <a href="../../modernization/implementation/testing/frontend-unit-test-validation.md#frontend-unit-test-cases">Frontend validation</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>The integration suites include four login cases and eight account-support cases with independent MongoDB and captured SMTP checks. The October 24, 2026 recorded full suite passed 73 tests twice with cleanup verified. Cross-resource ownership remains unverified.</td>
</tr>
<tr>
<td>FR-02</td>
<td>Functional</td>
<td>The system shall allow a professor to create and manage courses.</td>
<td>High</td>
<td>Client</td>
<td>Course Management</td>
<td><a href="../../../../src/backend/controllers/courseController.js">Course controller</a>; <a href="../../../../src/backend/models/Course.js">Course model</a></td>
<td>UNIT-BE-004; UNIT-BE-009; UNIT-BE-010; UNIT-BE-014; UNIT-BE-015; API-33-01 through API-33-07; OP-33-02 through OP-33-06</td>
<td>Unit Test + Integration Test + Functional Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md">API/database cases and results</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Seven course cases cover create, read, filter, update, deactivate, reactivate, and rejected writes. The October 24, 2026 recorded full suite passed 73 tests twice with cleanup verified. Authorization remains unverified.</td>
</tr>
<tr>
<td>FR-03</td>
<td>Functional</td>
<td>The system shall allow a professor to upload and process a student roster from a CSV file.</td>
<td>High</td>
<td>Client</td>
<td>Roster Management / CSV Processing</td>
<td><a href="../../../../src/backend/controllers/courseController.js">Course controller</a>; <a href="../../../../src/backend/controllers/studentController.js">CSV roster parsing</a></td>
<td>UNIT-BE-004; UNIT-BE-005; UNIT-BE-007; UNIT-BE-008; UNIT-BE-013; UNIT-BE-014; UNIT-BE-015; OP-33-07 through OP-33-13</td>
<td>Unit Test + Integration Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Twelve roster cases cover multipart CSV, normalized persistence, team relationships, scoped evaluation cleanup, and rejected writes. The recorded full suite passed 73 tests twice. Malformed streams and failure atomicity remain gaps.</td>
</tr>
<tr>
<td>FR-04</td>
<td>Functional</td>
<td>The system shall allow students to be organized into course teams.</td>
<td>High</td>
<td>Client</td>
<td>Team Management</td>
<td><a href="../../../../src/backend/controllers/teamController.js">Team controller</a>; <a href="../../../../src/backend/models/Team.js">Team model</a></td>
<td>UNIT-BE-004; UNIT-BE-006; UNIT-BE-009; UNIT-BE-010; UNIT-BE-014; UNIT-BE-015; OP-33-14 through OP-33-20</td>
<td>Unit Test + Integration Test + Functional Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Thirteen team cases cover CRUD, membership moves/removal, counts, constraints, and course isolation. The recorded full suite passed 73 tests twice. Cross-resource ownership and concurrency remain gaps.</td>
</tr>
<tr>
<td>FR-05</td>
<td>Functional</td>
<td>The system shall allow a professor to create and distribute a peer-evaluation activity.</td>
<td>High</td>
<td>Client</td>
<td>Evaluation Management / Distribution</td>
<td><a href="../../../../src/backend/models/Evaluation.js">Evaluation model</a>; <a href="../../../../src/backend/controllers/evaluationController.js">Evaluation controller</a></td>
<td>UNIT-BE-009; UNIT-BE-011; UNIT-BE-012; UNIT-BE-013; UNIT-BE-014; UNIT-BE-015; OP-33-21 through OP-33-25</td>
<td>Unit Test + Integration Test + End-to-End Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Eight evaluation-management cases cover invitations, completion status, selected/default reminders, and reset using persisted state and captured SMTP. The recorded full suite passed 73 tests twice. Provider delivery, browser behavior, and atomicity remain gaps.</td>
<td></td>
</tr>
<tr>
<td>FR-06</td>
<td>Functional</td>
<td>The system shall generate individualized evaluation access links or tokens for eligible students.</td>
<td>High</td>
<td>Client</td>
<td>Evaluation Management / Token Generation</td>
<td><a href="../../../../src/backend/controllers/evaluationController.js">Evaluation controller</a></td>
<td>UNIT-BE-014; UNIT-BE-015; OP-33-21; OP-33-22; OP-33-26 through OP-33-28</td>
<td>Unit Test + Integration Test + End-to-End Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Student-evaluation cases check token association, public form access, submission, and stored completion. The recorded full suite passed 73 tests twice. Token security and browser-reachable links remain unverified.</td>
</tr>
<tr>
<td>FR-07</td>
<td>Functional</td>
<td>The system shall support evaluation invitations and reminders through the configured email service.</td>
<td>High</td>
<td>Client</td>
<td>Evaluation Management / Email Service</td>
<td><a href="../../../../src/backend/controllers/evaluationController.js">Evaluation controller</a>; <a href="../../../../src/backend/utils/emailUtils.js">Email utilities</a></td>
<td>UNIT-BE-014; OP-33-21; OP-33-22; OP-33-24</td>
<td>Integration Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Invitation and reminder cases inspect actual Mailpit recipients and stored-token association. The recorded full suite passed 73 tests twice. External delivery, browser links, and controlled transport failures remain unverified.</td>
</tr>
<tr>
<td>FR-08</td>
<td>Functional</td>
<td>The system shall allow a student to submit a peer evaluation through the assigned link.</td>
<td>High</td>
<td>Client</td>
<td>Student Evaluation / Submission</td>
<td><a href="../../../../src/backend/models/Evaluation.js">Evaluation model</a>; <a href="../../../../src/backend/controllers/evaluationController.js">Evaluation controller</a></td>
<td>UNIT-BE-009; UNIT-BE-011; UNIT-BE-012; UNIT-BE-014; UNIT-BE-015; OP-33-26 through OP-33-28</td>
<td>Unit Test + Integration Test + End-to-End Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Ten public API/MongoDB cases cover two-peer persistence, completion, repeated submission, and invalid first-entry rejection. The recorded full suite passed 73 tests twice. Recipient authorization, later partial writes, and concurrency remain gaps.</td>
<td></td>
</tr>
<tr>
<td>FR-09</td>
<td>Functional</td>
<td>The system shall store course, roster, team, evaluation, and response data in MongoDB.</td>
<td>High</td>
<td>Client</td>
<td>MongoDB / Data Persistence</td>
<td><a href="../../../../src/backend/tests/integration">API/database integration suites</a></td>
<td>OP-33-01 through OP-33-36</td>
<td>Integration Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/api-database-integration.md">API/database cases and results</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>The implementation contains integration suites for all 36 inventoried operations: 69 application cases plus four environment checks. The October 24, 2026 record reports two complete 73-test runs in fresh isolated stacks with cleanup verified. These are recorded historical outcomes.</td>
</tr>
<tr>
<td>FR-10</td>
<td>Functional</td>
<td>The system shall allow a professor to review and export supported evaluation results and reports.</td>
<td>High</td>
<td>Client</td>
<td>Reporting / Results Management</td>
<td><a href="../../../../src/backend/controllers/reportController.js">Report controller</a></td>
<td>UNIT-BE-004; UNIT-BE-013; UNIT-BE-014; UNIT-BE-015; OP-33-29 through OP-33-33</td>
<td>Unit Test + Integration Test + Functional Test</td>
<td>In Progress</td>
<td><a href="../../modernization/implementation/testing/backend-unit-testing.md#backend-unit-test-cases">Backend unit-test cases</a>; <a href="../../modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review">Expanded integration cases and results</a></td>
<td></td>
<td>Seven reporting cases cover mean and curved reports, CSV content, individual/team selection, the generate alias, and no-write behavior. The recorded full suite passed 73 tests twice. Ownership, CSV edge cases, and grading-boundary sweeps remain gaps.</td>
<td></td>
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
<td></td>
<td></td>
<td>CI Validation</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
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
<td>Unit tests and API/database integration suites are implemented; the October 24, 2026 recorded suite passed 73 tests twice with cleanup verified. The implementation uses Vitest while FR-16 specifies Jest. This requirement conflict remains open. UNIT-CI identifiers refer to local command checks, not CI workflow execution.</td>
</tr>
<tr>
<td>FR-17</td>
<td>Functional</td>
<td>The project shall use Playwright for agreed end-to-end and regression workflows.</td>
<td>High</td>
<td>Client</td>
<td>Playwright / End-to-End Testing</td>
<td></td>
<td></td>
<td>End-to-End Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
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
