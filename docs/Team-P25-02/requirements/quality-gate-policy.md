# Quality Gate Policy

**Policy status:** Pull-request CI runs both complete unit suites once with coverage, selects API integration coverage and browser E2E execution conservatively, and enforces an approved 80% changed-executable-line minimum. A valid report below the minimum fails without automatic API broadening. The functional regression targets remain unchanged. Full pre-merge queue validation, overall coverage floors, and activation of protected-main settings remain deferred. Push-to-main CI, post-merge verification, and deployment are deferred to Milestone 3. See the [CI guide](../developer-guides/continuous-integration.md) and [verification record](../modernization/implementation/continuous-integration.md).

## 1. Scope and pass/fail rules

The functional preservation target is CW-01 through CW-09, including evaluation reset within CW-05. The 32 selected API operations are OP-33-01 through OP-33-23 and OP-33-25 through OP-33-33. OP-33-24 (standalone reminders) and OP-33-34 through OP-33-36 (account support) are excluded from this targeted functional-operation scope. See the [API/database integration guide](../modernization/implementation/testing/api-database-integration.md) and [operation inventory](../modernization/implementation/testing/api-database-operation-inventory.md) for the operation scope and cases. This does not exclude their existing tests: every existing test must continue to pass. Security checks apply to the entire repository, regardless of functional coverage scope.

A pull request passes only when every activated required check completes successfully, required evidence is retained, and no unapproved or expired exception remains. `CI Gate` evaluates selection, build, quality, security, tests, and patch coverage. An application test job may be skipped only when the selector explicitly chose no execution for that job. Missing, unexpectedly skipped, cancelled, inconclusive, or report-less required checks are not passes. Test failures, unapproved High/Critical findings, exposed credentials, and expired exceptions block. Selected PR execution does not establish that every unselected test would pass.

Repository administrators must activate a ruleset requiring the final check to enforce merges. The last live settings inspection found the main ruleset disabled, with legacy check names; workflow success does not establish merge protection. Settings migration and merge-queue activation are deferred to the next implementation stage.

## 2. Current checks and planned gates

The PR workflow is `.github/workflows/ci.yml`. It targets `main`, without workflow-level path filtering. Documentation-only changes have an explicit no-application-test outcome while build, quality, security, and the final gate still run. Code PRs run the entire frontend and backend unit suites with coverage once. Selected API integration tests and browser E2E tests use isolated Docker Compose environments, MongoDB, Mailpit, and synthetic data. API integration contributes backend runtime coverage; browser E2E validates journeys without contributing coverage. One Changed-Line Coverage job combines unit reports with selected API coverage and fails when valid coverage is below 80%; it does not automatically broaden API testing. Malformed or missing reports fail instead of being treated as an ordinary low percentage.

| Gate | Pass rule | Status |
| --- | --- | --- |
| Locked dependency installation | Every attempted `npm ci` succeeds. | Configured |
| Frontend Build | `npm run build` succeeds. | Configured |
| Lint and Formatting | ESLint and Prettier checks succeed. Zero-warning enforcement remains a separate planned policy item. | Configured |
| Unit Tests | Both complete coverage-enabled unit suites pass for code changes; required reports exist. | Configured |
| API Integration Tests | Selected API cases, service readiness, backend coverage capture, and cleanup succeed; evidence is retained. | Configured |
| Browser E2E Tests | Selected journey cases, service readiness, and cleanup succeed; evidence is retained. Browser execution does not contribute coverage. | Configured |
| Patch coverage | At least 80% of changed executable application lines are covered. Invalid/missing evidence fails. No executable changes are explicitly not applicable. | Approved numerical PR gate |
| OWASP Dependency-Check | Database freshness, report integrity, and existing CVSS 7.0 blocking policy pass. | Configured |
| Gitleaks Secret Scan | PR-range scanning succeeds with no exposed secrets; scanner errors fail. | Configured |
| CI Gate | Every required job has the expected result; only explicitly unselected work may be skipped. | Configured; repository enforcement requires settings activation |
| Full merge-group tests and overall floors | Complete candidate suites and approved per-package floors pass before merge. | Next stage; not active |
| CodeQL/static analysis | Required analysis and severity evaluation complete. | Planned; no job added here |

Dependabot configuration exists for both npm packages. Its alerts and security-update settings are independent of the required OWASP scan. Invitation integration verifies isolated message capture and failure handling, not delivery through an external mail provider.

## 3. Coverage measurement and targets

The sponsor's historical Milestone 2 target is 70–80% coverage of code mapped to critical workflows, primarily backend business logic, authentication, evaluation calculations, roster processing, and core API endpoints. Preserve that scoped target as historical requirement evidence; a whole-application percentage does not demonstrate its achievement.

The revised application code measurement includes production JavaScript/JSX across the frontend and backend, including unvisited files with zero hits. The reviewed manifest in `scripts/coverage/policy.json` defines the denominator and exclusions for tests, tooling, generated output, and non-runtime maintenance helpers. CSS, HTML, and assets are outside JavaScript execution metrics. New production files enter the denominator automatically. Exclusion or instrumentation changes require review and must not be used to evade a floor.

