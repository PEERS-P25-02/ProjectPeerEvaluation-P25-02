# Issue #45 — CI Build, Lint, and Unit Test Verification

**Status:** CI build, lint, unit-test, and non-blocking coverage jobs are configured; coverage reports are uploaded as workflow artifacts and no minimum threshold is enforced.
**Scope:** CI quality automation for the inherited PEERS application.  
**Related:** [Issue #45](https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/issues/45), [unit-testing implementation](01-unit-testing-implementation.md), [automated testing strategy](../automated-testing-strategy/README.md).

## 1. Testing Strategy

GitHub Actions runs on pushes to all branches and pull requests targeting `main`. Its independent Ubuntu / Node 24 jobs install locked dependencies and run: frontend production build (`npm run build`), repository-wide ESLint (`npm run lint`), frontend unit tests (`npm test`), backend unit tests (`npm --prefix src/backend test`), frontend and backend Vitest V8 coverage (`npm run test:coverage` and `npm --prefix src/backend run test:coverage`), Prettier formatting (`npm run format:check`), and existing frontend/backend dependency installation. Failed commands return nonzero exit codes and fail their jobs. Coverage jobs report and upload results but do not enforce a minimum percentage threshold.

CI ownership: Issue #45 contributor configures jobs, records executions and investigates failures; test owners maintain test cases; repository administrator selects checks required before merging into `main`. Existing unit tests use in-memory/mocked state; they do not require live MongoDB or SMTP. Frontend lint has been added using existing ESLint dependencies/configuration. Issue #85 supplies a shared root lint script (`eslint .`) with ESLint 9 flat configuration, covering frontend, backend, tests and tooling. The root `npm run format:check` script checks Prettier formatting without altering files. No code-coverage threshold is established by this issue. Formatting is independently enforced by `npm run format:check`.

Defects and unexpected red jobs should be recorded in GitHub Issues with reproduction command, affected job, logs, assignee, resolution and retest evidence. Existing unit-case details and historical local results are maintained in [01-unit-testing-implementation.md](01-unit-testing-implementation.md).

## 2. Test Cases

| ID | Purpose / prerequisites / steps | Expected result |
| --- | --- | --- |
| CI-45-01 | With Node 24 and locked frontend dependencies, run `npm ci && npm run build` at the repository root. | Vite frontend build exits 0; build job passes. |
| CI-45-02 | With Node 24 and locked frontend dependencies, run `npm ci && npm run lint`. | ESLint exits 0 when no configured rule violations occur; violations fail the lint job. |
| CI-45-07 | After integrating Issue #85, run `npm ci && npm run format:check` on Node 24. | Prettier check succeeds only when tracked JavaScript/JSX matches configuration. |
| CI-45-03 | With Node 24 and locked frontend dependencies, run `npm ci && npm test`. | Implemented frontend Vitest tests pass; failed assertions fail the job. |
| CI-45-04 | With Node 24, run `npm --prefix src/backend ci` then `npm --prefix src/backend test`. | Implemented backend Vitest tests pass; failed assertions fail the job. |
| CI-45-05 | Push the feature branch and open a PR targeting `main`; inspect Actions and PR Checks. | CI starts and independently reports all expected job statuses. |
| CI-45-06 | After an approved merge, check Actions on the push to `main`. | CI starts on `main` and reports the completed result. |

The test cases above document planned verification, **not** completed executions or passing evidence.

Coverage reports can be run locally with `npm run test:coverage`, `npm --prefix src/backend run test:coverage`, or both with `npm run test:all:coverage`. The HTML reports are written to `coverage/` and `src/backend/coverage/`; CI uploads these directories as `frontend-coverage` and `backend-coverage` artifacts.

## 3. Test Results and Remaining Gaps

| ID | Actual result / evidence | Status |
| --- | --- | --- |
| CI-45-01 | GitHub Checks for PR #83 displays Frontend Build successful on feature-branch push; pull-request workflow also reported successful. Individual build output not captured. | Passed in CI (job status) |
| CI-45-02 | GitHub Checks for PR #83 displays Frontend Lint successful on feature-branch push; pull-request workflow also reported successful. | Passed in CI (job status) |
| CI-45-03 | GitHub Checks for PR #83 displays Frontend Unit Tests successful on feature-branch push; pull-request workflow also reported successful. Test counts not captured. | Passed in CI (job status) |
| CI-45-04 | GitHub Checks for PR #83 displays Backend Unit Tests successful on feature-branch push; pull-request workflow also reported successful. Test counts not captured. | Passed in CI (job status) |
| CI-45-05 | [PR #83 Checks](https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/pull/83/checks) displays 5 successful feature-branch push jobs and a separate pull_request run; PR summary shows 10 successful checks. Run-specific URLs not recorded. | Passed (reported checks) |
| CI-45-06 | Requires approved PR merge; not yet attempted | Not run |
| CI-45-07 | New Prettier job added after PR #86 merged; awaiting fresh combined-branch GitHub Actions execution. | Pending verification |
| CI-45-08 | Run frontend and backend Vitest coverage jobs; inspect text summaries and downloaded HTML artifacts. | Configured; no threshold enforced |

**Coverage limitations:** Existing frontend/backend test suites are initial representative cases, not comprehensive behavioral coverage. Coverage percentages describe exercised code, not test adequacy, and no minimum threshold is currently enforced. Integration, functional regression, end-to-end, security-scanning and deployment validation are separate work. Backend lint is included through root `npm run lint`. Lint/build/test failures must be investigated rather than hidden or marked passing. Job statuses above are based on the visible PR Checks screenshot. Run-specific Actions URLs, individual log details, any needed failure-gate proof and post-merge main-branch execution remain to be documented before closing Issue #45.

**Handoff:** Incorporate these Section 1–3 entries into the course Test Document template if the team maintains a separate shared submitted Test Document; this file is an issue-specific addendum, not a claim that the course template has been fully updated.
