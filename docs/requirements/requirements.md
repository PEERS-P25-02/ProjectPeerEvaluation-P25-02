# PEERS Modernization Requirements Reference

This page is a concise index of the validated PEERS modernization baseline. The archived [requirements and constraints](../archive/plans/requirements/validation/01-requirements-and-constraints.md) and [acceptance criteria and exclusions](../archive/plans/requirements/validation/02-acceptance-and-document-usage.md) remain authoritative for full wording. Requirements describe what the project must deliver; they are not evidence that a capability is implemented or verified. Use the active [requirements traceability page](traceability.md) to navigate current evidence and limitations, and the [regression test matrix](../archive/plans/requirements/regression-test-matrix.md) for requirement-linked expected outcomes. The archived RTM is historical evidence and is not a current-branch status audit.

## Functional requirements

| ID | Requirement |
| --- | --- |
| FR-01 | Allow an authorized professor to authenticate and access professor functions. |
| FR-02 | Allow a professor to create and manage courses. |
| FR-03 | Allow a professor to upload and process a student roster from a CSV file. |
| FR-04 | Allow students to be organized into course teams. |
| FR-05 | Allow a professor to create and distribute a peer-evaluation activity. |
| FR-06 | Generate individualized evaluation access links or tokens for eligible students. |
| FR-07 | Support evaluation invitations and reminders through the configured email service. |
| FR-08 | Allow a student to submit a peer evaluation through the assigned link. |
| FR-09 | Store course, roster, team, evaluation, and response data in MongoDB. |
| FR-10 | Allow a professor to review and export supported evaluation results and reports. |
| FR-11 | Provide documented, repeatable setup procedures for the frontend, backend, database connection, and required external services. |
| FR-12 | Provide Dockerfiles and Docker Compose configuration that reflect the application's MongoDB architecture. |
| FR-13 | Automatically trigger required CI for each pull request targeting `main`, each update to its head, and each merge-group candidate targeting `main`, validating the resulting candidate head. |
| FR-14 | CI shall build the application and run configured linting and formatting checks. |
| FR-15 | CI shall run automated unit and integration tests. |
| FR-16 | Use Vitest and React Testing Library for appropriate frontend automated tests. |
| FR-17 | Use Playwright for agreed end-to-end and regression workflows. |
| FR-18 | CI shall perform dependency and security checks and make results available to maintainers. |
| FR-19 | Required failed checks shall prevent a pull request from being merged into `main`. |
| FR-20 | Protect `main` so application changes are merged through pull requests and required validation checks pass before merging. |
| FR-21 | For every successful CI push run for this repository's current two-parent `main` merge commit, publish and deploy both staging services regardless of changed paths, including documentation-only and test-only changes. Unsuccessful, foreign, non-push, non-main, stale, or non-merge CI evidence shall not initiate deployment. |
| FR-22 | After each staging deployment, execute health checks and selected smoke tests for application availability, database connectivity, and critical workflows. |
| FR-23 | Retain logs or reports sufficient to demonstrate pipeline, test, security, and deployment results. |
| FR-24 | Automate deployment to staging only. Production hosting, production deployment, and production-release automation remain outside project scope. |
| FR-25 | Document setup, configuration, testing, pipeline behavior, deployment, rollback, release, and troubleshooting procedures. |

## Nonfunctional requirements

| ID | Quality attribute | Requirement |
| --- | --- | --- |
| NFR-01 | Maintainability | New CI/CD code, tests, configuration, and documentation shall use clear organization, consistent naming, and documented responsibilities. |
| NFR-02 | Repeatability | The same source version and configuration shall produce a consistent build and test result in supported environments. |
| NFR-03 | Reliability | Failed required checks or failed deployment validation shall stop the applicable workflow and report the failure. |
| NFR-04 | Security | Credentials, tokens, connection strings, and environment values shall not be committed and shall use approved secret storage. |
| NFR-05 | Privacy | Automated and staging tests shall use synthetic, de-identified, or sponsor-approved data and shall not email real students unintentionally. |
| NFR-06 | Traceability | Requirements, tests, defects, pull requests, pipeline results, and milestone evidence shall be traceable through the repository and project documentation. |
| NFR-07 | Portability | The documented containerized environment shall run consistently on supported developer systems and CI runners. |
| NFR-08 | Configurability | Environment-specific URLs, credentials, and service settings shall be supplied through configuration rather than hard-coded production values. |
| NFR-09 | Usability | Setup, pipeline, deployment, and troubleshooting documentation shall be understandable to a future maintainer with relevant software-development skills. |
| NFR-10 | Recoverability | Deployment and release documentation shall identify how to return to the last known working version when supported by the selected platform. |
| NFR-11 | Functional Preservation | Existing PEERS functionality shall be preserved whenever practical, and project changes shall not cause validated workflows to regress. |

## Constraints

| ID | Constraint |
| --- | --- |
| C-01 | Complete the project within the capstone semester and the milestone dates stated in the agreement. |
| C-02 | Build on the inherited React, Node.js, Express, and MongoDB application rather than replace it with a new product. |
| C-03 | Significant new user-facing features are not part of the primary CI/CD objective. |
| C-04 | Do not include passwords, API keys, database credentials, or real environment values in project documents or committed files. |
| C-05 | Production hosting platform, production access, and release authorization remain subject to sponsor confirmation. |

## Acceptance criteria