The approved PR minimum is **80% of changed executable lines**, compared with the merge-base of the recorded PR base and tested PR head. No executable changes are explicitly not applicable, not an invented 100% measurement. Coverage report completeness and source identity are checked before evaluating the percentage. Frontend/backend unit execution and API integration runtime coverage are combined by source identity, not by averaging percentages; browser E2E execution is excluded. The reports remain separate for frontend and backend and preserve lines, statements, functions, and branches.

Overall frontend/backend floors remain **inactive** until complete suite measurements are reviewed and exact per-metric values and comparison precision are approved. Selected PR reports must not establish those baselines. The next stage will enforce complete merge-group coverage before merge. No whole-application floor or reduction buffer is introduced by this PR gate.

The suites remain independently runnable. The backend unit-specific `assertCoverage` checks remain distinct from combined-report validation; a unit fixture's expected zero-hit function cannot constrain runtime coverage. Frontend unit coverage uses original-source Istanbul counters. Backend unit coverage is collected from V8 and normalized to Istanbul for the canonical report; API runtime capture uses V8. Reporting instrumentation must preserve original source locations, verify per-source hashes, and reject incompatible evidence.

Workflow scenarios, API operations, requirements, and risk controls remain separate finite targets. Maintain their test mappings and execution evidence in the regression matrix, RTM, and testing records. An instrumented line hit does not prove a workflow assertion or requirement outcome. Preserve the [operation inventory](../modernization/implementation/testing/api-database-operation-inventory.md) and [regression matrix](regression-test-matrix.md) independently of code percentages.

## 4. Test planning and traceability

Record each test before execution with a stable ID, workflow/requirement or risk link, actor and preconditions, synthetic fixture, action, observable expected result, test level, owning test, and evidence location. Include positive, negative, boundary, authorization, data-integrity, and recovery cases as appropriate. Unclear expected behavior remains an open question or defect until resolved; it must not silently become a passing expectation.

Map all nine workflows to tests at the appropriate unit, integration, and E2E layers. Keep supporting behavior when it is needed to establish a critical workflow outcome or control. Use synthetic or approved de-identified data and isolated services; tests must not send email to real recipients.

The following nine scenario families are planning guidance, not a complete or executed catalog:

| Workflow | Scenario families |
| --- | --- |
| CW-01 Authentication and authorized access | Valid and invalid authentication; missing credentials; access to owned and non-owned resources. |
| CW-02 Course management | Supported create/read/update behavior; persistence, ownership, invalid, and restricted updates. |
| CW-03 Roster processing | Valid and malformed input; course association; consistency after failure. |
| CW-04 Team organization | Membership changes; relationship consistency; correct peer-recipient source data. |
| CW-05 Evaluation setup and launch | Setup, launch, and reset; prerequisites; eligible participants and resulting state. |
| CW-06 Link/token access | Eligible context; invalid or unauthorized token; wrong-context denial. |
| CW-07 Invitation distribution | Intended recipients and valid links; delivery failure and truthful status; isolated capture. |
| CW-08 Evaluation submission | Persisted submission; invalid, self, duplicate, repeated, or concurrent submission; failure atomicity. |
| CW-09 Results and export | Authorized aggregation and export; missing/inconsistent source data; cross-course denial. |

### Planned gate-verification cases (QG-01–QG-10; not executed)

| Case | Controlled check | Expected result |
| --- | --- | --- |
| QG-01 Lint warning | Introduce a controlled lint warning and compare with clean lint. | Warning fails under the zero-warning rule; clean lint passes. |
| QG-02 Formatting | Introduce a formatting difference and verify clean output has no Prettier warnings/errors. | Difference or configuration warning/error fails; clean warning-free check passes. |
| QG-03 Test failure | Make a required assertion fail, then compare with passing required tests. | Failure blocks; passing required tests pass. |
| QG-04 Missing suite | Omit a required suite, then compare with all required non-empty suites present. | Missing/empty suite blocks; all required suites discovered and passing succeeds. |
| QG-05 Coverage floor | For each package, compare a report below its approved floor with one at/above it. | Below-floor result blocks; at/above-floor result passes using raw or pre-agreed precision. |
| QG-06 Secret and severity | Use a synthetic secret canary and controlled High/Critical finding; compare with a clean result and an allowed exception for a non-secret finding. | Exposed credential or unapproved High/Critical finding blocks. No active-credential exception is allowed. |
| QG-07 Exception expiry | Compare an expired exception with a current, approved, scoped, time-limited exception. | Expired exception blocks; an allowed exception follows recorded controls and remains visible. |
| QG-08 Service setup and cleanup | Force integration readiness/setup and cleanup failures; compare with healthy dependencies and successful cleanup. | Setup/readiness or cleanup failure blocks; successful setup, cases, and cleanup pass. |
| QG-09 Build | Cause a controlled production build failure and compare with a successful build. | Build failure blocks; successful build passes. |
| QG-10 Scanner/report | Cause scanner failure, omit a report, or leave findings unevaluated; compare with a complete evaluated report. | Failure, missing report, or unevaluated findings blocks; a complete report passes only when policy permits. |

