# Priority Workflow Coverage Scope and Baseline Assessment

**Status:** CW-01–CW-09 and evaluation reset are approved scope. Scenario/risk granularity remains proposed for review. Measurements below are diagnostic; numerical coverage floors are inactive.

## Scope and evidence boundary

This baseline targets the nine approved critical workflows (CW-01–CW-09) in the [critical-workflow definition](../critical-workflow-identification/04-critical-peers-workflows.md). The source review is against `origin/main` commit `4a731b03677ae327f402de881db3d66bd21cbef5`. All 32 selected method/path operations below are mounted in main's backend routes. The operation IDs and integration-test evidence come from the separate, unmerged [PR #100](https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/pull/100) inventory, stacked on PR #99; a direct route-file comparison between main and that branch's `a032cf5` snapshot found no differences, and all 32 documented method/path pairs were checked against the mounted route files. Route availability is therefore a main-source fact, while PR #100's integration tests/results are not main evidence.

The selected operation denominator is 32 unique priority API operations: OP-33-01 through OP-33-23 and OP-33-25 through OP-33-33. OP-33-24 (standalone reminders) and account-support OP-33-34 through OP-33-36 (registration, password reset, password update) are excluded from priority denominators. Existing tests for those functions remain part of their ordinary suite runs. Evaluation reset is included as OP-33-25 under CW-05. CW-05 and CW-07 share invitation operations; IDs are allocated once under CW-07. The 28 scenario rows and 19 risk-control rows below are proposed catalog entries derived from the documented criteria; team review must approve or revise them before they become frozen denominators.

The nine workflow rows map directly to nine workflow requirements (FR-01–FR-08 and FR-10); FR-09 (MongoDB persistence and relationship consistency) cuts across CW-02–CW-09. Together these are all ten functional requirements FR-01–FR-10. This mapping is traceability, not a claim that any requirement is fully verified.