| ID | Validation area | Acceptance criterion |
| --- | --- | --- |
| AC-01 | Development environment | A new maintainer can clone the team repository, supply documented configuration, and start the supported containerized environment. |
| AC-02 | Continuous integration | PRs (including head updates), merge-group candidates, and pushes to `main` automatically validate their resulting candidate head. All three run both complete unit suites, the complete API integration suite, build, lint, formatting, CI policy, dependency, and security checks, regardless of changed paths. Full browser E2E runs on merge-group and main-push events. PRs enforce 80% changed executable-line coverage; merge-group and main-push runs enforce at least 70% overall line coverage separately for frontend and backend. |
| AC-03 | Quality gates | A deliberately failing required check prevents the pull request from being merged. |
| AC-04 | Automated testing | Automated unit, integration, regression, and Playwright E2E tests collectively cover the confirmed priority workflows. |
| AC-05 | Continuous delivery | Every successful CI push run for this repository's current two-parent `main` merge commit publishes and deploys both expected service images, regardless of changed paths, including documentation-only and test-only changes. Unsuccessful, foreign, non-push, non-main, stale, or non-merge CI evidence does not initiate deployment. |
| AC-06 | Continuous delivery | The staging frontend and backend are reachable, the backend connects to the staging database, and required health checks pass. |
| AC-07 | Automated testing | Smoke tests confirm that the selected critical workflow is usable after staging deployment. |
| AC-08 | Privacy | Staging email tests are captured by the approved sandbox and do not contact unintended real users. |
| AC-09 | Presentation and demonstration | Pipeline, test, security, and deployment evidence are available for the final demonstration. |
| AC-10 | Documentation | Setup, configuration, testing, deployment, release, troubleshooting, known defects, deferred features, risks, and future-maintenance recommendations are documented and reviewed before final handoff. |

## Critical PEERS workflows

These are the functional-preservation outcomes identified by the workflow baseline. The source labels the classifications as proposed for sponsor review. The observable outcomes below summarize the baseline; detailed scenarios are in the [critical workflow definition](../archive/plans/requirements/workflows/04-critical-peers-workflows.md) and [regression test matrix](../archive/plans/requirements/regression-test-matrix.md).

| ID | Critical workflow | Primary actor | Baseline requirement | Observable preservation outcome |
| --- | --- | --- | --- | --- |
| CW-01 | Professor Authentication and Authorized Access | Professor | FR-01 | Valid credentials grant professor access; invalid credentials do not. Access remains limited to the professor's authorized resources. |
| CW-02 | Course Creation and Management | Professor | FR-02 | The owner can create/manage a course; supported updates persist without cross-professor access or corruption of course state. |
| CW-03 | Student Roster Upload and Processing | Professor | FR-03 | Supported CSV data is parsed into the intended course with student information needed by team and evaluation workflows. |
| CW-04 | Student Team Organization | Professor | FR-04 | Supported team changes preserve consistent membership used to select evaluation peers; automatic team assignment is excluded. |
| CW-05 | Peer-Evaluation Activity Setup and Launch | Professor | FR-05 | The supported setup and launch uses the course's eligible students and teams and creates state needed for evaluation. |
| CW-06 | Individualized Evaluation Link / Token Access | Student / System | FR-06 | Each eligible student reaches their intended evaluation context through the assigned link; invalid or unauthorized contexts are rejected. |
| CW-07 | Evaluation Invitation Distribution | Professor / System | FR-07 | Invitations provide usable access to intended eligible students; delivery failures are not represented as success, and test mail stays in the approved sink. |
| CW-08 | Student Peer-Evaluation Submission | Student | FR-08 | A valid submission is stored once for the correct evaluator, recipients, course, and evaluation. Invalid, duplicate, repeated, or concurrent submissions do not leave duplicate, partial, or inconsistent response state. |
| CW-09 | Evaluation Results Review and Export | Professor | FR-10 | The authorized owner can review/export supported results derived from stored responses for the correct course; other professors cannot access them. |

## Scope exclusions

- Production hosting, deployment, and release automation; automated deployment is limited to the approved staging environment.
- Significant new user-facing features or workflows outside the approved functional baseline.
- Completion or expansion of MFA, AI, and automatic team assignment features previously developed but incomplete.
- Evaluation deadline enforcement and token refresh are outside the established functional baseline; a lifecycle with multiple retained evaluation campaigns per course is not clearly supported and expanding it is outside this modernization scope. See the [workflow classifications](../archive/plans/requirements/workflows/05-supporting-workflows-and-traceability.md#07-excluded-and-unsupported-workflows) for their different limitations.

The detailed exclusions and their rationale are preserved in the [validated acceptance and document-usage source](../archive/plans/requirements/validation/02-acceptance-and-document-usage.md#06-exclusions).

## Evidence and current limitations

This reference records requirements, not implementation status. The active [traceability page](traceability.md) links to evidence and explains its limits; the archived RTM and implementation records retain historical classifications/results and are not a current-branch audit. The acceptance source also contains a dated rollout note in AC-02; it is historical context, not an acceptance condition ([archived validation source](../archive/plans/requirements/validation/02-acceptance-and-document-usage.md#05-acceptance-criteria)).

One recorded verification gap affects the invitation/status workflow: [REG-CW05-09 is partial](../archive/implementation-records/email-integration.md#7-limitations-and-remaining-coverage). Existing evidence covers per-student state and totals and invitation all-success or full-rejection cases, but does not verify mixed SMTP acceptance across recipients and the corresponding per-recipient and aggregate status. This is a coverage gap; the record does not establish that mixed delivery is defective. Check the [known-bug register](../archive/implementation-records/known-bugs.md) for separately reproduced defects and their evidence; defect records should not be treated as requirement-wide findings without a direct mapping.

The configured [staging smoke checks](../testing.md#staging-smoke-checks) load an unsubmitted synthetic evaluation but do not submit it. They establish only the observed access and health checks, not a complete student submission or every critical workflow under AC-07.
