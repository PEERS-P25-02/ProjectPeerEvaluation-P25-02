<a id="07-unit-testing-strategy"></a>

<a id="section-7"></a>

# Unit Testing Strategy

| Area | Requirement |
| --- | --- |
| Test selection | Prioritize pure or isolated logic that has clear inputs and expected outputs. |
| Authentication and authorization | Cover authentication and authorization decisions. |
| Evaluation links and tokens | Cover evaluation-link/token creation and validation. |
| CSV processing | Cover CSV parsing and validation rules. |
| Rubrics and scoring | Cover rubric and scoring/aggregation logic. |
| Business rules | Cover eligibility and other reusable business rules discovered in the codebase. |
| Test cases | Use positive, negative, boundary, and invalid-input cases. |
| Execution speed | Keep unit tests fast enough to run on every required CI execution. |

<a id="08-integration-testing-strategy"></a>

<a id="section-8"></a>

# Integration Testing Strategy

| Area | Requirement |
| --- | --- |
| Backend and database | Validate backend routes against a controlled MongoDB test environment. |
| Authorization | Verify protected routes with valid, invalid, missing, and insufficient authorization. |
| Data relationships | Verify course, roster, team, rubric, evaluation, response, and reporting data relationships. |
| CSV upload | Verify CSV upload behavior from request through persisted result. |
| Email integration | Send through isolated local/CI Mailpit SMTP services and assert recipients, content, and links through its API. Use mocks for isolated unit tests; keep forwarding/relay disabled. |
| Test setup and cleanup | Use synthetic data and repeatable setup/teardown. Isolate MongoDB databases and Mailpit inboxes between concurrent runs; cleanup must not remove another run's data. |
| Failure diagnosis | Produce clear failures that identify the component boundary that failed. |

<a id="09-functional-regression-testing-strategy"></a>

<a id="section-9"></a>

# Functional Regression Testing Strategy

| Area | Requirement |
| --- | --- |
| Workflow coverage | Create one or more automated checks for every sponsor-approved priority workflow. |
| Expected behavior | Do not silently treat known broken behavior as expected behavior; document it as a defect and confirm the desired behavior. |
| Defect regression coverage | When a material defect is fixed, add or update a regression test that would fail if the defect returns. |
| Before-merge validation | Run the highest-value regression checks before merge. |
| Extended validation | If some scenarios are too slow for every pull request, assign them to a documented extended CI or release-validation stage. |
| Traceability | Link regression tests back to requirements and defects through the RTM. |

<a id="10-end-to-end-testing-strategy"></a>

<a id="section-10"></a>

# End-to-End Testing Strategy

<a id="section-11"></a>

## Instructor Workflow

1. Authenticate as an authorized professor.
2. Create or access a course.
3. Upload a student roster.
4. Create or verify team assignments.
5. Create/select the correct rubric and configure an evaluation.
6. Launch/distribute the evaluation in the test environment.
7. Review completion and supported results/reporting.

<a id="section-12"></a>

## Student Workflow

1. Access the assigned evaluation link/token.
2. Complete the peer evaluation.
3. Submit the evaluation.
4. Verify expected confirmation and persisted response data.

End-to-end tests should stay focused on representative, high-value workflows rather than duplicate every lower-level test.

<a id="11-smoke-and-health-testing-strategy"></a>

<a id="section-13"></a>

# Smoke and Health Testing Strategy

| Area | Requirement |
| --- | --- |
| Frontend availability | Verify that the staging frontend is reachable. |
| Backend availability | Verify that the staging backend is reachable. |
| Health endpoint | Call the existing GET /api/health endpoint and confirm a successful health response. |
| Database connectivity | Verify that the backend can connect to the staging MongoDB database. |
| Critical workflow | Verify a small selected critical workflow after deployment. |
| Email safety | Verify authenticated staging SMTP sends to the separate Mailtrap Email Testing sandbox and does not reach real users. |
| Validation enforcement | Fail deployment validation when required health/smoke checks do not pass. |
