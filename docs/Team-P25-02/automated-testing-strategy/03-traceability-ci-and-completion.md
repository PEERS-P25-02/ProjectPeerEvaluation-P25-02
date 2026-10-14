<a id="12-requirements-traceability-matrix-strategy"></a>

<a id="section-14"></a>

# Requirements Traceability Matrix Strategy

The RTM should be the control artifact connecting requirements, acceptance criteria, test cases, defects, pipeline results, and milestone evidence.

| RTM Field | Purpose |
| --- | --- |
| Requirement ID | Stable identifier such as FR-01 through FR-25 or NFR-01 through NFR-11. |
| Type | Identifies the kind of requirement. |
| Requirement / acceptance criteria | Defines exactly what behavior must be demonstrated. |
| Priority workflow | Shows which sponsor-approved workflow the requirement supports. |
| Source | Links to or references the origin of the requirement. |
| Design / component | Identifies which part of the system the code for this requirement belongs to, whether it be a subsystem, architecture component, workflow, or design element. |
| Implementation / artifact | Links to or references an artifact(s) that fulfills the requirement. |
| Test ID / level | Links to unit, integration, regression, end-to-end, or smoke tests. |
| Verification Method | Identifies the type of test(s) that will be done to verify the requirement’s fulfillment. |
| Status | Planned, implemented, passing, failing, blocked, or not applicable. |
| Evidence | Links to test source, CI run, report, issue, or milestone demonstration evidence. |
| Related defect | Links failed verification to the corresponding defect when applicable. |
| Notes | Explains any additional details relevant to the requirement. |

<a id="13-test-data-privacy-and-email-safety"></a>

<a id="section-15"></a>

# Test Data, Privacy, and Email Safety

| Area | Requirement |
| --- | --- |
| Test data selection | Use synthetic, de-identified, or sponsor-approved test data. |
| Student information | Do not place real student information in automated test fixtures unless explicitly approved and required. |
| Database isolation | Use isolated test/staging databases rather than production personal data. |
| Email safety | Use safe recipients or a staging email sandbox. |
| Reproducibility | Reset or seed data so repeated runs are reproducible. |
| Secret storage | Keep database credentials, SMTP credentials, tokens, and other environment secrets outside the repository. |
| Configuration review | Review the currently tracked backend .env file and remediate any real secrets or environment-specific values. |

<a id="14-ci-test-execution-plan"></a>

<a id="section-16"></a>

# CI Test Execution Plan

| Execution Point | Planned Validation |
| --- | --- |
| Commit / pull request | Build validation, lint/format checks, unit tests, integration tests, and agreed fast regression tests. |
| Pull request before merge | All required automated checks and quality gates must pass. |
| Main after merge | Full required CI validation and retained test/security evidence. |
| Staging deployment | Health checks, smoke tests, and selected critical workflow validation. |
| Milestone / final evidence | Results showing passed/failed tests, related defects, and traceability to requirements. |

<a id="15-current-testing-risks"></a>

<a id="section-17"></a>

# Current Testing Risks

| Risk | Impact | Planned Response |
| --- | --- | --- |
| No established backend automated test framework | Critical backend behavior cannot be reliably gated in CI. | Add framework/scripts and start with high-risk backend logic and routes. |
| Frontend testing infrastructure exists but suite maturity is unconfirmed | The team may overestimate current test coverage. | Inventory existing test files and run the current test command to establish the baseline. |
| Manual test\_api.js may be mistaken for automated coverage | A diagnostic script can pass without providing broad or repeatable validation. | Treat it as a diagnostic artifact and implement structured tests with assertions and CI-compatible exit status. |
| Expected behavior is unclear for some inherited features | Tests could automate the wrong behavior. | Confirm acceptance criteria with the sponsor before locking regression expectations. |
| Legacy code may be difficult to isolate | Unit testing may require refactoring. | Refactor carefully only where needed for maintainability/testability while preserving validated behavior. |
| Email testing could reach real users | Privacy and communication risk. | Use an approved email sandbox and synthetic recipients. |
| Environment inconsistency | Tests may pass locally and fail in CI/staging. | Correct Docker/database configuration and use documented environment-specific configuration. |

<a id="16-milestone-1-completion-criteria"></a>

<a id="section-18"></a>

# Milestone 1 Completion Criteria

| Area | Completion Criteria |
| --- | --- |
| Testing baseline | The current automated testing baseline is documented with repository evidence. |
| Existing tooling and coverage | The difference between existing test tooling, manual diagnostics, and real automated suites is clearly understood. |
| Workflow scope | Sponsor-approved or pending priority workflows are identified. |
| Expected behavior | Acceptance criteria and unresolved behavior questions are documented. |
| Test responsibilities | Unit, integration, regression, end-to-end, health, and smoke-test responsibilities are defined. |
| Tools and environments | The proposed tools and environments are identified and their current repository readiness is documented. |
| Requirements traceability | The RTM structure is defined and can link requirements to planned/implemented tests. |
| Data and safety rules | Test-data, privacy, secret-handling, and email-safety rules are documented. |
| CI execution | The CI execution plan is defined. |
| Implementation planning | Testing implementation is decomposed into Milestone 2 work, with staging health/smoke validation carried into Milestone 3. |

<a id="17-next-steps-after-milestone-1"></a>

<a id="section-19"></a>

# Next Steps After Milestone 1

| Area | Next Step |
| --- | --- |
| Frontend baseline | Inventory any existing frontend test files and run the current frontend test command to record a baseline. |
| Backend framework | Select and configure the backend automated test framework and add CI-compatible test scripts. |
| Unit and integration coverage | Build unit and integration tests for the highest-risk logic and routes. |
| Regression coverage | Build regression coverage for sponsor-approved priority workflows. |
| End-to-end coverage | Build focused Playwright instructor and student end-to-end journeys. |
| Milestone 2 CI integration | Connect required tests to GitHub Actions and merge quality gates in Milestone 2. |
| Milestone 3 staging validation | Implement staging health and smoke testing in Milestone 3. |
| Ongoing traceability | Maintain RTM status and retained test evidence throughout implementation. |

<a id="18-source-alignment"></a>

<a id="section-20"></a>

# Source Alignment

This document is based on the Project 25 specification, the PEERS Client Service Level Agreement v1.0, the Milestone 1 grading rubric, and a direct review of the current main branch of jonpauljah/ProjectPeerEvaluation-P25-02. Repository-derived statements are limited to artifacts actually observed during that review.
