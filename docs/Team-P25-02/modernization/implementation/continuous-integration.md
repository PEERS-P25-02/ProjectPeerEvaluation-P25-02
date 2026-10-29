# Continuous Integration: Build, Lint, Tests, and Coverage

**Status:** The proposed selective workflow has ten jobs, including Select Regression Tests. The new selector and gate have local validation only; no hosted run of this branch is claimed. The [October 28 main run](https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/actions/runs/40790520102) passed all nine preceding jobs. Coverage reports remain separate, with no minimum threshold. Required-check configuration has not been rechecked.

## 1. Workflow

GitHub Actions runs on pushes to all branches and pull requests targeting `main`. The proposed tenth job, Select Regression Tests, maps changed paths to existing test files and records its decision in the job summary. Pushes to `main` and uncertain/shared changes run all regression test files. Documentation-only changes select none. Unit Tests, Integration Tests, and End-to-End Tests run only their selected files. The latter two still build isolated Compose environments and upload their result directories after test execution or failure. Regression Checks requires successful selection and requires each selected job to succeed; it accepts a skipped job only when selection chose no files for it. Coverage remains a separate full frontend/backend unit run with separate reports and no numerical floor. Build, quality, and security jobs are not selected by this change. Staging deployment checks remain outside this workflow.

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
| CI-SEL-01 | Change one mapped frontend or backend file, and inspect Select Regression Tests. | The summary names the affected files; selected test jobs run those files and Regression Checks succeeds only after they pass. |
| CI-SEL-02 | Change a shared, unmapped, or selector/CI file; push to `main`. | Every regression suite is selected. |
| CI-SEL-03 | Change documentation only, then introduce a deliberate failure in a selected test. | Documentation-only selection is explicit and skips regression jobs; a failing selected test causes Regression Checks to fail. |

These cases describe expected workflow behavior. Recorded evidence and its limits appear below.

## 3. Recorded Evidence and Limits

CI-46 local runs on the issue branch executed `npm run test:integration` (176/176 tests in 12 files) and `npm run test:e2e` (13/13 tests). Integration run `0279194adb9f7006` is recorded in `test-results/integration/0279194adb9f7006/result.json`; E2E run `90c105b093714fd3` is recorded in `test-results/e2e/90c105b093714fd3/result.json`. Both result files report exit code 0 and `cleanupVerified: true`. The first hosted PR #138 run (40735605439) failed during MongoDB startup in Integration Tests and End-to-End Tests; cleanup was verified and both result artifacts uploaded. The jobs now pin Ubuntu 22.04; that hosted compatibility outcome is pending. Local shell simulations of the Regression Checks condition returned 0 when all three outcomes were `success`, and 1 when an outcome was `failure` or `skipped`. Hosted controlled-failure behavior and repository required-check configuration remain unverified.

Historical workflow evidence was a visible Checks screenshot reporting successful build, lint, frontend-test, and backend-test jobs for a pull-request workflow. Formatting was added later; the record contains no fresh result for that job. The screenshot did not retain individual logs or test counts. It does not demonstrate required-check enforcement, a post-merge run on `main`, or that a failing check blocks a merge. Those properties must be verified through repository settings and a controlled workflow observation if evidence is needed.

The proposed workflow source has ten jobs; its selector and failure behavior still require hosted verification. `npm run lint` does not set `--max-warnings=0`, so warnings alone do not fail its job. Coverage collection remains configured without an active floor. The source selector can miss an affected workflow if its maintained map is wrong; broad fallback reduces that risk but cannot prove mapping completeness. A selected service-backed file still pays the Compose startup cost. The workflow remains active on pushes and pull requests, so the same head commit can produce two runs. No post-change CI-minute savings are claimed.

Functional regression-matrix completeness and staging deployment are outside this workflow's configured jobs. The integration and E2E jobs do not establish complete regression-matrix coverage. Security scanning is configured in separate jobs; branch-protection and required-check enforcement remain repository settings. See the [unit-testing record](testing/unit-testing.md) for the unit-suite scope and historical results.

## 4. Selective regression execution — local validation, October 28

The preceding [main run](https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/actions/runs/40790520102) took 493 seconds summed across its nine job durations, including 112 seconds for Integration Tests and 172 seconds for End-to-End Tests. Five recent successful runs ranged from 441 to 527 summed job-seconds. These are observed job durations, not GitHub billed minutes or post-change savings. A single E2E branch commit also produced separate [push](https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/actions/runs/40789951173) and [pull-request](https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/actions/runs/40789955678) runs.

This branch adds a pinned changed-path detector and [`scripts/selectRegressionTests.cjs`](../../../../scripts/selectRegressionTests.cjs). The selector's current inventory contains 9 frontend unit, 16 backend unit, 15 integration, and 6 browser test files. It selects exact changed test files, narrowly mapped frontend page tests, and report-controller tests across unit, access, API, and browser layers. Shared, unknown, deleted, invalid, or empty change sets select full suite discovery, including newly added test files. Main pushes also use full discovery. Documentation-only changes select none. Other backend controller changes select all tests because their connected impacts have not been mapped precisely enough to narrow safely. The selection job runs its own policy tests and records its reason plus exact files in selected mode. Regression Checks accepts a skipped job only when the selector chose no files for it and fails for selector failure or a selected job that did not succeed.

Local validation on the `fa78ac6` main base: 14 selector policy tests passed; YAML parsed with ten jobs; five shell simulations of the Regression Checks command matched expected success/failure; root lint and formatting passed. Full frontend unit tests passed 84/84 in 9 files, and full backend unit tests passed 143/143 in 16 files. Selected frontend Vitest ran 7 tests in one file; selected backend Vitest ran 2 tests in one file. The isolated integration runner ran `tests/integration/roster.test.js` only (12 passing tests; run `11efec53808d87ec`, exit 0, cleanup verified). The isolated E2E runner ran `tests/e2e/smoke.spec.cjs` only (2 passing tests; run `583312ecc35c187b`, exit 0, cleanup verified). Their `result.json` files and logs are under ignored `test-results/` in the worktree. Full post-change integration/E2E suites and a hosted workflow run have not been performed; no measured CI savings, selected-job artifact upload, or branch-rule enforcement is claimed.

The source-to-test map needs review whenever dependencies or tests change. Exact-file selection cannot prove that an unselected test would pass on a PR commit; full main-branch runs provide the broader check after merge. Unit Test Coverage continues to rerun all unit tests, and even one selected service-backed file incurs Compose startup. The separate push and PR triggers can still duplicate work. These limits remain material when evaluating actual cost after a hosted trial.
