# Backend API and Database Integration Tests (#33)

The initial course-management slice is expanded to all
[36 inventoried operations](06-api-database-operation-inventory.md). It builds on #32's isolated environment on branch
`33-test-backend-api-and-database-interactions`, based on PR #99 head
`97981000b79941de4cb9a3f0e1cb17770d633746`. This is unmerged branch work;
the available `origin/main` baseline is `4a731b03677ae327f402de881db3d66bd21cbef5`.

## 1. Testing Strategy

The [integration suites](../../../src/backend/tests/integration/)
sends actual HTTP requests through the mounted Express routes and independently
queries MongoDB using the fixture helper's separate Mongoose connection.
Controllers, HTTP responses, and database operations are not mocked. Both the
response contract and the resulting stored state must agree with each case.

Before each case, the existing guarded fixture helpers reset this run's data,
seed the invented professor/course/team/students, and log in through the API
where the case needs authentication. Login/account/public-student suites can
disable setup login.
Cases and files execute sequentially because they share one run database.
Final teardown resets records/inbox and closes the test connection; the root
runner removes the disposable stack and verifies resource cleanup.

Use the Node/npm versions in the [repository README](../../../README.md),
Docker with Compose v2.24+, and Linux container support. Docker must be running.
The [#32 guide](04-integration-test-environment.md#1-testing-strategy) describes
the exact run-only settings, destination guards, readiness checks, diagnostics,
and cleanup. No developer `.env`, Atlas account, or Mailtrap credentials are
needed. Image builds need network access. No dependencies or configuration
changes are introduced by this suite.

From the repository root, run the complete environment and application checks:

```bash
npm run test:integration
```

To select only these course cases while retaining the same environment lifecycle:

```bash
npm run test:integration -- courses.test.js
```

Run the complete command twice to check repeatability. Each invocation must use
a different run ID, pass its selected cases, exit 0, and report verified cleanup.
Read `runner.log`, `services.log`, and `result.json` under ignored
`test-results/integration/<run-id>/`. Keep the logs with review evidence; a
checked-in result summary does not make those local artifacts portable.

Ordinary `npm --prefix src/backend test` excludes the integration directory and
requires no running services. The #33 contributor maintains these assertions
and records failures with the command/run ID in GitHub Issues and
[Known Bugs](../known-bugs.md), separating observed failures from suspected ones.
No coverage percentage or new merge gate is introduced.

## 2. Test Cases

The initial course cases and expected outcomes were recorded before live execution. Each
case starts from independently seeded data, rather than depending on a prior
case. All paths in the initial table are under `/api/courses`.

### Initial Course Cases

| ID | Purpose and steps | Expected result |
| --- | --- | --- |
| API-33-01 | POST a new course, read its returned ID directly from MongoDB, then GET that ID. | HTTP 201; correct stored fields, Active/default counts, and owning professor; one additional course; GET returns the created ID and details. |
| API-33-02 | Set deliberately stale stored course counters, independently count fixture students/teams, then GET the list and course detail. | HTTP 200; list/details match stored identifiers and fields; list team count and detail student count come from actual related records. |
| API-33-03 | PUT a changed name/semester, query MongoDB, then GET the course. | HTTP 200; edited fields persist and are returned; course number, section, owner, and status remain intact. |
| API-33-04 | DELETE the fixture course; query course/roster/team records; GET active and inactive lists. | HTTP 200; course remains stored as Inactive; its two students and team remain; default active list excludes it and inactive list includes its ID. |
| API-33-05 | Arrange a matching inactive course; POST its original identifying details; query MongoDB and count courses. | HTTP 200; response reuses the existing ID; record becomes Active; no duplicate course is inserted. |
| API-33-06 | Snapshot stored courses; POST an input missing semester; compare stored state afterward. | HTTP 400 with VALIDATION_ERROR; no course is inserted or changed. |
| API-33-07 | Snapshot stored courses; PUT a syntactically valid but nonexistent course ID; compare stored state afterward. | HTTP 404 with NOT_FOUND; no upsert or change to existing courses. |


### Expanded Section Case Plans

These section plans were recorded before their live execution. OP IDs map to
the inventory; scenario counts exceed operation counts.

#### Authentication

| Case | Operation | Steps | Expected result |
| --- | --- | --- | --- |
| AUTH-33-01 | OP-33-01 | Read the seeded professor before login; POST correct credentials; independently query the professor and use the returned token on the protected course list. | HTTP 200; correct identity and a usable token; newly stored last_login agrees with the response and request time; password/identity remain intact; protected list returns the fixture course. |
| AUTH-33-02 | OP-33-01 | Snapshot all professors; POST the fixture email with an incorrect password. | HTTP 401/AUTH_ERROR; no access token or professor information; professor snapshot/count unchanged. |
| AUTH-33-03 | OP-33-01 | Snapshot all professors; POST an unknown synthetic email. | HTTP 401/AUTH_ERROR; no access token/account creation or stored mutation. |
| AUTH-33-04 | OP-33-01 | Snapshot all professors; POST missing credentials. | HTTP 400/VALIDATION_ERROR; no access token or stored mutation. |

#### Courses

| Case | Operation | Steps | Expected result |
| --- | --- | --- | --- |
| COURSE-01 | OP-33-03 / OP-33-04 | POST a new course; independently query MongoDB; GET returned ID. | 201, correct fields/default counts/owner persisted, one additional course, subsequent GET matches. |
| COURSE-02 | OP-33-02 / OP-33-04 | Set stale counters to 99; add a different same-owner course; GET unfiltered list, filtered list, and fixture detail; compare database snapshot. | Unfiltered IDs match both stored courses; case-insensitive course-number filter returns only fixture; list team count and detail student count match real related collections; stored records unchanged. |
| COURSE-03 | OP-33-05 / OP-33-04 | PUT name/semester; query MongoDB; GET course. | 200, changes persist and are retrieved; number, section, status and owner retained. |
| COURSE-04 | OP-33-06 / OP-33-02 | DELETE course, query records, GET active/inactive lists. | 200, course remains Inactive, roster/team preserved, active list excludes ID and inactive list includes it. |
| COURSE-05 | OP-33-03 | Arrange matching inactive course; POST its details; query/count courses. | 200 reuses existing ID, status Active, no duplicate. |
| COURSE-06 | OP-33-03 | Snapshot records; POST without semester. | 400/VALIDATION_ERROR and unchanged stored courses. |
| COURSE-07 | OP-33-05 | Snapshot records; PUT a valid nonexistent ID. | 404/NOT_FOUND, no upsert, unchanged stored courses. |

#### Roster

| Case | Operations | Steps and expected result |
| --- | --- | --- |
| ROSTER-01 | OP-33-07 | Send actual multipart CSV with two new students, quoted name and optional group; expect persisted normalized fields, linked new team/counts, selected-course prior tokens/evaluations cleared, other course unchanged. |
| ROSTER-02 | OP-33-07 | POST without file; expect 400 and unchanged course/student/team/evaluation snapshot. |
| ROSTER-03 | OP-33-08 | Seed another course; GET selected roster; expect exactly its independently queried students and fields. |
| ROSTER-04 | OP-33-09 | Add assigned student; expect 201, normalized record, new team membership, student/team/course counts. |
| ROSTER-05 | OP-33-09 | Add unassigned student; expect 201, null team, course count increment without new team. |
| ROSTER-06 | OP-33-09 | Add duplicate course student ID with a proposed new team; expect 409 and no mutations or team creation. |
| ROSTER-07 | OP-33-10 | Edit details and move student to a new team; expect stored values, old/new membership and counts consistent. |
| ROSTER-08 | OP-33-10 | Edit only name/email; expect original team membership and assignment retained. Source inspection predicts a genuine current defect; keep correct assertion, root reviews/fixes. |
| ROSTER-09 | OP-33-11 | Delete a student with incoming/outgoing evaluations; expect student/evaluation records absent and selected course/team counts/membership updated; other course/evaluation unchanged. Source inspection predicts missing evaluation cleanup; keep correct assertions. |
| ROSTER-10 | OP-33-12 | Bulk delete two selected students while supplying a foreign-course ID; expect only target-course selected records removed, incoming/outgoing evaluations removed, retained same-course evaluation and unrelated course preserved. Source inspection predicts outgoing cleanup defect; keep correct assertions. |
| ROSTER-11 | OP-33-12 | Empty bulk selection; expect 400 and unchanged snapshot. |
| ROSTER-12 | OP-33-13 | Clear selected populated course roster; expect no selected students/teams/evaluations and zero counters, unrelated course unchanged. |

#### Teams

| Case | Operation | Steps | Expected result |
| --- | --- | --- | --- |
| TEAM-01 | OP-33-14 | Seed an unrelated course/team/student; list fixture course teams and independently read team/student records. | HTTP 200; only the requested course team appears, with exactly its two actual populated students. |
| TEAM-02 | OP-33-15 | Create two named teams through POST; read returned IDs and course from MongoDB. | HTTP 201; two distinct correct teams with default empty membership/counts; course team_count becomes 3. |
| TEAM-03 | OP-33-15 | Snapshot all courses/teams/students; POST an empty teams array. | HTTP 400/VALIDATION_ERROR; stored state unchanged. |
| TEAM-04 | OP-33-16 | Rename the populated fixture team and change its status through PUT. | HTTP 200; team changes persist, both student labels update, and membership IDs/counts remain intact. |
| TEAM-05 | OP-33-17 | Arrange an additional empty team and accurate course count; delete it. | HTTP 200; only the empty team disappears; course count returns to 1 and existing membership remains. |
| TEAM-06 | OP-33-17 | Snapshot records; attempt deleting a populated team. | HTTP 409/CONSTRAINT_ERROR; no stored mutation. |
| TEAM-07 | OP-33-18 | Arrange two fixture-course teams and an unrelated course; clear fixture-course teams. | HTTP 200; fixture teams removed, students retained with assignment fields unset, course team_count zero; unrelated course/team/student unchanged. |
| TEAM-08 | OP-33-19 | Arrange a new unassigned course student; add them to the populated team. | HTTP 200; Team.students/count and Student.team_id/group label agree; course student count remains intact. |
| TEAM-09 | OP-33-19 | Arrange a second empty team plus unrelated course; move an existing fixture student. | HTTP 200; old/new memberships and counts are correct, moved student points to new team, untouched student/other course remain unchanged. |
| TEAM-10 | OP-33-19 | Snapshot records; add an existing member again. | HTTP 409/DUPLICATE; no duplicate or stored mutation. |
| TEAM-11 | OP-33-20 | Remove an existing student from their team. | HTTP 200; only selected membership removed, team count decreases, selected assignment clears, remaining student stays assigned. |
| TEAM-12 | OP-33-20 | Arrange a same-course unassigned student; snapshot records and request removal from the fixture team. | HTTP 404/NOT_FOUND; no stored mutation. |
| TEAM-13 | OP-33-19 | Arrange a different course's student; snapshot records and request adding that ID through the fixture-course endpoint. | HTTP 404/NOT_FOUND; no stored mutation or cross-course membership. |

#### Evaluation Management

| Case | Operation | Steps | Expected result |
| --- | --- | --- | --- |
| EM-01 | OP-33-21 | Seed an unrelated course; send course invitations; query students and inspect individual captured messages. | 200, two successful sends, distinct persisted tokens associated with the correct recipients; unrelated tokens/data unchanged and no unrelated recipient. |
| EM-02 | OP-33-21 | Give one student an existing token; send course invitations. | Existing token reused, missing token added, both actual messages carry their respective stored tokens, no Evaluation records created. |
| EM-03 | OP-33-22 | Move one fixture student into a second team using direct setup; send only the first team. | 200, one successful send; only selected team student's token/message created. |
| EM-04 | OP-33-23 | Persist tokens, one real evaluation, an unrelated-course completed evaluation and deliberately contradictory completion flags; read status. | 200, one completed/one pending and 50%; unrelated evaluator excluded; named per-student status and submission date derive from actual Evaluation data, not completion flags. |
| EM-05 | OP-33-24 | Seed one completed evaluator and one pending student plus another course; request default reminders. | 200, only pending current-course recipient captured; Student/Evaluation records unchanged. |
| EM-06 | OP-33-24 | Add another pending student; select the completed and one pending student for reminders. | 200, only selected pending recipient captured; completed and unselected pending students excluded. |
| EM-07 | OP-33-25 | Seed tokens/evaluations in two courses; reset only fixture course. | 200, correct removed-token/evaluation counts; selected course tokens/evaluations removed; students/relationships retained and unrelated course's records unchanged. |
| EM-08 | OP-33-22 | Use another course's team ID in selected fixture course send path; snapshot students and inspect inbox. | 404/NOT_FOUND, no Student mutation and no captured email. |

#### Student Evaluation

| Case | Operations | Steps | Expected result |
| --- | --- | --- | --- |
| SE-33-01 | OP-33-26 | Assign a fixture student token; seed another team/course; request the form. | Correct stored evaluator/course/team, exact eligible teammate set, six static rubric criteria; no evaluation written. |
| SE-33-02 | OP-33-26 | Remove the student's team assignment consistently; request form alongside another-course student. | Course peers excluding evaluator and foreign-course students; No Team label. |
| SE-33-03 | OP-33-27 | Add a third team member; submit two distinct peer entries; query evaluations/students. | HTTP 201; exactly two records with exact ratings, trimmed feedback, course/evaluator/recipient/token, valid timestamps; only evaluator completion becomes true. |
| SE-33-04 | OP-33-27 | Submit once; snapshot data; resubmit changed ratings/feedback. | HTTP 409 ALREADY_COMPLETED; previous records and student state unchanged. |
| SE-33-05 | OP-33-27 | Submit an empty evaluations array with a valid assigned token. | HTTP 400 VALIDATION_ERROR; zero evaluations and unchanged student state. |
| SE-33-06 | OP-33-27 | Submit a first entry missing professionalism. | HTTP 400 VALIDATION_ERROR; zero evaluations and unchanged student state. |
| SE-33-07 | OP-33-27 | Submit a first entry with short feedback. | HTTP 400 VALIDATION_ERROR; zero evaluations and unchanged student state. |
| SE-33-08 | OP-33-26/27/28 | Request form, submit, and check status with an unassigned token. | HTTP 404 with each endpoint's documented token error; no student/evaluation mutation. |
| SE-33-09 | OP-33-28 | Set a deliberately stale completion flag without an evaluation; request status. | Valid token reports completed=false based on actual records; request does not mutate state. |
| SE-33-10 | OP-33-26/28 | Seed an evaluation while completion flag remains false; request status and form. | Status reports completed=true; form reports stored completion timestamp; records remain unchanged. |

#### Reports

| Case | Operation | Steps | Expected result |
| --- | --- | --- | --- |
| REPORT-33-01 | OP-33-29 | GET course report; compare exact student IDs, received evaluation IDs, grades, team members, summary and database snapshot. | A=75/C, B=100/A, C ungraded; team average 87.5/B; summary total=3/scored=2/average=87.5; unrelated course excluded; no writes. |
| REPORT-33-02 | OP-33-29 | GET curved report with explicit boost/protection; compare independently calculated scores/settings/team mean. | A=81.25/B, B protected=100/A, C=0; final average=90.63; mean/deviation=87.5/12.5; no writes. |
| REPORT-33-03 | OP-33-30 | Download actual CSV; inspect headers and all three rows against fixtures, plus database snapshot. | Correct CSV content type/disposition, exact identity/team/score/grade/count values, no unrelated rows or writes. |
| REPORT-33-04 | OP-33-31 | GET individual report using A's business student_id; compare stored student and evaluation IDs. | Original course's A selected despite duplicate business ID elsewhere; received=2/given=1/score=75/C; no writes. |
| REPORT-33-05 | OP-33-32 | GET fixture team report; compare member IDs/grades/counts and team aggregate. | Only A/B returned with 75/C and 100/A; average 87.5/B; no writes. |
| REPORT-33-06 | OP-33-33 | POST generate alias; compare complete returned course/student/summary/team state and database snapshot. | Same independently expected mean report; no source changes or Report documents. |
| REPORT-33-07 | OP-33-29 | GET a valid nonexistent course ID; compare response and database snapshot. | 404/NOT_FOUND with all source records unchanged. |

#### Account Support

| Case | Operation | Steps | Expected result |
| --- | --- | --- | --- |
| ACCOUNT-01 | OP-33-34 | Register a distinct invented professor; independently read the returned ID; compare password hash; log in with the new credentials. | HTTP 201; correct identity/defaults and usable bcrypt hash; exactly one additional professor; original professor unchanged; subsequent login succeeds. |
| ACCOUNT-02 | OP-33-34 | Snapshot professors; register the existing fixture email with different details. | HTTP 409/DUPLICATE; no extra account or mutation. |
| ACCOUNT-03 | OP-33-34 | Snapshot professors; register an invented account missing department. | HTTP 400/VALIDATION_ERROR; no account insertion or mutation. |
| ACCOUNT-04 | OP-33-35 | Arrange another professor as a sentinel; request fixture-account reset; read stored token/expiry; inspect captured recipient/subject/body. | HTTP 200 generic response; new 64-character hexadecimal token and approximately one-hour expiry; password unchanged; sentinel unchanged; exactly one captured message whose body uses the stored token. |
| ACCOUNT-05 | OP-33-35 | Snapshot professors; request reset for an unknown invented email; inspect inbox after short settling checks. | Same HTTP 200 generic response; no account/token mutation; no captured email. |
| ACCOUNT-06 | OP-33-36 | Obtain reset credentials through the real reset API; submit a new password; query MongoDB; try new/old login and reuse the consumed reset token. | HTTP 200; different valid bcrypt hash; reset fields removed; new login succeeds, old login fails; consumed-token reuse returns 400/TOKEN_ERROR without further mutation. |
| ACCOUNT-07 | OP-33-36 | Arrange a stored unexpired reset credential; submit a different token; compare professor snapshots and password hashes. | HTTP 400/TOKEN_ERROR; password and stored reset credentials unchanged. |
| ACCOUNT-08 | OP-33-36 | Arrange an expired reset credential; submit its token; compare professor snapshots and password hashes. | HTTP 400/TOKEN_ERROR; password and stored reset credentials unchanged. |

## 3. Historical Initial Course Results

Verified locally on October 23, 2026 on the unmerged branch and baseline
identified above, plus this working-tree change. Host Node 24.21.0, npm 11.19.0,
and Compose 5.1.1; application/runner images use the Node 24.22.0 base. No host
dependency installation or application-code changes were needed.

| Case | Actual result | Status |
| --- | --- | --- |
| API-33-01 | HTTP 201; independent query confirmed fields, Active/default counts and professor; GET returned the created course. | Passed |
| API-33-02 | With cached counts set to 99, the list returned the actual 1 team and the detail returned the actual 2 students; identifiers/details matched MongoDB. | Passed |
| API-33-03 | HTTP 200; edited name/semester were stored and returned by GET; other checked course fields and owner were preserved. | Passed |
| API-33-04 | HTTP 200; course remained Inactive with 2 students/1 team; active list excluded it and inactive list included it. | Passed |
| API-33-05 | HTTP 200; original ID reactivated and course count remained 1. | Passed |
| API-33-06 | HTTP 400/VALIDATION_ERROR; stored courses matched the pre-request snapshot. | Passed |
| API-33-07 | HTTP 404/NOT_FOUND; stored courses matched the pre-request snapshot, with no inserted record. | Passed |

| Command | Actual result and retained run ID |
| --- | --- |
| `npm run test:integration` | Run `0d7643c2abd2d0f1`: 2 files, 11 tests passed (7 course + 4 environment); exit 0; cleanup verified. |
| `npm run test:integration` (repeat) | Run `b5889cf5bb7da5ee`: 2 files, 11 tests passed; exit 0; different fresh database; cleanup verified. |
| `npm run test:integration -- courses.test.js` | Run `dff67b8c7b1b8075`: only the course file selected; all 7 cases passed; exit 0; cleanup verified. |
| `npm --prefix src/backend test` | Existing service-free suite: 10 files, 62 tests passed; integration files excluded. |
| `npm run lint` | Passed with zero diagnostics. |
| `npm run format:check` | Passed. |
| `git diff --check` and documentation target checks | Passed; the edited documents' local file links resolve. |

Each successful run retains its logs and JSON exit/cleanup record in the ignored
results directory described above. The initial sandbox attempt
`e863e1829ea7f63a` could not access Docker's socket; no tests ran. Its summary
reports exit 1 and unverified cleanup because Docker queries were also denied.
After approved execution outside that sandbox, all three runs above passed.
Separate read-only Docker queries confirmed that the blocked attempt left no
project-labelled containers, networks, volumes, or matching image tags. This
access failure is distinct from an application or assertion failure.

No frontend tests/build, hosted CI, new coverage measurement, mutation testing,
or deliberate application-failure experiment was run for this backend test-only
slice. Historical #32 lifecycle checks are not new #33 verification.

### Historical Initial-Slice Gaps

- This first slice does not verify roster imports/CRUD, team mutations,
  evaluations, reporting, concurrency, partial writes, or database outages.
- Real login supplies credentials for the course cases; this does not complete
  permission/ownership testing in #34. Detailed email tests remain #35 and
  service-backed CI execution remains #46.
- Inherited authorization and unrestricted-update findings in the
  [technical assessment](../technical-assessment/03-testing-and-limitations.md#07-defects-and-limitations)
  are not corrected or declared resolved by these course tests.
- Browser/end-to-end behavior, other platforms, and minimum-version runtime
  verification are separate work. #32's historical lifecycle results remain in
  its own guide and are not represented as new #33 executions.
- This is a repository Test Document addendum. The separate shared SWE4724
  Test Document/template is unavailable; it has not been updated. Incorporate
  the affected strategy, cases, and actual results there when available, and
  link the documents and evidence in the future PR.


## 4. Expanded Verification and Review

The expanded branch contains eight application suites for all 36 inventoried
operations. Plans above precede execution; operation IDs are included in test
titles. This is selected scenario coverage for every inventoried operation,
not exhaustive verification of every input or failure path.

| Section | Operations | Application tests | Suite |
| --- | --- | --- | --- |
| Professor login | OP-33-01 | 4 | authentication.test.js |
| Courses | OP-33-02–06 | 7 | courses.test.js |
| Rosters | OP-33-07–13 | 12 | roster.test.js |
| Teams | OP-33-14–20 | 13 | teams.test.js |
| Evaluation management | OP-33-21–25 | 8 | evaluationManagement.test.js |
| Student evaluation | OP-33-26–28 | 10 | studentEvaluation.test.js |
| Reporting | OP-33-29–33 | 7 | reports.test.js |
| Account support | OP-33-34–36 | 8 | accountSupport.test.js |
| Total | 36 | 69 | Plus the 4 existing environment checks |

### Review Findings and Repairs

Historical filtered run `def2859724e0125c` exercised the original expanded
roster/team/report files: 26 passed and 6 failed. The failures exposed four
application defects. Correct assertions were retained and small controller
repairs applied:

1. Details-only student edits now retain their existing team membership.
2. Individual deletion removes feedback both received and authored by the student.
3. Bulk deletion removes feedback in both directions within the selected course.
4. Course reports compare populated team reference IDs correctly, restoring
   team members and averages for mean, curved and generate responses.

Historical rerun `1baa3368a04b6e8a` passed all 32 selected cases after those
repairs; both runs verified resource cleanup. See BUG-005–008 in
[Known Bugs](../known-bugs.md). These runs are evidence of the original defect
reproduction/repair, not final verification of the subsequently restored files.

Section agents and the primary reviewer inspected all eight suites. Review
strengthened personalized-message recipient cardinality, foreign-course
exclusion in completion totals, and course-filter/read-only assertions.
No new dependencies/configuration were added.

### Current Checkout Results — October 24, 2026

| Check | Actual result |
| --- | --- |
| `npm --prefix src/backend test` | 10 files / 62 tests passed with the controller repairs. |
| `npm test` | 8 files / 63 frontend tests passed. |
| `npm run test:all` | Both service-free suites passed. |
| `npm run lint` | Passed, zero diagnostics. |
| `npm run format:check` | Passed. |
| Operation-ID audit | All 36 IDs present across the eight application suites. |
| `git diff --check` | Passed. |
| `npm run test:integration` | Run `45f54785c1864e05`: 9 files / 73 tests passed (69 application + 4 environment); exit 0; cleanup verified. |
| `npm run test:integration` (repeat) | Run `4d5532e6f33dec89`: 9 files / 73 tests passed; exit 0; distinct fresh database/run ID; cleanup verified. |

Both complete runs verify the current source/test checkout after the repairs,
including all 36 operation IDs. Host Node 24.21.0/npm 11.19.0 and Docker Compose
5.6.1 were used; application/test images use Node 24.22.0. Cached image dependency
layers were reused; no host dependency installation was performed. Logs and JSON
exit/cleanup records remain in the ignored per-run directories.

Earlier attempts `502105da4450b585` and `14ad1dd1b07a9caf` stopped before tests
because Docker was unavailable. Their exit-1/unverified-cleanup summaries record
failed resource queries, not failed application assertions. After the user
restarted Docker Desktop, both complete runs above passed and verified cleanup.
No frontend build, browser journey, hosted CI or new coverage measurement was
performed for the expanded backend change.

### Remaining Limits

- Resource ownership and broader authorization remain #34; current course-scoped
  sentinel checks do not establish cross-professor access control.
- Captured SMTP establishes actual recipients/token association, not provider
  delivery, browser-reachable links or controlled SMTP failures. #35 remains open;
  known reset-link/frontend response defects remain BUG-001/002.
- Self/foreign evaluation recipients, later-entry partial writes, concurrency,
  token uniqueness/security, deadline enforcement and database outages remain
  unverified integrity concerns. Rejecting an invalid first entry does not prove
  submission atomicity.
- Evaluation reset clears tokens/records; its cached completion-flag lifecycle
  remains a gap. Token existence does not establish successful SMTP delivery.
- Roster reassignment/reimport variations, malformed streams/filesystem failures,
  arbitrary CSV escaping, every grading boundary, and unrestricted update-field
  validation are outside these bounded cases.
- Browser/end-to-end behavior, service-backed CI (#46), and the unavailable
  separate shared SWE4724 Test Document remain separate work. No requirement text
  or historical implementation assessment is rewritten to match this branch.