These cases specify expected behavior only. Their safe fixtures, gate implementation, retained evidence, and execution remain pending; they do not establish failure-gate proof.

## 5. Security findings and exceptions

OWASP Dependency-Check is the required dependency scanner. The new job scans both npm lockfiles; its Node Audit analyzer sends lockfile data to the npm Audit API and includes development dependencies by default. It fails on CVSS 7.0 or above and retains HTML/JSON reports as a workflow artifact. Both reports must exist and pass the workflow's integrity checks. A scanner exit code or uploaded report alone is insufficient: the gate must evaluate findings and retain its report.

The separate `.github/workflows/security.yml` updater supports manual dispatch and is scheduled for midnight Eastern in `America/New_York`; its local schedule time respects daylight-saving changes. It runs only on the repository default branch, requires the `NVD_API_KEY` Actions secret, restores the latest completed cache for incremental updates, and saves a new immutable cache only after the update succeeds and `odc.mv.db` is nonempty. The updater allows up to six hours for an initial database build; subsequent runs reuse the database and request new or modified NVD records. Cache data contains the vulnerability database and its successful-update time, not credentials.

The CI scanner only restores this shared cache; it fails with a reseed instruction if no completed cache exists, the database or success timestamp is missing, or the timestamp is malformed, in the future, or older than 48 hours. Run **Update Dependency-Check Database** manually on the default branch after that workflow is present on the default branch to seed CI. PR scans do not need the NVD secret and do not update or save the database. Internet access remains necessary for updater runs and npm advisories; the Node Audit analyzer still sends lockfile data to the npm Audit API.

The updater requires `NVD_API_KEY`; it does not fall back to a public mirror. Create a key through NVD, activate it using the email link, then add it under **Settings → Secrets and variables → Actions → New repository secret** as `NVD_API_KEY`. Dependabot and external fork PRs do not receive Actions secrets, but their CI scans consume the shared cache and need no NVD key. Keep key values out of source and logs.

Gitleaks is the blocking secret-scan job. It scans the PR commit range with the pinned CLI and redacts findings. Missing commit objects must be fetched or scanning fails closed. It does not post comments or upload secret-finding artifacts. Repository-level secret-scanning alerts are a separate setting. A PR range scan does not certify the entire repository history.

To reproduce the authenticated dependency scan locally, run the same pinned image against both lockfiles with `NVD_API_KEY` already exported in your shell. Docker and internet access must be available. This command performs a local database update before scanning; the scheduled updater and CI cache policy do not change this local command.

```bash
mkdir -p "${TMPDIR:-/tmp}/peers-dependency-check/data" "${TMPDIR:-/tmp}/peers-dependency-check/reports"
docker run --rm \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --volume "$PWD:/src:ro" \
  --volume "${TMPDIR:-/tmp}/peers-dependency-check/data:/usr/share/dependency-check/data" \
  --volume "${TMPDIR:-/tmp}/peers-dependency-check/reports:/report" \
  --env NVD_API_KEY \
  owasp/dependency-check:13.0.0 \
  --project peers-npm-dependencies \
  --scan /src/package-lock.json \
  --scan /src/src/backend/package-lock.json \
  --format HTML \
  --format JSON \
  --out /report \
  --data /usr/share/dependency-check/data \
  --nvdApiKey "$NVD_API_KEY" \
  --failOnCVSS 7
```

The Gitleaks check runs in GitHub Actions using the pinned CLI version listed in the table.

Confirmed exposed credentials block and must be revoked or rotated; no active credential can receive an exception. Unapproved High/Critical findings block. Track Medium/Low findings with an owner and disposition. Any exception must identify the finding and scope, reason, linked issue, owner, compensating controls, approver, expiry/review date, and audit record. Exceptions are specific and time-limited; expiry blocks until remediation or approved renewal. Do not create blanket exceptions or suppress historical debt without individual review.

## 6. Evidence and implementation status

Retain the tested revision, commands, tool/configuration versions, suite selection, outcomes, coverage provenance, report locations, cleanup status, and exception disposition. Selection, unit, service-backed, and combined-report artifacts must identify the PR head SHA, workflow run, and attempt. Preserve the source manifest, normalized inputs, merge plan, per-package four-metric reports, and patch decision alongside raw captures. Preserve previous results as historical evidence rather than proof of a changed workflow. See the [CI verification record](../modernization/implementation/continuous-integration.md) for actual validation and limitations.

The current workflow does not activate branch rules, implement merge-group validation, or run after a push to main. The next implementation stage must migrate obsolete required statuses and activate reviewed protection and queue settings. No external course document or GitHub settings are updated by this policy change.
