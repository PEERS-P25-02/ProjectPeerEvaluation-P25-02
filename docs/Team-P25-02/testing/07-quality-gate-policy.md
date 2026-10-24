# Quality Gate Policy (Issue #48)

**Policy status:** Agreed for the CW-01–CW-09 preservation scope. Enforcement is incomplete; planned checks below are not represented as implemented. This policy supplements the [Automated Testing Strategy](../automated-testing-strategy/README.md), [critical workflow baseline](../critical-workflow-identification/01-scope-and-classification.md), [Issue #45 CI verification](02-ci-build-lint-unit-verification.md), and [Priority Workflow Coverage Scope and Baseline Assessment](08-priority-workflow-coverage-baseline.md). It does not change the approved requirements or claim that a separate SWE 4724 course template was updated.

## 1. Testing Strategy

### Scope and gate behavior

The functional preservation target is the nine critical workflows, CW-01 through CW-09, plus the explicitly agreed evaluation reset under CW-05. Standalone reminder delivery (SW-04) and account support are not additional coverage targets. A supporting behavior is still tested where required to establish a critical workflow's outcome or risk controls. The coverage scope does not limit security checks, which apply to the repository and application as a whole.

A pull request is eligible to pass only when every activated required check is complete and passing, required evidence is attached or retained, and no unapproved exception remains. A check that is missing, skipped without an approved reason, cancelled, inconclusive, or lacks its required report is not a pass. Test failures, security findings at a blocking severity, and expired exceptions block. Optional advisory checks must be labeled advisory and cannot be presented as satisfying an unactivated required gate. Repository administrators must configure the selected GitHub status checks as required for merge; workflow execution alone does not prove branch protection.

### Current workflow and planned gates

Rows marked current use the GitHub Actions job display names in `.github/workflows/ci.yml` at the policy baseline. Rows marked proposed use stable policy labels only; they are not current GitHub job names. “Current” means configured in that workflow, not necessarily required by repository branch protection. The blocking rules are the agreed target; some require later implementation.

| Gate | Current GitHub job / command | Required pass rule | State |
| --- | --- | --- | --- |
| Dependency installation | **Install Frontend and Backend** / `npm ci` at root and `npm ci` in `src/backend` | Both locked installs succeed. Dependency and secret scanning are separate gates; install success is not a security clearance. | Current |
| Production build | **Frontend Build** / `npm run build` | Production build completes successfully. Runtime console cleanliness is not a gate in this policy. | Current |
| Lint | **Repository Lint (Frontend and Backend)** / `npm run lint` | No lint errors or warnings; configure ESLint with `--max-warnings=0` when enforcing this rule. | Current command; zero-warning enforcement planned |
| Formatting | **Prettier Formatting Check** / `npm run format:check` | No formatting differences and no Prettier configuration warnings or errors. The current command's exit status alone does not establish that process stderr is warning-free; application/test/runtime warnings are outside this formatting gate. | Current command; warning/error rule needs explicit verification |
| Frontend unit tests | **Frontend Unit Tests** / `npm test` | Every required frontend test runs and passes. No empty suites, focused tests, or unapproved skipped tests. | Current |
| Backend unit tests | **Backend Unit Tests** / `npm --prefix src/backend test` | Every required backend test runs and passes. No empty suites, focused tests, or unapproved skipped tests. | Current |
| Frontend coverage report | **Frontend Test Coverage** / `npm run test:coverage` | Report is produced and retained. Numeric floor is pending an approved baseline and threshold decision; report generation alone is not a coverage pass. | Current, informational today |
| Backend coverage report | **Backend Test Coverage** / `npm --prefix src/backend run test:coverage` | Report is produced and retained. Numeric floor is pending an approved baseline and threshold decision; report generation alone is not a coverage pass. | Current, informational today |
| Integration | **Backend Integration Tests** — proposed job name, not a current GitHub job; proposed command `npm run test:integration` from PR #99, usable only after merge and command re-verification | All required integration cases pass against isolated MongoDB and Mailpit. Readiness checks must establish dependencies are usable; setup and cleanup must be repeatable and run-scoped, including after failure. A cleanup failure fails the integration gate. Email forwarding/relay stays disabled. Suites are tracked by Issues #33–#35; Issue #46 owns CI activation. PR #100 live DB integration tests are not main evidence. | Planned; no job in current workflow |
| End-to-end | **Priority End-to-End Tests** — proposed job name; command to be defined by Issues #40/#46 | Every required priority journey and case in the approved finite catalog passes, with run evidence. No claim of testing every possible application path. | Planned; no job in current workflow |
| Dependency security | **Dependency Security** — proposed job name; exact tool and command await Issues #50/#49 | Scan direct, transitive, and development dependencies in both npm packages; retain reports and evaluate findings against the approved severity/exception policy. | Planned; no job in current workflow |
| Secret detection | **Secret Detection** — proposed job name; exact tool and command await Issues #50/#49 | Scan repository secrets; confirmed exposed credentials block and must be revoked/rotated. Retain findings and proof that gate logic evaluated them. | Planned; no job in current workflow |
| Static security analysis | **Static Security Analysis** — proposed job name; CodeQL/tool activation and required-result handling await Issues #50/#49 | Required analysis completes; retain results and evaluate High/Critical findings, exceptions, and required code-scanning status. | Planned; no job in current workflow |
| Application security | **Application Security** — proposed job name; selected ASVS-backed checks and passive ZAP scan await Issues #50/#49 | Scan isolated application; retain findings and evaluate them under the blocking/exception policy. A successful scanner upload alone is not proof that findings were evaluated or blocking rules passed. | Planned; no job in current workflow |

The current workflow has no integration, E2E, or security job. Proposed names above are policy labels, not current GitHub check names; only the existing jobs in `.github/workflows/ci.yml` are current. Coverage jobs upload reports but enforce no minimum. A scanner job succeeding or uploading an artifact does not prove its findings severity/exception rules or required code-scanning results were evaluated; Issues #50 and #49 must implement and verify that evaluation. Do not edit historical CI assessments to imply this policy is already implemented.

### Coverage measurement and thresholds

Coverage is evidence for review, not a substitute for behavior-focused cases or requirements traceability. These diagnostics are from main baseline commit `4a731b03677ae327f402de881db3d66bd21cbef5`, using Node 24.21, npm 11.19, Vitest 5.0.5, and `@vitest/coverage-v8` 5.0.5. The frontend diagnostic is whole-application scope, not a priority-only floor; code-to-workflow/function mapping is not yet precise enough to set the scoped floor. The backend function counter is invalid as described in Section 3. No numeric priority-only floor is approved. Set each initial floor at its measured baseline, compared using raw counters or a documented precision fixed before approval; do not round down or add an unapproved buffer. Ratchet floors upward through reviewed changes. A floor cannot be lowered on a pull request or evaded by excluding files, changing instrumentation, or moving code between packages. Changes to scope, exclusions, instrumentation, or baseline require a documented review and rebaseline approval.

Include new production files in the relevant denominator. Maintain a stable, reviewed mapping from workflow behavior to implementing source files and tests. The 32 selected priority operations are OP-33-01–OP-33-23 plus OP-33-25–OP-33-33; OP-33-24 reminder and OP-33-34–OP-33-36 account-support operations are outside this functional coverage target, though all existing tests must still pass. Main commit `4a731b03677ae327f402de881db3d66bd21cbef5` mounts all 32 method/path operations; route files were byte-identical to the PR #100 snapshot. The operation IDs and integration-test evidence originated in [unmerged PR #100](https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/pull/100), stacked on PR #99; its database integration tests/results are not main evidence. See the [Priority Workflow Coverage Scope and Baseline Assessment](08-priority-workflow-coverage-baseline.md) for the source/path map. Confirm its mapping and proposed catalog granularity before treating catalog counts as approved denominators. File globs alone are not a workflow map: for example, `CourseManagement` contains behavior spanning workflow concerns. Report explicitly which mapped application files remain untested, rather than hiding them in exclusions. Define frontend and backend denominators separately; do not add their percentages together, and do not combine unit and integration percentages as if they were a deduplicated union. A cross-level union requires stable source identities and service instrumentation to avoid double counting.

Aspirational goal: 100% coverage of scoped production code where feasible. This is not an immediate universal merge threshold or a promise to cover every loop path. The proposed finite scenario/path catalog is complete only when every reviewed and approved listed scenario has execution evidence; catalog completion is not a formal 100% program-path coverage metric. The configured Vitest 5.0.5 standard reports provide line, statement, function, and branch metrics, not instrumented path or condition metrics; do not claim those metrics without separately approved instrumentation. Workflow, requirement/acceptance-criterion, and risk-mitigation coverage each need an explicit denominator and traceable evidence. Forecast floors from planned test-to-source maps and the measured baseline, not arbitrary percentages.

### Test planning and traceability

Write test cases before execution. For each case, record a stable ID, CW/requirement or risk link, actor and preconditions, synthetic fixture, action, observable expected result, test level, owning test, and evidence location. Include positive, negative, boundary, authorization, data-integrity, and failure-recovery cases appropriate to the scenario. A missing or ambiguous expected behavior remains a documented question or defect; it must not be converted silently into a passing expectation.

The CW-to-test map must span all nine workflows and identify where each outcome is exercised (unit, integration, or E2E). Keep API-operation coverage distinct from HTTP status and input/authentication-scenario coverage. Supporting behavior is mapped when it is a dependency of a critical outcome. Update the RTM and finite E2E catalog as tests are added. All tests use synthetic or approved de-identified data and isolated services; tests must not send real student email.

## 2. Test Cases (plan before execution)

The source-to-workflow map and proposed catalogs are in the [Priority Workflow Coverage Scope and Baseline Assessment](08-priority-workflow-coverage-baseline.md). Its 28 scenario rows and 19 risk groups are proposed granularity for team review, not approved denominators. Map scenarios to sources/tests and approve their scope before relying on a workflow coverage claim. At minimum, plan and map scenarios for:

| Workflow | Required scenario families to enumerate in the test catalog |
| --- | --- |
| CW-01 Authentication and authorized access | Valid and invalid authentication; missing/invalid credentials; access to owned and non-owned resources. |
| CW-02 Course management | Supported create/read/update behavior; persistence and ownership boundaries; invalid or restricted updates. |
| CW-03 Roster processing | Valid and malformed/invalid CSV; correct course association; consistency on processing failure. |
| CW-04 Team organization | Supported membership changes; consistent relationships; correct peer-recipient source data. |
| CW-05 Evaluation setup and launch | Valid setup and launch; evaluation reset behavior; missing/inconsistent prerequisites; correct eligible participants and resulting state. |
| CW-06 Link/token access | Correct eligible context; invalid, missing, or unauthorized token; wrong-context denial and safe handling. |
| CW-07 Invitation distribution | Intended recipients and valid links; delivery failure and truthful status; isolated capture without real recipients. |
| CW-08 Evaluation submission | Valid persisted submission; invalid/self/duplicate recipients; repeated or concurrent submission; no partial/corrupt state on failure. |
| CW-09 Results and export | Correct authorized-course aggregation and export; missing/inconsistent source data; cross-course/owner denial. |

The table defines scenario families, not executed test cases. Concrete inputs, expected results, IDs, source mappings, evidence, and case owners remain to be recorded before execution. It does not expand standalone reminders or account support into the coverage target. The following gate checks are also planned design cases; they have not been executed, and no intentional failure mutation is part of this policy drafting work.

### Planned gate-verification cases (10; not executed)

| Case ID | Preconditions and action | Expected pass/fail result |
| --- | --- | --- |
| QG-01 Lint warning | Use a controlled fixture that produces one ESLint warning and no errors; run the required lint command. Compare with a clean fixture. | Warning fixture fails under zero-warning policy; clean fixture passes. |
| QG-02 Formatting | Introduce a controlled formatting difference; run `npm run format:check`. Also verify the clean fixture emits no Prettier configuration warnings/errors. | Difference or Prettier configuration warning/error fails; clean, warning-free formatting check passes. |
| QG-03 Test failure | In an isolated test fixture, make one required assertion fail; run the package suite. Compare with all required assertions passing. | Nonzero/failing test result fails the gate; all required tests pass with no focused or unapproved skipped tests. |
| QG-04 Missing suite | Remove or omit a required suite from the controlled fixture, then run test discovery; compare with the required non-empty suite present. | Missing or empty required suite fails; all required suites discovered and passing succeeds. |
| QG-05 Coverage floor | With approved separate FE/BE floors available, produce a report just below each floor and one at/above it; compare raw/unrounded metrics. | Below-floor report fails for that package; at/above-floor report passes. No cross-package percentage aggregation. |
| QG-06 Secret and severity | Use a synthetic secret canary and controlled High/Critical finding in an isolated scanner fixture; compare with no blocking findings and a valid, active scoped exception for a non-secret finding. | Confirmed exposed credential or unapproved High/Critical finding fails; clean result passes. Active credential never receives an exception. An allowed exception does not erase its finding. |
| QG-07 Expired exception | Present a finding with an expired exception; compare with the same finding under a current, approved, scoped, time-limited exception. | Expired exception fails; current approved exception follows its recorded compensating controls and remains visible in the report. |
| QG-08 Service setup and cleanup | Force dependency readiness/setup failure and, separately, cleanup failure in an isolated integration fixture; compare with a healthy ready service and successful run-scoped cleanup. | Setup/readiness or cleanup failure fails; healthy setup, passing cases, and completed cleanup pass. |
| QG-09 Build result | In an isolated fixture, make the production build fail; compare with a clean successful build. | Build failure fails; successful production build passes. |
| QG-10 Scanner result/report | Force scanner execution failure or omit its required report; compare with a completed scan whose findings are present and evaluated against severity/exception rules. | Scanner error, missing report, or unevaluated findings fails; completed scan with retained report and evaluated findings passes only when blocking policy permits. |

These ten cases define expected gate behavior only. Their implementation, safe fixtures, evidence, and execution remain pending. They do not establish failure-gate proof or close Issue #51.

## 3. Test Results and Evidence

The only execution results recorded here are the main-branch unit-test and coverage diagnostics below. No CI run, gate-failure proof, integration/database test, E2E journey, or security scan execution is claimed. Test counts are suite result counts, not a claim that all priority workflows or requirements are fully verified.

| Evidence item | Status / record |
| --- | --- |
| Frontend main diagnostic: 63 passing tests; 15 source files including `src/index.jsx` | **Main baseline `4a731b03677ae327f402de881db3d66bd21cbef5`, Node 24.21/npm 11.19, Vitest and `@vitest/coverage-v8` 5.0.5. Whole-app: lines 656/1,097 (59.79%); statements 674/1,150 (58.60%); functions 155/287 (54.0%); branches 455/860 (52.9%). Evidence is `/tmp/peers-issue48-evidence`; diagnostic is not the priority-only floor. Precise source/workflow/function mapping and floor approval remain pending.** |
| Backend main diagnostic: 49 passing tests | **Same main baseline and tool versions. The `createCourse` test invocation is valid, but mapped V8 coverage reports 0 function hits while native V8 records 1; the coverage metric is invalid due to the mapping anomaly. Record this as a blocker and defer any backend numeric floor to a separate instrumentation follow-up; no tooling fix is part of Issue #48.** |
| Approved priority-only numeric floors and ratchet checkpoint | **Pending precise source-to-workflow mapping and review. Do not use whole-file/frontend or invalid backend diagnostics as proxy floors.** |
| CW-01–CW-09 test catalog, stable workflow-to-code map, explicit untested files, and traceability denominators | **See [Priority Workflow Coverage Scope and Baseline Assessment](08-priority-workflow-coverage-baseline.md). Proposed scenario/risk catalog counts are unapproved granularity; map source responsibilities and review scope before freezing.** |
| Current CI job run URLs, per-job results, and branch-protection required-check configuration | **Pending run and repository-settings evidence** |
| Integration readiness/isolation/cleanup and pass/fail evidence | **Pending verification. Suites are Issues #33, #34, and #35; the CI job is Issue #46; required GitHub status settings are Issue #49. Reverify the unmerged PR #100/#99 material on the approved baseline and confirm activation/settings.** |
| Security tool capability selection, scan reports, finding dispositions, and gate evidence | **Pending implementation (Issue #50)** |
| E2E catalog execution evidence for each required journey | **Pending E2E implementation** |
| Shared Teams SWE 4724 Test Document | **Outside repository and not updated. An ignored manual-copy handoff is maintained at `test-results/issue48-test-document-handoff.md` in the original checkout; this addendum does not claim the external document was updated.** |

A results entry must include the exact source commit, workflow run, activated required jobs, reports/artifacts, and failures or approved exceptions. Do not record “passed” from a local command when the claim concerns CI, integration services, browser journeys, branch protection, or security scanning.

### Security severity and exception policy

Security scanning is repository-wide, regardless of the CW functional coverage boundary; reminders/account-support exclusion applies only to functional coverage targets, never to tests in existing suites or security scanning. Recommended capabilities, subject to Issue #50 implementation review and tool availability, are dependency auditing for direct, transitive, and development dependencies in both npm packages; secret scanning; CodeQL static analysis; selected ASVS-backed behavior checks; and a passive ZAP baseline scan against an isolated running application. ZAP baseline defaults can report warnings without failing, so its outcome must not be assumed to block: implementation must define and document which findings fail the gate. Tool recommendations do not imply installation, workflow activation, or scan completion.

- **Block:** confirmed exposed credentials, and High or Critical findings without an approved, active exception. Revoke and rotate an exposed credential; an exception cannot authorize leaving it active.
- **Track:** Medium and Low findings in a linked issue or equivalent record with an owner, severity, scope, disposition, and target review date. They are not automatically “clean” or waived.
- **Exception:** time-limited and specific to a finding/rule ID and scope. The routine implementer may propose; a maintainer or user with repository authority must approve. Record the reason, linked issue, compensating controls, owner, approval, expiry/review date, and audit location. Expiry makes the gate fail until the finding is fixed or the exception is renewed through review. No standing or blanket exception is allowed.
- **No active-secret exception:** if a credential is confirmed exposed, revoke/rotate it and remove it from active use. Track repository history cleanup as needed; do not treat deletion from the latest file as sufficient remediation.

Historical findings must remain visible in an assessment and be dispositioned individually; do not blanket-ignore legacy debt. An exception records accepted, bounded remediation timing; it does not change a scanner result into a clean result or erase the finding from reports.

## Policy references

- [OWASP Application Security Verification Standard](https://asvs.owasp.org/)
- [ZAP Baseline Scan](https://www.zaproxy.org/docs/docker/baseline-scan/)
- [npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/)
- [GitHub secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning)
- [GitHub CodeQL code scanning](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning)
- [Vitest coverage configuration](https://vitest.dev/config/coverage)

**Implementation handoff:** Issues #33, #34, and #35 own integration suites; Issue #46 owns integration/E2E CI jobs; Issue #49 owns GitHub required-status settings; Issue #50 owns security implementation; Issue #51 owns gate-proof evidence. Issues #40–#42 remain prerequisites. Closing this policy issue does not implement these jobs/settings or provide proof.
