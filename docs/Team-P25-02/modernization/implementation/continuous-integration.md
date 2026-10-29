# Continuous Integration: Build, Lint, Tests, and Coverage

**Status:** Nine CI jobs are configured: Frontend Build, Lint and Formatting, Unit Tests, Integration Tests, End-to-End Tests, Regression Checks, Unit Test Coverage, OWASP Dependency-Check, and Gitleaks Secret Scan. Local integration and E2E results are recorded below. The first hosted PR #138 run (40735605439) failed while MongoDB started in both service-backed jobs; cleanup was verified and both result artifacts uploaded. Those jobs now pin Ubuntu 22.04, with the compatibility rerun outcome pending. Regression Checks failure behavior and required-check configuration have not been verified. Coverage reports are uploaded separately; no minimum threshold is enforced.

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

### E2E BuildKit cache trial

The E2E job now selects a CI-only Compose overlay with separate GitHub Actions cache scopes for its backend, frontend, and Playwright images. The Buildx setup and GitHub runtime helper expose the builder and cache credentials. The integration job and both ordinary local Compose commands retain their existing builds and isolated runtime state.

Before this change, hosted run 40790520102 at main commit `fa78ac6` recorded 172 seconds for End-to-End Tests and 112 seconds for Integration Tests. Its E2E test execution took about 37 seconds and integration test execution about 54 seconds. On PR #140 commit `44099d8`, run 40962067003 took about 326 seconds for the initial E2E cache miss and 141 seconds for an E2E job rerun with cache hits. Both passed; the hit run reported 13 passing tests and verified cleanup. The first run's Playwright-image cache export alone took about 94 seconds. The rerun log imported cache manifests for all three images and marked build steps `CACHED`; its cache exports took under two seconds each. Compared with the single 172-second baseline, the hit run was 31 seconds faster, while the miss was 154 seconds slower. These are individual hosted observations, not a stable saving estimate; roughly five similar hit runs would offset one miss run's extra time. Integration took about 94 seconds in the trial workflow without cache changes and remains uncached because its separate benefit has not been demonstrated.

CI-46 local runs on the issue branch executed `npm run test:integration` (176/176 tests in 12 files) and `npm run test:e2e` (13/13 tests). Integration run `0279194adb9f7006` is recorded in `test-results/integration/0279194adb9f7006/result.json`; E2E run `90c105b093714fd3` is recorded in `test-results/e2e/90c105b093714fd3/result.json`. Both result files report exit code 0 and `cleanupVerified: true`. The first hosted PR #138 run (40735605439) failed during MongoDB startup in Integration Tests and End-to-End Tests; cleanup was verified and both result artifacts uploaded. The jobs now pin Ubuntu 22.04; that hosted compatibility outcome is pending. Local shell simulations of the Regression Checks condition returned 0 when all three outcomes were `success`, and 1 when an outcome was `failure` or `skipped`. Hosted controlled-failure behavior and repository required-check configuration remain unverified.

Historical workflow evidence was a visible Checks screenshot reporting successful build, lint, frontend-test, and backend-test jobs for a pull-request workflow. Formatting was added later; the record contains no fresh result for that job. The screenshot did not retain individual logs or test counts. It does not demonstrate required-check enforcement, a post-merge run on `main`, or that a failing check blocks a merge. Those properties must be verified through repository settings and a controlled workflow observation if evidence is needed.

The current workflow source confirms nine jobs and the configured commands. `npm run lint` does not set `--max-warnings=0`, so warnings alone do not fail its job. Coverage collection is configured, but no coverage floor is active. The historical screenshot does not prove the current workflow's latest run status.

Functional regression-matrix completeness and staging deployment are outside this workflow's configured jobs. The integration and E2E jobs do not establish complete regression-matrix coverage. Security scanning is configured in separate jobs; branch-protection and required-check enforcement remain repository settings. See the [unit-testing record](testing/unit-testing.md) for the unit-suite scope and historical results.
