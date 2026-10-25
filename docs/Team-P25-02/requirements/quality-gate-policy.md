# Quality Gate Policy

**Policy status:** The preservation scope and pass/fail rules are agreed. The CI workflow is configured with six jobs, including dependency-vulnerability and secret scans; hosted success and security-gate activation are not established. The active main-branch ruleset still requires eight legacy check names and must be migrated to **Frontend Build**, **Lint and Formatting**, **Unit Tests**, and **Unit Test Coverage** before merge. Security checks are planned for later activation as required gates. Planned gates and verification cases below remain unimplemented unless marked current. This policy supplements the [Automated Testing Strategy](../modernization/plans/automated-testing-strategy/README.md), [critical workflow scope](workflows/01-scope-and-classification.md), and [CI verification record](../modernization/implementation/continuous-integration.md). It does not change approved requirements or claim that the separate SWE 4724 course document was updated.

## 1. Scope and pass/fail rules

The functional preservation target is CW-01 through CW-09, including evaluation reset within CW-05. The 32 selected API operations are OP-33-01 through OP-33-23 and OP-33-25 through OP-33-33. OP-33-24 (standalone reminders) and OP-33-34 through OP-33-36 (account support) are excluded from this targeted coverage scope. See the [API/database integration guide](../modernization/implementation/testing/api-database-integration.md) and [operation inventory](../modernization/implementation/testing/api-database-operation-inventory.md) for the operation scope and cases. This does not exclude their existing tests: every existing test must continue to pass. Security checks apply to the entire repository, regardless of functional coverage scope.

A pull request passes only when every activated required check completes successfully, required evidence is retained, and no unapproved or expired exception remains. Missing, unexpectedly skipped, cancelled, inconclusive, or report-less checks are not passes. Test failures, unapproved High/Critical findings, exposed credentials, and expired exceptions block. Repository administrators must configure selected GitHub checks as required for merge; a passing workflow run alone does not prove that branch protection is active. Advisory checks must be labeled and cannot substitute for an inactive required gate.

## 2. Current checks and planned gates

The workflow is `.github/workflows/ci.yml`. The workflow has six jobs: frontend build, combined lint and formatting, unit tests, unit coverage, OWASP Dependency-Check, and Gitleaks. The build installs root dependencies; each of the quality, unit-test, and coverage jobs installs root and backend dependencies, for seven `npm ci` commands per workflow run, down from ten. Unit tests and coverage are separate jobs; coverage commands run the suites again to produce their reports. Frontend and backend reports remain separate artifacts with no minimum threshold. A separately delivered scheduled database updater in `.github/workflows/security.yml` is a prerequisite for the OWASP Dependency-Check CI job, which scans both npm lockfiles from its shared database cache; Gitleaks scans repository changes for secrets. Coverage jobs produce reports but enforce no minimum. Lint does not currently enforce zero warnings, and warning-free formatting verification is pending. The workflow still has no integration or E2E job. Repository settings must mark selected checks as required to enforce them for merges; workflow configuration alone does not prove this is set.

The root command `npm run test:integration` provisions an isolated test environment and runs the implemented API/database integration suite. See the [environment guide](../modernization/implementation/testing/integration-test-environment.md) and [API/database integration guide](../modernization/implementation/testing/api-database-integration.md). This command is available locally; integration execution is not part of the current CI workflow. SMTP capture does not establish external mail-provider delivery; detailed email scenarios remain separately planned. Browser E2E execution and its CI job remain planned.

| Gate | Current GitHub job / command / tools | Policy pass rule | State |
| --- | --- | --- | --- |
| Dependency installation | **Frontend Build**, **Lint and Formatting**, **Unit Tests**, and **Unit Test Coverage** / installs the root package in the build job and both packages in each quality, unit-test, and coverage job with `npm ci` | Both lockfile installs succeed. | Current |
| Production build | **Frontend Build** / `npm run build` / Vite | Production build succeeds. | Current |
| Lint | **Lint and Formatting** / `npm run lint` / ESLint | No lint errors or warnings. Configure zero-warning enforcement before treating warnings as failures. | Current command; zero-warning enforcement planned |
| Formatting | **Lint and Formatting** / `npm run format:check` / Prettier | No formatting differences or Prettier configuration warnings/errors. | Current command; warning-free behavior verification pending |
| Frontend unit tests | **Unit Tests** / `npm test` / Vitest, React Testing Library, jsdom | All required tests pass; no required suite is missing or empty, and no focused or unapproved skipped tests remain. | Current |
| Backend unit tests | **Unit Tests** / `npm test` in `src/backend` / Vitest | All required tests pass; no required suite is missing or empty, and no focused or unapproved skipped tests remain. | Current |
| Frontend coverage | **Unit Test Coverage** / `npm run test:coverage` / Vitest V8 coverage | Retain report and apply only an approved, mapped floor. | Current informational job; floor inactive |
| Backend coverage | **Unit Test Coverage** / `npm run test:coverage` in `src/backend` / `vitest.coverage.config.mjs`, V8 coverage, `assertCoverage` guard | Tests and report-integrity guard pass; retain report and apply only an approved, mapped floor. | Current report-integrity check; numerical floor inactive |
| Dependency vulnerabilities | **OWASP Dependency-Check** / `owasp/dependency-check:13.0.0`; scheduled updater in `.github/workflows/security.yml`; CI scans root and backend `package-lock.json` files, including development dependencies | A completed database refresh is available and no older than 48 hours; both HTML/JSON reports are validated and retained; findings with CVSS 7.0 or higher fail. | Added on this branch; hosted verification pending |
| Secret scan | **Gitleaks Secret Scan** / Gitleaks CLI v8.30.1; complete PR/push commit ranges | Detected secrets or scanner errors fail the job. Findings are redacted in output; no PR comments or finding artifacts are created. | Added on this branch; hosted verification pending |
| Integration | Local `npm run test:integration` / Vitest, Docker Compose, MongoDB, Mailpit | Required cases pass against isolated services; readiness, setup, and run-scoped cleanup succeed. | Local command and suites implemented; CI job planned |
| E2E | Planned Playwright suite and CI job | Every required approved journey passes with retained evidence. | Planned; no CI job |
| CodeQL/static analysis | CodeQL activation and required-result handling remain to be implemented | Required analysis completes, results are retained, and findings are evaluated under severity and exception policy. | Proposed; no CI job |

