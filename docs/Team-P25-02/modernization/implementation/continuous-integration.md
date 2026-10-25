# Continuous Integration: Build, Lint, Tests, and Coverage

**Status:** Five CI jobs are configured: Frontend Build, Lint and Formatting, Unit Tests and Coverage, OWASP Dependency-Check, and Gitleaks Secret Scan. Coverage reports are uploaded separately; no minimum threshold is enforced. Security hosted success and required-check activation are not established.

## 1. Workflow

GitHub Actions runs separately on pushes to all branches and pull requests targeting any branch, including stacked pull requests. Updates to a branch with an open pull request trigger both runs. The workflow has five jobs: Frontend Build, Lint and Formatting, Unit Tests and Coverage, OWASP Dependency-Check, and Gitleaks Secret Scan. The first three use Node 24. The build installs root dependencies, while the quality and test jobs each install both package lockfiles, for five `npm ci` commands per run instead of ten. They run `npm run build`; `npm run lint` and `npm run format:check` as separate steps; and the frontend and backend `test:coverage` commands. Each coverage command runs its package tests, avoiding duplicate unit-test execution. Explicit conditions allow formatting to run after lint failure and backend coverage to run after frontend test failure, unless the workflow is cancelled. Frontend and backend coverage artifacts are retained separately, and neither package has a percentage threshold. The workflow does not run API/database integration, browser end-to-end, or deployment checks. Its current frontend and backend unit-test execution occurs through the coverage commands; the historical CI-45 cases describe expected behavior, not separate current unit-test jobs.

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

These cases describe expected workflow behavior. Recorded evidence and its limits appear below.

## 3. Recorded Evidence and Limits

Historical workflow evidence was a visible Checks screenshot reporting successful build, lint, frontend-test, and backend-test jobs for a pull-request workflow. Formatting was added later; the record contains no fresh result for that job. The screenshot did not retain individual logs or test counts. It does not demonstrate required-check enforcement, a post-merge run on `main`, or that a failing check blocks a merge. Those properties must be verified through repository settings and a controlled workflow observation if evidence is needed.

The current workflow source confirms five jobs and the configured commands. `npm run lint` does not set `--max-warnings=0`, so warnings alone do not fail its job. Coverage collection is configured, but no coverage floor is active. The historical screenshot does not prove the current workflow's latest run status.

Integration, functional regression, end-to-end, and staging deployment are outside this workflow's configured jobs. Security scanning is configured in separate jobs; branch-protection and required-check enforcement remain repository settings. See the [unit-testing record](testing/unit-testing.md) for the unit-suite scope and historical results.
