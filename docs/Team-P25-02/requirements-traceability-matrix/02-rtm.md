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
<td></td>
<td></td>
<td>End-to-End Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-02</td>
<td>Functional</td>
<td>The system shall allow a professor to create and manage courses.</td>
<td>High</td>
<td>Client</td>
<td>Course Management</td>
<td></td>
<td></td>
<td>Functional Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-03</td>
<td>Functional</td>
<td>The system shall allow a professor to upload and process a student roster from a CSV file.</td>
<td>High</td>
<td>Client</td>
<td>Roster Management / CSV Processing</td>
<td></td>
<td></td>
<td>Integration Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-04</td>
<td>Functional</td>
<td>The system shall allow students to be organized into course teams.</td>
<td>High</td>
<td>Client</td>
<td>Team Management</td>
<td></td>
<td></td>
<td>Functional Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-05</td>
<td>Functional</td>
<td>The system shall allow a professor to create and distribute a peer-evaluation activity.</td>
<td>High</td>
<td>Client</td>
<td>Evaluation Management / Distribution</td>
<td></td>
<td></td>
<td>End-to-End Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-06</td>
<td>Functional</td>
<td>The system shall generate individualized evaluation access links or tokens for eligible students.</td>
<td>High</td>
<td>Client</td>
<td>Evaluation Management / Token Generation</td>
<td></td>
<td></td>
<td>Unit Test + End-to-End Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-07</td>
<td>Functional</td>
<td>The system shall support evaluation invitations and reminders through the configured email service.</td>
<td>High</td>
<td>Client</td>
<td>Evaluation Management / Email Service</td>
<td></td>
<td></td>
<td>Integration Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-08</td>
<td>Functional</td>
<td>The system shall allow a student to submit a peer evaluation through the assigned link.</td>
<td>High</td>
<td>Client</td>
<td>Student Evaluation / Submission</td>
<td></td>
<td></td>
<td>End-to-End Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-09</td>
<td>Functional</td>
<td>The system shall store course, roster, team, evaluation, and response data in MongoDB.</td>
<td>High</td>
<td>Client</td>
<td>MongoDB / Data Persistence</td>
<td></td>
<td></td>
<td>Integration Test</td>
<td>Not Started</td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>FR-10</td>
<td>Functional</td>
<td>The system shall allow a professor to review and export supported evaluation results and reports.</td>
<td>High</td>
<td>Client</td>
<td>Reporting / Results Management</td>
<td></td>
<td></td>
<td>Functional Test</td>
<td>Not Started</td>
<td></td>
<td></td>
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
<td><a href="../../../package.json">Frontend package</a>; <a href="../../../vite.config.mjs">Vitest configuration</a>; <a href="../../../src/frontend/test/setup.js">DOM assertion setup</a>; <a href="../../../src/frontend/tests/App.test.jsx">Frontend test</a></td>
<td>UNIT-FE-001; UNIT-CI-001; UNIT-CI-002</td>
<td>Unit Test + Integration Test</td>
<td>In Progress</td>
<td><a href="../testing/01-unit-testing-implementation.md#initial-test-results">Initial recorded results</a>; <a href="../testing/01-unit-testing-implementation.md#verification-after-runtime-alignment">Verification after runtime alignment</a></td>
<td></td>
<td>Initial unit coverage is implemented; integration coverage remains planned. The implementation uses Vitest in place of the specified Jest runner; requirement reconciliation remains open. UNIT-CI identifiers refer to local command checks, not CI workflow execution.</td>
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
