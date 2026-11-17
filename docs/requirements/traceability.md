# PEERS requirements traceability

This page is the maintained navigation reference between PEERS workflow
classifications, validated functional requirements (FRs), regression targets, and test records.
It preserves stable identifiers while keeping requirement authority, expected
outcomes, implementation, and execution evidence distinct.

## Source of truth and use

- The [validated requirements and acceptance guidance](../archive/plans/requirements/validation/) govern requirement meaning and acceptance.
- The [workflow baseline](../archive/plans/requirements/workflows/) defines critical workflows CW-01 through CW-09, supporting workflows SW-01 through SW-06, and modernization workflows MW-01 through MW-06.
- The [Requirements Traceability Matrix (RTM)](../archive/plans/requirements/traceability/) retains the requirement-level descriptions, traceability IDs, verification methods, maintained statuses, and strongest evidence links. Its statuses are the recorded classifications in that source, not a fresh audit or current-branch test result.
- The [functional regression matrix](../archive/plans/requirements/regression-test-matrix.md) defines stable REG-CW scenario IDs and expected outcomes. These are targets, not claims that a matching test exists or passed.
- The [testing guide](../testing.md) describes current commands, isolation, prerequisites, and suite boundaries. The [testing implementation index](../archive/implementation-records/testing-implementation-index.md) links test records and dated results.

When assessing a requirement, follow the mapping below to the relevant FR, then
use the RTM for its detailed case IDs and evidence links. Use the regression
matrix for the expected observable result, and the linked implementation
records for test source and dated execution evidence. A test-case mapping,
configured CI job, or regression target alone does not establish a pass or
acceptance.

The workflow source explicitly says its classifications are proposed for
sponsor review. The CW/SW/MW labels below preserve that source classification;
they do not imply sponsor confirmation.

## Critical workflow to requirement and test references

