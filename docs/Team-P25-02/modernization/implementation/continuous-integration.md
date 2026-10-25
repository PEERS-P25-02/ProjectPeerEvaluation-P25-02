# Continuous Integration: Build, Lint, Tests, and Coverage

**Status:** Build, lint, unit-test, formatting, and non-blocking coverage jobs are configured. Coverage reports are uploaded as workflow artifacts; no minimum threshold is enforced.

## 1. Workflow

GitHub Actions runs on pushes to all branches and pull requests targeting `main`. The current workflow has eight independent Ubuntu jobs using Node 24:

- install frontend and backend dependencies;
- build the frontend;
- lint the repository;
- run frontend unit tests;
- collect frontend coverage;
- run backend unit tests;
- collect backend coverage; and
- check formatting.

The jobs use the locked dependencies and the repository commands: `npm run build`, `npm run lint`, `npm test`, `npm --prefix src/backend test`, the two package coverage commands, and `npm run format:check`. A command failure returns a nonzero status and fails its job. Coverage jobs publish reports but do not enforce a percentage threshold. The workflow does not run API/database integration, browser end-to-end, dependency security scanning, or deployment checks.

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

The current workflow source confirms eight jobs and the configured commands. `npm run lint` does not set `--max-warnings=0`, so warnings alone do not fail its job. Coverage collection is configured, but no coverage floor is active. The historical screenshot does not prove the current workflow's latest run status.

Integration, functional regression, end-to-end, security scanning, staging deployment, branch protection, and required-check enforcement are outside this workflow's configured jobs. See the [unit-testing record](testing/unit-testing.md) for the unit-suite scope and historical results.
