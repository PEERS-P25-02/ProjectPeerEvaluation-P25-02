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

| Area | Progress | Remaining Action / Evidence |
| --- | --- | --- |
| Frontend baseline | Initial baseline recorded | One login-rendering test is documented with its results in [Unit Testing Implementation](../testing/01-unit-testing-implementation.md#initial-test-results). Maintain that baseline as coverage grows. |
| Backend framework | Implemented | Vitest and one-shot/watch scripts are configured. Expand the initial missing-token test to high-risk backend logic and routes. |
| Unit and integration coverage | In Progress | Two initial unit tests exist. Expand high-risk unit coverage and implement service-backed integration tests. |
| Regression coverage | Not Started | Build regression coverage for sponsor-approved priority workflows. |
| End-to-end coverage | Not Started | Build focused Playwright instructor and student end-to-end journeys. |
| Milestone 2 CI integration | Not Started | Connect package-specific commands to GitHub Actions and merge quality gates. Local command checks do not establish CI execution. |
| Milestone 3 staging validation | Planned | Implement staging health and smoke testing in Milestone 3. |
| Ongoing traceability | In Progress | Link implemented artifacts, test IDs, and evidence in the RTM; retain results as coverage grows. |

<a id="18-source-alignment"></a>

<a id="section-20"></a>

# Source Alignment

This document is based on the Project 25 specification, the PEERS Client Service Level Agreement v1.0, the Milestone 1 grading rubric, and a direct review of the current main branch of jonpauljah/ProjectPeerEvaluation-P25-02. Repository-derived statements are limited to artifacts actually observed during that review.
