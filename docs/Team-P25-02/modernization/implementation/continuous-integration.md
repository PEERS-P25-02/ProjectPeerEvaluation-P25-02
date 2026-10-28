# Continuous Integration: Build, Lint, Tests, and Coverage

**Status:** Nine CI jobs are configured: Frontend Build, Lint and Formatting, Unit Tests, Integration Tests, End-to-End Tests, Regression Checks, Unit Test Coverage, OWASP Dependency-Check, and Gitleaks Secret Scan. Local integration and E2E results are recorded below. Hosted results for the three new jobs, Regression Checks failure behavior, and required-check configuration have not been verified. Coverage reports are uploaded separately; no minimum threshold is enforced.

## 1. Workflow

GitHub Actions runs on pushes to all branches and pull requests targeting `main`. The workflow has nine jobs. Frontend Build, Lint and Formatting, Unit Tests, Integration Tests, End-to-End Tests, and Regression Checks are separate jobs; the remaining jobs collect unit coverage and run dependency and secret scans. The build, quality, unit-test, and coverage jobs use Node 24. The build installs root dependencies; each of the quality, unit-test, and coverage jobs installs both package lockfiles, for seven `npm ci` commands per run. Integration Tests invokes `npm run test:integration`; End-to-End Tests invokes `npm run test:e2e`. Their runners build dependencies and services inside Docker images. Each uploads its corresponding `test-results/` directory after the test step runs or fails; missing files fail the artifact upload. Regression Checks summarizes unit, integration, and E2E job outcomes and fails unless each is `success`; it does not rerun tests. The Unit Tests job runs frontend and backend `npm test`; Unit Test Coverage runs both coverage commands, executing those suites a second time. Frontend and backend coverage artifacts remain separate; neither package has a percentage threshold. Staging deployment checks remain outside this workflow.

Unit suites use in-memory or mocked state and do not require live MongoDB or SMTP. Integration-test environment and execution details are in [the integration-test guide](testing/integration-test-environment.md) and [the API/database integration record](testing/api-database-integration.md).

## 2. Verification Cases

| ID | Procedure | Expected result |
| --- | --- | --- |
| CI-45-01 | Install locked frontend dependencies and run `npm run build`. | The Vite production build exits 0. |
| CI-45-02 | Install locked frontend dependencies and run `npm run lint`. | ESLint exits 0; configured violations fail the job. |
| CI-45-03 | Install locked frontend dependencies and run `npm test`. | Frontend Vitest tests pass; failed assertions fail the job. |
| CI-45-04 | Install locked backend dependencies and run `npm --prefix src/backend test`. | Backend Vitest tests pass; failed assertions fail the job. |
| CI-45-05 | Open a pull request targeting `main` and inspect the Actions and Checks results. | The workflow runs and reports each configured job independently. |
| CI-45-06 | Inspect the workflow after a merge to `main`. | A push to `main` starts the workflow and reports its result. |
| CI-45-07 | Install locked frontend dependencies and run `npm run format:check`. | Prettier exits 0 when checked files match the configured format. |
| CI-45-08 | Run frontend and backend coverage commands and inspect generated summaries and uploaded artifacts. | Coverage is reported and retained as artifacts without enforcing a minimum. |
| CI-46-01 | Inspect an Integration Tests run and its uploaded artifact. | The isolated integration suite and cleanup succeed, and the result artifact is retained. |
| CI-46-02 | Inspect an End-to-End Tests run and its uploaded artifact. | The browser suite and cleanup succeed, and the result artifact is retained. |
| CI-46-03 | Cause one of Unit Tests, Integration Tests, or End-to-End Tests to fail, then inspect Regression Checks and its summary. | The summary reports all three outcomes and Regression Checks fails unless each is `success`. |
| CI-46-04 | Inspect repository rules for required check names after the workflow is available. | Required-check configuration matches the approved merge policy. |

These cases describe expected workflow behavior. Recorded evidence and its limits appear below.

## 3. Recorded Evidence and Limits

CI-46 local runs on the issue branch executed `npm run test:integration` (176/176 tests in 12 files) and `npm run test:e2e` (13/13 tests). Integration run `0279194adb9f7006` is recorded in `test-results/integration/0279194adb9f7006/result.json`; E2E run `90c105b093714fd3` is recorded in `test-results/e2e/90c105b093714fd3/result.json`. Both result files report exit code 0 and `cleanupVerified: true`. Local shell simulations of the Regression Checks condition returned 0 when all three outcomes were `success`, and 1 when an outcome was `failure` or `skipped`. These local results do not verify hosted job execution, artifact uploads, hosted controlled-failure behavior, or repository required-check configuration.

Historical workflow evidence was a visible Checks screenshot reporting successful build, lint, frontend-test, and backend-test jobs for a pull-request workflow. Formatting was added later; the record contains no fresh result for that job. The screenshot did not retain individual logs or test counts. It does not demonstrate required-check enforcement, a post-merge run on `main`, or that a failing check blocks a merge. Those properties must be verified through repository settings and a controlled workflow observation if evidence is needed.

The current workflow source confirms nine jobs and the configured commands. `npm run lint` does not set `--max-warnings=0`, so warnings alone do not fail its job. Coverage collection is configured, but no coverage floor is active. The historical screenshot does not prove the current workflow's latest run status.

Functional regression-matrix completeness and staging deployment are outside this workflow's configured jobs. The integration and E2E jobs do not establish complete regression-matrix coverage. Security scanning is configured in separate jobs; branch-protection and required-check enforcement remain repository settings. See the [unit-testing record](testing/unit-testing.md) for the unit-suite scope and historical results.
