<a id="01-milestone-1-objective"></a>

<a id="section-1"></a>

# Milestone 1 Objective

The purpose of the Automated Testing Strategy deliverable is to define how the team will prove that the inherited PEERS application continues to work while it is being containerized, refactored where needed, and moved into an automated CI/CD workflow. Milestone 1 is the assessment and strategy phase. The full automated suite is not expected to be finished yet; the goal is to establish the current test baseline, sponsor-approved workflow scope, test levels, tools, traceability approach, environment/data rules, and implementation plan.

This directly supports the Milestone 1 rubric by demonstrating requirements understanding, acceptance criteria, technical setup evidence, risks, decisions, and measurable next actions.

<a id="02-current-repository-testing-state"></a>

<a id="section-2"></a>

# Current Repository Testing State

The testing baseline below is based on a direct review of the repository at the time of the original assessment.

| Area | Observed State |
| --- | --- |
| Frontend test command | The root frontend package includes the standard react-scripts test command. |
| React testing dependencies | React Testing Library packages are already present in the frontend dependencies, including @testing-library/react, @testing-library/jest-dom, and @testing-library/user-event. |
| Frontend lint configuration | The root ESLint configuration extends react-app and react-app/jest, so the frontend already has part of the tooling foundation needed for Jest-based testing. |
| Frontend test coverage | No established automated frontend test suite was identified during the initial repository review; the team should confirm this again during implementation by inventorying test files and running the existing test command. |
| Backend test tooling | The backend package.json currently contains only a start script and does not define an npm test command or test framework dependency. |
| Manual API diagnostic | The backend contains test\_api.js, but it is a manual Axios diagnostic that calls one localhost evaluation endpoint and logs the response. It is not a repeatable automated unit/integration suite and does not provide CI-quality pass/fail coverage. |
| Backend health endpoint | The backend exposes GET /api/health, which can later support automated post-deployment health validation. |
| CI automation | Automated CI execution is not currently present because no .github/workflows directory was identified on main. |

<a id="03-testing-goals"></a>

<a id="section-3"></a>

# Testing Goals

| Area | Goal |
| --- | --- |
| Defect detection | Detect defects before code is merged. |
| Regression protection | Protect sponsor-approved PEERS workflows from regression. |
| Component interactions | Verify interactions among the React frontend, Express backend, MongoDB database, authentication, and email behavior. |
| Verification evidence | Provide repeatable evidence that functional requirements and acceptance criteria are verified. |
| Merge validation | Support merge quality gates in Continuous Integration. |
| Staging validation | Support health and smoke validation after staging deployment. |
| Failure diagnosis | Make failures understandable enough to distinguish code, data, configuration, environment, and deployment problems. |

<a id="04-priority-workflow-scope"></a>

<a id="section-4"></a>

# Priority Workflow Scope

The SLA provides the current proposed priority workflow list. These workflows should drive regression and end-to-end coverage after sponsor confirmation.

| Priority | Workflow | Validation Focus |
| --- | --- | --- |
| High | Professor authentication | Authorized access and invalid-login handling. |
| High | Course and roster setup | Course creation and valid/invalid CSV roster processing. |
| High | Team management | Students are associated with the correct course teams. |
| High | Evaluation distribution | Evaluation records, individualized links/tokens, and safe test email delivery. |
| High | Peer Evaluation and Rubric Management | Correct rubric configuration and association with course/evaluation. |
| High | Student evaluation submission | Token access, validation, submission, and persistence. |
| High | Professor results and reporting | Stored responses are visible and supported reports can be produced. |
| Medium | Reminder email workflow | Reminders are sent only to intended test recipients. |

<a id="05-testing-layers"></a>

<a id="section-5"></a>

# Testing Layers

| Test Level | Purpose | PEERS Examples |
| --- | --- | --- |
| Unit | Validate isolated business logic quickly. | Authentication/authorization logic, token logic, CSV validation, rubric validation, calculations, eligibility logic. |
| Integration | Validate interaction between application components/services. | Express routes + MongoDB, auth + protected routes, roster persistence, evaluations/responses, reporting, controlled email service. |
| Functional Regression | Protect agreed workflows from breaking after changes. | Login, course creation, roster upload, team assignment, rubrics, evaluation distribution, student submission, reporting. |
| End-to-End | Validate representative user workflows across the running application. | Instructor and student browser journeys using Playwright. |
| Smoke | Verify that the staged release is alive and usable after deployment. | Frontend/backend reachability, MongoDB connectivity, /api/health, and a selected critical workflow. |

<a id="06-proposed-testing-tools"></a>

<a id="section-6"></a>

# Proposed Testing Tools

| Proposed Tool | Purpose |
| --- | --- |
| Vitest | Selected frontend/backend JavaScript runner; initial unit-test tooling is implemented. |
| jsdom | Browser environment for frontend component tests. |
| React Testing Library | React component and user-visible behavior tests. |
| Playwright | Sponsor-approved end-to-end and regression browser workflows. |
| GitHub Actions | Unattended execution and quality-gate enforcement. |
| Docker/Docker Compose | Repeatable local and CI test environments. |
| Mailpit | Isolated local/CI SMTP capture with forwarding disabled and no SMTP credentials. |
| Mailtrap Email Testing | Separate authenticated staging email sandbox. |

The implementation selected Vitest to share one runner across the Vite frontend and the CommonJS backend, with React Testing Library and jsdom for rendered frontend behavior. Framework configuration and the initial unit tests are implemented; broader coverage and CI execution remain planned. See [Unit Testing Implementation](../../implementation/testing/unit-testing.md) for the tooling decisions and verification evidence.

The original proposal specified Jest. FR-16 now specifies Vitest, matching the implementation; see the [requirements tracker](../../../requirements/traceability/02-rtm.md).