| Workflow | Related requirements | Regression targets | Test record references |
| --- | --- | --- | --- |
| CW-01 Professor authentication and authorized access | FR-01 | REG-CW01-01 through REG-CW01-06 | [Authentication and authorization integration](../archive/implementation-records/authentication-authorization-integration.md); [browser E2E](../archive/implementation-records/end-to-end-testing.md) |
| CW-02 Course creation and management | FR-02; FR-09 for persisted course data | REG-CW02-01 through REG-CW02-07 | [API and database integration](../archive/implementation-records/api-database-integration.md); [browser E2E](../archive/implementation-records/end-to-end-testing.md) |
| CW-03 Student roster upload and management | FR-03; FR-09 for persisted roster data | REG-CW03-01 through REG-CW03-11 | [API and database integration](../archive/implementation-records/api-database-integration.md); [browser E2E](../archive/implementation-records/end-to-end-testing.md) |
| CW-04 Student team creation and management | FR-04; FR-09 for persisted team data | REG-CW04-01 through REG-CW04-11 | [API and database integration](../archive/implementation-records/api-database-integration.md); [browser E2E](../archive/implementation-records/end-to-end-testing.md) |
| CW-05 Peer-evaluation setup, launch, status, reset, and relaunch | FR-05, FR-07; FR-09 for persisted evaluation state | REG-CW05-01 through REG-CW05-10 | [API and database integration](../archive/implementation-records/api-database-integration.md); [email integration and remaining coverage](../archive/implementation-records/email-integration.md#7-limitations-and-remaining-coverage); [browser E2E](../archive/implementation-records/end-to-end-testing.md) |
| CW-06 Individualized evaluation link and token access | FR-06; FR-09 for persisted token relationships | REG-CW06-01 through REG-CW06-04 | [Email integration](../archive/implementation-records/email-integration.md); [browser E2E](../archive/implementation-records/end-to-end-testing.md) |
| CW-07 Evaluation invitation distribution | FR-07; FR-09 for persisted token and recipient relationships | REG-CW07-01 through REG-CW07-04 | [Email integration](../archive/implementation-records/email-integration.md); [API and database integration](../archive/implementation-records/api-database-integration.md) |
| CW-08 Student peer-evaluation submission | FR-08; FR-09 for persisted responses | REG-CW08-01 through REG-CW08-13 | [API and database integration](../archive/implementation-records/api-database-integration.md); [browser E2E](../archive/implementation-records/end-to-end-testing.md) |
| CW-09 Evaluation results review and export | FR-10; FR-09 for persisted source data | REG-CW09-01 through REG-CW09-08 | [API and database integration](../archive/implementation-records/api-database-integration.md); [browser E2E](../archive/implementation-records/end-to-end-testing.md) |

FR-09 is a cross-cutting persistence requirement: apply it where a scenario
asserts stored data or relationships, as described in the regression matrix.
The matrix also describes representative instructor and student browser
journeys; passing a journey does not cover every linked outcome unless that
outcome is observed.

## Modernization requirements and validation references

| Workflow | Related requirements | Verification reference |
| --- | --- | --- |
| MW-01 Repeatable environment setup | FR-11 documented repeatable frontend, backend, database, and service setup; FR-12 Docker/Compose configuration for MongoDB architecture | [Testing guide](../testing.md); [integration environment cases and recorded results](../archive/implementation-records/integration-test-environment.md) |
| MW-02 Automated CI validation | FR-13 CI triggering for PRs, head updates, and merge groups; FR-14 build/lint/format; FR-15 automated unit and integration tests; FR-16 Vitest and React Testing Library; FR-17 Playwright workflows; FR-18 dependency/security checks and results | [CI verification record](../archive/implementation-records/continuous-integration.md); [quality gate policy](quality-gates.md) |
| MW-03 Pull request quality gate and merge control | FR-19 failed required checks block merge; FR-20 main branch protection and required validation | [CI verification record](../archive/implementation-records/continuous-integration.md); [quality gate policy](quality-gates.md) |
| MW-04 Automated staging deployment | FR-21 deploy both staging services only from qualifying successful main merge push evidence | [CI/CD guide](../ci-cd.md); [continuous integration and delivery record](../archive/implementation-records/continuous-integration.md) |
| MW-05 Post-deployment validation | FR-22 post-deployment health checks and selected smoke tests | [Staging smoke test record](../archive/implementation-records/staging-smoke-tests.md); [testing guide](../testing.md) |
| MW-06 Pipeline and deployment evidence | FR-23 retained logs/reports for pipeline, test, security, and deployment results | [CI verification record](../archive/implementation-records/continuous-integration.md) |

FR-24 limits automated deployment to staging; FR-25 requires setup, testing,
deployment, rollback, release, and troubleshooting documentation. Consult
their RTM entries and validation sources rather than treating either as a
single automated test. Nonfunctional requirements are also detailed in the RTM.

## Other requirement groups

The RTM includes NFR-01 through NFR-11. The following references are useful
inspection or verification entry points, not newly asserted RTM case mappings
or status updates:

| Requirement group | Concise scope | Relevant inspection or verification references |
| --- | --- | --- |
| NFR-01, NFR-06, NFR-09 | Maintainable organization; traceable evidence; usable maintainer documentation | [This traceability reference](./traceability.md), [testing implementation index](../archive/implementation-records/testing-implementation-index.md), [testing guide](../testing.md), and [CI guide](../ci-cd.md) |
| NFR-02, NFR-03, NFR-07 | Repeatable results; failures stop/report; portability across supported systems and CI | [Testing guide](../testing.md), [integration environment record](../archive/implementation-records/integration-test-environment.md), and [CI verification record](../archive/implementation-records/continuous-integration.md) |
| NFR-04, NFR-05, NFR-08 | Secret handling; synthetic data and safe email; environment-specific configuration | [Development guide](../development.md), [testing guide](../testing.md), [email integration record](../archive/implementation-records/email-integration.md), and [staging smoke record](../archive/implementation-records/staging-smoke-tests.md) |
| NFR-10 | Recoverability through documented rollback where supported | [CI/CD guide](../ci-cd.md) and [CI verification record](../archive/implementation-records/continuous-integration.md) |
| NFR-11 | Preserve existing PEERS behavior and prevent workflow regressions | [Regression matrix](../archive/plans/requirements/regression-test-matrix.md) and linked integration/browser records in the workflow table above |

Constraints C-01 through C-05 are governing project boundaries rather than
automated test cases. Consult the [validated constraints](../archive/plans/requirements/validation/01-requirements-and-constraints.md#04-constraints)
and the linked source directly; the reference groups below identify where
their effects are reflected, without asserting a separate verification result:

| Constraint | Scope | Related inspection reference |
| --- | --- | --- |
| C-01, C-03 | Capstone schedule/milestones; no significant new user-facing scope | [Validated requirements and constraints](../archive/plans/requirements/validation/01-requirements-and-constraints.md); [workflow exclusions](../archive/plans/requirements/workflows/05-supporting-workflows-and-traceability.md#07-excluded-and-unsupported-workflows) |
| C-02 | Continue the inherited React, Node.js, Express, and MongoDB application | [Architecture](../architecture.md), [development guide](../development.md), and [integration environment record](../archive/implementation-records/integration-test-environment.md) |
| C-04 | Do not expose credentials or real environment values | [Validated requirements and constraints](../archive/plans/requirements/validation/01-requirements-and-constraints.md); [development guide](../development.md) |
| C-05 | Production hosting/access/release authorization remains subject to sponsor confirmation | [Validated requirements and constraints](../archive/plans/requirements/validation/01-requirements-and-constraints.md); [acceptance and document usage](../archive/plans/requirements/validation/02-acceptance-and-document-usage.md#06-exclusions) |

Acceptance criteria AC-01 through AC-10 are in the [acceptance source](../archive/plans/requirements/validation/02-acceptance-and-document-usage.md#05-acceptance-criteria).
The table identifies the closest workflow or verification group where the
source supports a relationship; it does not restate acceptance or claim a
criterion has passed.

| Acceptance criterion | Related workflow or verification reference |
| --- | --- |
| AC-01 Development environment | MW-01; [setup and integration environment references](#modernization-requirements-and-validation-references) |
| AC-02 Continuous integration | MW-02; FR-13 through FR-18 and CI record |
| AC-03 Quality gates | MW-03; FR-19 and FR-20 and CI record |
| AC-04 Automated testing | CW-01 through CW-09 regression targets; MW-02 / FR-15 and FR-17 for automated suite execution |
| AC-05 Continuous delivery | MW-04; FR-21 and CI/CD references |
| AC-06 Staging reachability and health | MW-04 and MW-05; FR-21 and FR-22, with staging smoke references |
| AC-07 Post-deployment critical workflow smoke test | MW-05; FR-22 and the staging smoke record. The approved selected workflow is not further asserted here. |
| AC-08 Staging email privacy | CW-07 / FR-07; email integration and staging configuration references. The current staging smoke checks do not send email. |
| AC-09 Demonstration evidence | MW-06; FR-23 and CI verification record |
| AC-10 Documentation and handoff | FR-25; [setup](../getting-started.md), [development](../development.md), [testing](../testing.md), and [CI/CD](../ci-cd.md) guides |

## Representative mapped test cases

These examples retain the case-to-target links explicitly recorded in the
implementation records. They are navigation aids, not a complete suite list
or a claim that every target is covered.

| Stable case | Recorded mapping | Source record |
| --- | --- | --- |
| TC-UNIT-FE-001 | Frontend login route rendering; FR-16 tool/framework case | [Frontend unit record](../archive/implementation-records/frontend-unit-testing.md#4-test-cases) |
| TC-INT-001 | Course create/retrieve; REG-CW02-01, FR-02 | [API/database integration](../archive/implementation-records/api-database-integration.md#4-test-cases) |
| TC-INT-008 | CSV import and selected-course reset; REG-CW03-01, REG-CW03-02, REG-CW03-04, FR-03 | [API/database integration](../archive/implementation-records/api-database-integration.md#4-test-cases) |
| TC-E2E-004 | Professor login and course visibility; REG-CW01-01, FR-01 | [End-to-end record](../archive/implementation-records/end-to-end-testing.md#4-test-cases) |
| TC-E2E-010 | Instructor course/roster/team/evaluation launch journey; REG-CW02-01/02, CW03-01, CW04-01, CW05-01/03; FR-02 through FR-05 | [End-to-end record](../archive/implementation-records/end-to-end-testing.md#4-test-cases) |
| TC-E2E-011 | Student invitation and submission; REG-CW06-01, CW08-01, CW08-05; FR-06 and FR-08 | [End-to-end record](../archive/implementation-records/end-to-end-testing.md#4-test-cases) |
| TC-INT-040 | Repeat POST does not overwrite completed response; REG-CW08-05, FR-08 | [API/database integration](../archive/implementation-records/api-database-integration.md#4-test-cases) |
| TC-E2E-012 | Results and CSV export; REG-CW09-01/02/07, FR-10 | [End-to-end record](../archive/implementation-records/end-to-end-testing.md#4-test-cases) |
| ENV-32-01 | Disposable-stack service readiness and database ping; FR-12 | [Integration environment record](../archive/implementation-records/integration-test-environment.md#2-test-cases) |
| TC-SS-01 | Backend health endpoint reports connected database; FR-22 | [Staging smoke record](../archive/implementation-records/staging-smoke-tests.md) |

## Evidence limits

The RTM and test records preserve earlier classifications and dated results;
they do not state that tests were rerun for this documentation handoff or at
the current revision. Regression scenarios specify expected results and
planned layers. They are not coverage reports. “Implemented,” “Tested,”
“Verified,” and CI enforcement have distinct meanings as defined by the
individual source records. Review those records for the scope, date, revision,
and limitations of any execution evidence. For example, the recorded local
unit, integration, and browser results in the testing index are explicitly
historical, and the browser record notes a teardown error despite its passing
cases.