Dependabot weekly version-update configuration exists for both npm package directories and groups production and development updates. The repository's Dependabot alert and security-update settings have not been verified. Dependency maintenance and alerts do not replace OWASP Dependency-Check or constitute a blocking CI gate.

## 3. Coverage measurement and targets

Keep the four instrumented metrics—statements, lines, functions, and branches—separate for frontend and backend. Never combine package percentages or add unit and integration percentages as if they were a deduplicated total. Numerical frontend and backend floors remain **inactive** until the relevant code is mapped precisely to the approved workflow scope and measurements are reviewed and approved. Whole-file or package-wide measurements are not proxies for workflow coverage. The backend coverage command uses `vitest.coverage.config.mjs` and an `assertCoverage` guard; the frontend and backend configured reports remain code metrics, not counts of verified workflows.

Once approved measurements exist, establish each initial floor from its reviewed baseline using raw counters or precision agreed in advance. Include newly added production files in the relevant denominator. Do not round down, introduce an unapproved buffer, lower a floor through a pull request, or evade it by changing exclusions or instrumentation. The reviewed baseline is a no-regression floor; subsequent ratchets may only move upward through review. Rebaseline only after documenting and approving changes to scope, mapping, or instrumentation.

Maintain finite, reviewed targets for workflow scenarios, API operations, requirements, and risk controls separately from instrumented code metrics. The aspiration is to cover 100% of feasible scoped production code and every approved finite target. Link each approved item to its expected outcome, test, verification layer, and evidence. This is not a guarantee of every theoretical program path. Keep API-operation coverage distinct from HTTP status and input/authentication scenarios. Forecast code floors only after precise source/workflow mapping, planned test-to-source additions, and reviewed measurements; state assumptions and uncertainty. The [operation inventory](../modernization/implementation/testing/api-database-operation-inventory.md) defines API scope; the [integration guide](../modernization/implementation/testing/api-database-integration.md) records implemented cases and known limits.

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

The CI scanner only restores this shared cache; it fails with a reseed instruction if no completed cache exists, the database or success timestamp is missing, or the timestamp is malformed, in the future, or older than 48 hours. Run **Update Dependency-Check Database** manually on the default branch after that workflow is present on the default branch to seed CI. PR and push scans do not need the NVD secret and do not update or save the database. Internet access remains necessary for updater runs and npm advisories; the Node Audit analyzer still sends lockfile data to the npm Audit API.

The updater requires `NVD_API_KEY`; it does not fall back to a public mirror. Create a key through NVD, activate it using the email link, then add it under **Settings → Secrets and variables → Actions → New repository secret** as `NVD_API_KEY`. Dependabot and external fork PRs do not receive Actions secrets, but their CI scans consume the shared cache and need no NVD key. Keep key values out of source and logs.

Gitleaks is the blocking secret-scan job. The pinned CLI scans the complete base-to-head PR range or before-to-after push range using local Git history, including merge changes. It does not depend on a paginated GitHub commit listing. New branches scan the history reachable from their head; branch deletion events have no new content and do not run this job. It redacts findings in output and does not post comments or upload finding artifacts. GitHub's repository-level secret-scanning alert configuration is a separate setting; its state has not been verified. Ordinary PR/push ranges do not establish that the entire repository history is free of secrets.

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

The source configuration establishes six CI jobs, local API/database integration commands, separate frontend/backend coverage reports, and weekly Dependabot version updates for both npm packages. A separately delivered scheduled Dependency-Check database updater is a prerequisite for the CI scanner cache. The two security jobs require passing hosted runs before they can be described as verified. The available source does not establish that repository rules require these jobs, that Dependabot alerts/security updates or GitHub secret-scanning alerts are enabled, or that planned integration/E2E jobs are active. No local security scan or controlled-failure result is asserted here.

For each future run, retain the source revision, tool/configuration versions, exact command or check name, outcome, report/evidence location, and relevant exception disposition. Preserve prior evidence as historical; do not present it as a fresh run or as proof of a different baseline. See the [CI verification record](../modernization/implementation/continuous-integration.md), [isolated environment guide](../modernization/implementation/testing/integration-test-environment.md), [API/database integration guide](../modernization/implementation/testing/api-database-integration.md), and [API operation inventory](../modernization/implementation/testing/api-database-operation-inventory.md) for their respective scope and evidence.

**Implementation status:** The active main-branch ruleset currently requires eight legacy check names. Before merging this workflow, administrators must replace them with **Frontend Build**, **Lint and Formatting**, **Unit Tests**, and **Unit Test Coverage**; the replaced standalone install, lint, frontend/backend unit, coverage, and formatting names will no longer report. The two security jobs remain outside the required set pending planned activation; hosted results are not established. CI integration/E2E jobs and failure-gate proof remain incomplete. This policy does not claim those implementations or proofs are complete.