Security scanning and security findings remain a repository-wide quality gate, independent of the 9-workflow, 32-operation, 28-scenario, and 19-risk denominators. Excluded/unsupported workflows remain excluded as listed in the [workflow definition](../critical-workflow-identification/05-supporting-workflows-and-traceability.md#07-excluded-and-unsupported-workflows).

## Ownership and evidence map

| Workflow / FR | Frontend source; related test | Backend ownership; allocated priority operations | Existing evidence and limit |
| --- | --- | --- | --- |
| CW-01 / FR-01 | `LoginPage`, `AuthContext`, `services/login.js`, `ProtectedRoute`; `LoginPage`, `AuthContext`, `ApiService` tests | `authController.login`, `middleware/auth.authenticateToken`; OP-33-01 | `LoginPage.test.jsx`, `AuthContext.test.jsx`, `ApiService.test.js`, `auth.test.js`. Cross-resource authorization is not established by these unit tests. |
| CW-02 / FR-02, FR-09 | `CourseManagement`; `CourseManagement` test | `courseController` list/create/get/update/delete; OP-33-02–06 | `CourseManagement.test.jsx`, `controllerSuccessPaths.test.js`, `controllerFailureBoundary.test.js`, `controllerValidation.test.js`. Database persistence and ownership integration remain open. |
| CW-03 / FR-03, FR-09 | `CourseManagement` roster/student flows; `CourseManagement` test | `studentController.uploadRoster`, `listStudents`, `addStudent`, `updateStudent`, `deleteStudent`, `bulkDeleteStudents`, `deleteAllStudents`; OP-33-07–13 | `CourseManagement.test.jsx`, `csvParsing.test.js`, `controllerValidation.test.js`, `controllerSuccessPaths.test.js`, `controllerFailureBoundary.test.js`; multipart middleware, MongoDB consistency, and failure atomicity are not proven. |
| CW-04 / FR-04, FR-09 | `CourseManagement` team flows; `CourseManagement` test | `teamController` list/create/update/delete/clear/add/remove; OP-33-14–20 | `CourseManagement.test.jsx`, `controllerSuccessPaths.test.js`, `controllerFailureBoundary.test.js`, `models.test.js`. `TeamAssignment.test.jsx` only checks the current page and does not establish team workflow coverage. |
| CW-05 / FR-05, FR-09 | `CourseManagement` launch/status flows; `CourseManagement` test | `evaluationController.evaluationStatus`; `studentController.resetEvaluationState`; OP-33-23, 25. Launch shares invitation operations OP-33-21, 22 with CW-07. | `CourseManagement.test.jsx`, `controllerSuccessPaths.test.js`, `controllerFailureBoundary.test.js`, `rubric.test.js`; reset completion-flag consistency is not certified. |
| CW-06 / FR-06 | `StudentEvaluation`; `StudentEvaluation` test | `evaluationController.getEvaluationForm`, `evaluationTokenStatus`; OP-33-26, 28 | `StudentEvaluation.test.jsx`, `controllerSuccessPaths.test.js`, `controllerFailureBoundary.test.js`; token context and invalid/reused token cases have unit evidence, but end-to-end link use and persistence do not. |
| CW-07 / FR-07 | `CourseManagement` invitation flows; `CourseManagement` test | `evaluationController.sendEvaluations`, `sendTeamEvaluations`; `emailUtils.sendEvaluationInvitation`; OP-33-21, 22 (shared with CW-05 behavior, counted here once) | `CourseManagement.test.jsx`, `controllerSuccessPaths.test.js`, `controllerFailureBoundary.test.js`. SMTP delivery, truthful delivery status, and safe staging recipients remain integration concerns. |
| CW-08 / FR-08, FR-09 | `StudentEvaluation`; `StudentEvaluation` test | `evaluationController.submitEvaluation`; OP-33-27 | `StudentEvaluation.test.jsx`, `models.test.js`, `controllerSuccessPaths.test.js`, `controllerFailureBoundary.test.js`; models/controllers are mocked or isolated, so atomicity and concurrent requests remain unverified. |
| CW-09 / FR-10, FR-09 | `Reports`; `Reports` test | `reportController.getCourseReport`, `downloadReport`, `getStudentReport`, `getTeamReport`, `generateReport`; OP-33-29–33 | `Reports.test.jsx`, `reporting.test.js`, `controllerSuccessPaths.test.js`, `controllerFailureBoundary.test.js`; calculations and UI requests have unit evidence, but persisted-data agreement and ownership require integration. |

Backend operation counts by unique allocation are CW-01 1, CW-02 5, CW-03 7, CW-04 7, CW-05 2, CW-06 2, CW-07 2, CW-08 1, CW-09 5: **32 unique operations total**. FE and BE responsibility can overlap; each API operation is counted once. `CourseManagement.jsx`, `authController.js`, and `emailUtils.js` contain behavior beyond one workflow, so future instrumentation must map covered functions/lines to these workflow rows instead of assigning whole-file coverage to a single workflow.

Numeric IDs in the method/path table are suffixes of `OP-33-`. The denominator is reviewable against the [main auth router](../../../src/backend/routes/auth.js), [course router](../../../src/backend/routes/courses.js), [evaluation router](../../../src/backend/routes/evaluate.js), and [mounted routes](../../../src/backend/index.js):

| Workflow | Unique operation IDs and main method/path |
| --- | --- |
| CW-01 | 01 `POST /api/auth/login` |
| CW-02 | 02 `GET /api/courses`; 03 `POST /api/courses`; 04 `GET /api/courses/:course_id`; 05 `PUT /api/courses/:course_id`; 06 `DELETE /api/courses/:course_id` |
| CW-03 | 07 `POST /api/courses/:course_id/roster`; 08 `GET /api/courses/:course_id/students`; 09 `POST /api/courses/:course_id/students`; 10 `PUT /api/courses/:course_id/students/:student_id`; 11 `DELETE /api/courses/:course_id/students/:student_id`; 12 `POST /api/courses/:course_id/students/bulk-delete`; 13 `DELETE /api/courses/:course_id/students` |
| CW-04 | 14 `GET /api/courses/:course_id/teams`; 15 `POST /api/courses/:course_id/teams`; 16 `PUT /api/courses/:course_id/teams/:team_id`; 17 `DELETE /api/courses/:course_id/teams/:team_id`; 18 `DELETE /api/courses/:course_id/teams`; 19 `POST /api/courses/:course_id/teams/:team_id/students/:student_id`; 20 `DELETE /api/courses/:course_id/teams/:team_id/students/:student_id` |
| CW-05 | 23 `GET /api/courses/:course_id/evaluations/status`; 25 `DELETE /api/courses/:course_id/evaluations/reset` |
| CW-06 | 26 `GET /api/evaluate/:token`; 28 `GET /api/evaluate/:token/status` |
| CW-07 | 21 `POST /api/courses/:course_id/evaluations/send`; 22 `POST /api/courses/:course_id/teams/:team_id/evaluations/send` |
| CW-08 | 27 `POST /api/evaluate/:token` |
| CW-09 | 29 `GET /api/courses/:course_id/reports`; 30 `GET /api/courses/:course_id/reports/download`; 31 `GET /api/courses/:course_id/reports/student/:student_id`; 32 `GET /api/courses/:course_id/reports/team/:team_id`; 33 `POST /api/courses/:course_id/reports/generate` |

Frontend evidence files are [`LoginPage.test.jsx`](../../../src/frontend/tests/LoginPage.test.jsx), [`AuthContext.test.jsx`](../../../src/frontend/tests/AuthContext.test.jsx), [`ApiService.test.js`](../../../src/frontend/tests/ApiService.test.js), [`CourseManagement.test.jsx`](../../../src/frontend/tests/CourseManagement.test.jsx), [`StudentEvaluation.test.jsx`](../../../src/frontend/tests/StudentEvaluation.test.jsx), and [`Reports.test.jsx`](../../../src/frontend/tests/Reports.test.jsx). Backend case groupings are documented in the [backend unit-test record](02-backend-unit-testing-implementation.md#backend-unit-test-cases); the [RTM](../requirements-traceability-matrix/02-rtm.md) records requirement-to-test mappings and known integration gaps. This map identifies relevant source/test ownership; it does not claim every row has complete evidence.

## Proposed acceptance-scenario catalog

Status for every row: **planned; source criteria mapped, execution not assessed here**. The 28-row count is a reviewable catalog denominator, not a claim that 28 scenarios already exist or pass.

| ID | Proposed observable acceptance scenario |
| --- | --- |
| Q48-CW01-A01 | Valid professor credentials authenticate and reach an authorized function. |
| Q48-CW01-A02 | Invalid credentials or unavailable/invalid authentication configuration do not grant access. |
| Q48-CW01-A03 | A professor cannot read or change another professor's course or related data. |
| Q48-CW02-A01 | An authorized professor creates and manages an owned course. |
| Q48-CW02-A02 | Unauthorized course access and changes to system-controlled fields are rejected. |
| Q48-CW02-A03 | A failed course write leaves course state consistent. |
| Q48-CW03-A01 | A supported CSV roster loads the expected student information into its course. |
| Q48-CW03-A02 | Malformed or required-field-deficient roster input is rejected detectably. |
| Q48-CW03-A03 | Roster processing preserves consistent records and existing course data on failure. |
| Q48-CW04-A01 | Supported team organization produces matching student/team membership. |
| Q48-CW04-A02 | Membership changes cannot associate a student with the wrong team. |
| Q48-CW04-A03 | Evaluation recipient selection reflects the saved team membership. |
| Q48-CW05-A01 | Supported evaluation setup and launch create state for eligible students. |
| Q48-CW05-A02 | Missing or inconsistent course/team prerequisites do not launch an invalid activity. |
| Q48-CW05-A03 | Launch participants and subsequent evaluation state correspond to the intended course/team. |
| Q48-CW05-A04 | Reset removes only the selected course's tokens/submissions and preserves unrelated course state. Current code retains `evaluation_completed`; its intended post-reset value needs a separate acceptance decision before completion-flag consistency can be certified. |
| Q48-CW06-A01 | An eligible student's assigned link opens that student's intended evaluation context. |
| Q48-CW06-A02 | Invalid or unauthorized tokens are rejected. |
| Q48-CW06-A03 | Tokens are not exposed in logs or resolved to another student/course context. |
| Q48-CW07-A01 | Invitations address intended eligible students and contain usable individualized access. |
| Q48-CW07-A02 | Delivery failure is visible and is not reported as successful delivery. |
| Q48-CW07-A03 | Staging invitation validation cannot contact unintended real users. |
| Q48-CW08-A01 | A valid submission stores the expected evaluator/recipient records once. |
| Q48-CW08-A02 | Invalid tokens/recipients, self-evaluation, duplicate recipients, and repeated submissions are rejected. |
| Q48-CW08-A03 | Partial or concurrent failure does not leave incorrect or partial evaluation state. |
| Q48-CW09-A01 | Results are derived from stored submissions for the authorized course. |
| Q48-CW09-A02 | Missing/inconsistent evaluation data does not produce a misleading aggregate. |
| Q48-CW09-A03 | Exported output matches the supported results for that same authorized course. |

## Proposed known-risk/control catalog

The 19 grouped entries translate the documented important failure cases into review prompts; groups may be split if maintainers need more precise assertions. Status is **mapped from source criteria; control verification not assessed here**.

| ID | Risk to control | Source workflow |
| --- | --- | --- |
| Q48-R01 | Invalid credentials or authentication configuration grants access. | CW-01 |
| Q48-R02 | Cross-professor/course access or unrestricted system-field updates. | CW-01, CW-02 |
| Q48-R03 | Course persistence failure leaves inconsistent state. | CW-02 |
| Q48-R04 | Malformed roster is accepted or creates incomplete records. | CW-03 |
| Q48-R05 | Roster update damages existing course data or downstream relationships. | CW-03 |
| Q48-R06 | Stored team and student membership diverge or assign the wrong team. | CW-04 |
| Q48-R07 | Team state yields an incorrect peer-recipient set. | CW-04 |
| Q48-R08 | Launch proceeds without required course/team information or creates wrong participants. | CW-05 |
| Q48-R09 | Invalid, weak, leaked, or mis-scoped evaluation token is accepted. | CW-06 |
| Q48-R10 | SMTP failure is hidden or success status is false. | CW-07 |
| Q48-R11 | Invitation reaches an unintended student or real staging recipient. | CW-07 |
| Q48-R12 | Submission partially saves or produces evaluator/recipient inconsistency. | CW-08 |
| Q48-R13 | Self, invalid, duplicate, repeated, or concurrent submission creates bad state. | CW-08 |
| Q48-R14 | Aggregation is incorrect or fails to reflect missing/inconsistent source data. | CW-09 |
| Q48-R15 | Results/report access crosses course or professor ownership. | CW-09 |
| Q48-R16 | Export does not match saved submissions and displayed results. | CW-09 |
| Q48-R17 | MongoDB persistence/relationship behavior is inferred from mocked unit calls. | CW-02–CW-09 |
| Q48-R18 | SMTP, token, or staging workflow is declared verified without its service-backed evidence. | CW-06–CW-08 |
| Q48-R19 | Evaluation reset leaves stale completion flags or alters tokens/submissions outside the selected course. | CW-05 |

## Baseline, target, and forecasting rules

- **Measurement readiness:** No numerical frontend/backend coverage baseline is approved in this scope draft. The 63-test frontend assessment below is complete for its full application-file scope; precise priority-only function/branch mapping remains required before any floor is activated. The backend instrumented report is untrusted: its `createCourse` counter is zero even though the selected suite calls that function. The user chose a separate backend tooling follow-up. Correct and validate that instrumentation, finish priority-code attribution, rerun measurement, and confirm expected function hits before activating a measured baseline/ratchet. Whole-file proxy floors are explicitly not approved. Add the reviewed frontend/backend measurements after that assessment; catalog counts here are scope only.
- Record measured current coverage separately from catalog size: planned denominators are 9 workflow rows, 32 unique API operations, 28 proposed acceptance scenarios, and 19 proposed risk groups. These workflow rows map to all 10 functional requirements as described above. For each catalog, report approved denominator, observed covered count, and uncovered count with evidence links; do not convert Vitest percentages into workflow/API/risk percentages.
- The regression baseline is the measured coverage of the approved current-main suite once a reproducible measurement exists. New work must not reduce that baseline; any ratchet is upward only. Baseline measurement and workflow-row verification status are separate facts.
- Future target: cover **100% of the approved finite scenario, operation, and risk catalogs** with suitable evidence at the appropriate test layer. This is not a promise to cover every theoretical path or unknown risk. Security coverage is assessed independently across the repository.
- Forecast code coverage only after mapping statements/lines, functions, and branches in mixed-responsibility files to workflow owners and planned tests. Report estimated additions and uncertainty; do not invent a current pass percentage or end-state code percentage. An instrumented run reports statements, lines, functions, and branches; the current Vitest report has no path metric and cannot automatically produce workflow, API, requirement, or risk percentages.
- Existing unit suites are mapped evidence, not proof of full workflow acceptance. The RTM and test records identify outstanding ownership, persistence, real upload, SMTP delivery, atomicity, concurrency, and browser-journey evidence. No execution result is asserted by this scope draft.

Before freezing the four planned denominators, review scenario granularity, shared-operation allocation, and risk grouping against the approved requirements. Then link each approved catalog item to its implementing test(s), verification layer, and evidence record.


## Measurement plan and actual diagnostic results — October 24, 2026

The assessment plan was written to `coverage-plan.md` before execution in the
local evidence directory described below. These records transcribe that plan
and its outcomes. They do not assert that the proposed acceptance/risk catalog
was executed or that CI/gate enforcement was verified.

| Assessment case | Planned purpose/action and expected result | Actual result |
| --- | --- | --- |
| Q48-M01 | Run the frontend suite with explicit application includes and unexecuted files counted; retain source/config/tool provenance and four metric counters. | 8 files / 63 tests passed. Final manifest has 15 application files including the unexecuted entrypoint `src/index.jsx`. Whole-application diagnostics only; no priority-only floor. |
| Q48-M02 | Run backend tests separately with application includes; verify a known-called controller has a nonzero mapped function count before trusting metrics. | 9 files / 49 tests passed; measurement trust check failed: the mapped `createCourse` function count is zero despite direct invocation by a passing test and nonzero body-statement counters. Backend numerical results are rejected as a baseline. |
| Q48-M03 | Use a bounded native V8 probe of the same controller with synthetic input and stubbed persistence to distinguish execution from report remapping. | Native V8 recorded `exports.createCourse` count 1. No database or application server was started. This supports a Vitest/CommonJS remapping follow-up, not a claim that backend tests failed. |

All measurements used source commit
`4a731b03677ae327f402de881db3d66bd21cbef5`, Node 24.21.0, npm 11.19.0,
Vitest 5.0.5 and `@vitest/coverage-v8` 5.0.5. Existing dependencies were reused;
no packages were installed. The final frontend run started at 15:43:04 local
America/New_York time. Preliminary runs with broad test discovery or missing
entrypoint scope were corrected and are not the final measurement.

| Metric | Frontend covered / total | Displayed percentage | Backend disposition |
| --- | ---: | ---: | --- |
| Lines | 656 / 1,097 | 59.79% | Untrusted; no floor |
| Statements | 674 / 1,150 | 58.60% | Untrusted; no floor |
| Functions | 155 / 287 | 54.00% | Known-call remapping check failed |
| Branches | 455 / 860 | 52.90% | Untrusted; no floor |

The frontend scope includes `src/index.jsx`, `App.jsx`, `theme.js`, and JS/JSX
under frontend `components`, `contexts`, `pages`, and `services`; tests/setup
are excluded. This deliberately includes untested and non-priority application
code. Backend includes `index.js` and JS under `config`, `controllers`,
`middleware`, `models`, `routes`, and `utils`; tests, scripts and migrations
are excluded. These explicit file scopes do not solve attribution inside mixed
functions or shared render logic.

### Reproduction and evidence retention

Both commands were run from the source worktree root with temporary configs
that preserve the frontend jsdom/setup configuration and select backend Node
execution. The configs restrict test discovery to the relevant package and set
explicit coverage includes, JSON/HTML/text reporters and separate output paths.

```bash
./node_modules/.bin/vitest run --config /tmp/peers-issue48-evidence/frontend.vitest.config.mjs --coverage
./src/backend/node_modules/.bin/vitest run --config /tmp/peers-issue48-evidence/backend.vitest.config.mjs --coverage
```

Local evidence is retained in `/tmp/peers-issue48-evidence`: the pre-execution
plan, full assessment, temporary configs, run logs, raw JSON/HTML, included-file
manifests and native probe. These are local review artifacts, not portable
checked-in tools or CI artifacts. Reproduction elsewhere requires recreating
the recorded configurations for that checkout and retaining the resulting
reports. The future tooling work must provide versioned measurement configuration
and CI artifact retention before numerical gates are activated.

Lockfile SHA-256 values for this assessment:

- Root: `cecd3c57139853404eae5b906cb9cb8a746cc3c2c998998c8f5afb305ba6a432`.
- Backend: `c0a820033d0cfd7bc59737ae264865b89afe12e7c189652d0dbd8c4e7baedbff`.

## Activation prerequisites and target forecast

| Item | Required follow-up and acceptance evidence |
| --- | --- |
| Q48-B01 Backend measurement | Resolve CommonJS coverage remapping in a bounded test-tooling follow-up. Known-called controller functions must agree with raw V8; validate source paths and unexecuted-file accounting, preserve passing tests, and retain reproducible configuration and reports. No tooling fix is included in #48. |
| Q48-B02 Priority-code attribution | Finish precise function/statement/line/branch attribution for CW-01–CW-09 and reset, including shared code. Explicitly distinguish excluded reminder/account code within mixed modules. Review the mapping and measure that exact denominator; do not activate whole-file proxy floors. |
| Q48-B03 Catalog review | Approve granularity and expected outcomes for the 28 scenario and 19 grouped-risk entries. Map every clause to appropriate tests and evidence. Resolve reset completion-flag expectations separately; no silent requirement change. |
| Q48-B04 Merge enforcement | Record operational check names and configure GitHub rulesets/branch protection in #49; implement missing jobs in #46/#50 and demonstrate enforcement in #51. |

The end-state target is 32/32 API operations and all approved scenario/control
entries verified at their required layers. The proposed catalog provides 28/28
acceptance groups, 19/19 known risk/control groups and traceability across all
10 in-scope functional requirements. These are completion targets, not current
pass percentages. Nine workflow groups provide a coarse feature grouping;
completeness requires every applicable API/scenario/control obligation, not one
representative test per group. The rest of the project's requirements remain
visible in the full RTM and are not declared verified by this scoped target.

A group counts as verified only when **every clause** has passing evidence at
the required layer. Proposed grouped entries may be split during review; freeze
and version the approved denominator before comparing percentages. No current
API/feature/requirement/risk pass percentage is inferred from test presence.

A numerical code-coverage forecast remains pending Q48-B01/B02. Its calculation
must use the fixed denominator and the additional items expected to execute under
the approved planned tests: `(currently covered + distinct planned additions) /
expected scoped total after the planned changes`. Record assumptions, feasible exclusions and uncertainty, validate
a representative test batch, then set each initial floor from the verified
baseline and raise it only with reviewed evidence. Do not forecast by counting
tests or by substituting a whole-application percentage for a priority metric.


Documentation verification also passed: `npx --no-install eslint . --max-warnings=0`
reported no diagnostics, `npm run format:check` passed, and new local links,
Markdown table shapes, catalog IDs, documented route pairs and whitespace were
checked. No build, service integration, E2E, security scan, repository setting,
or deliberate failure-gate proof was executed as part of this policy assessment.
The ten planned QG cases remain unexecuted.
