# Backend API and Database Integration Tests

The integration suite covers all [36 inventoried operations](api-database-operation-inventory.md)
through actual HTTP requests and MongoDB persistence. The October 26 recorded
suite contains 12 files and 176 tests: the original 73, 96 authentication and
authorization cases, and seven email integration cases. The implementation
contains the integration environment, eleven application suites, and four
application repairs described in this record. The detailed course and database
verification below preserves the October 24, 2026 snapshot; later full-suite
and focused email results are recorded separately below and in
[email integration](email-integration.md).

## 1. Testing Strategy

The [integration suites](../../../../../src/backend/tests/integration)
send actual HTTP requests through the mounted Express routes and independently
query MongoDB using the fixture helper's separate Mongoose connection.
Controllers, HTTP responses, and database operations are not mocked. Both the
response contract and the resulting stored state must agree with each case.

Before each case, the existing guarded fixture helpers reset this run's data,
seed the invented professor/course/team/students, and log in through the API
where the case needs authentication. Login/account/public-student suites can
disable setup login.
Cases and files execute sequentially because they share one run database.
Final teardown resets records/inbox and closes the test connection; the root
runner removes the disposable stack and verifies resource cleanup.

Use the Node/npm versions in the [repository README](../../../../../README.md),
Docker with Compose v2.24+, and Linux container support. Docker must be running.
The [integration environment guide](integration-test-environment.md#1-testing-strategy) describes
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
requires no running services. Maintain these assertions alongside the implementation. Record observed failures and suspected defects separately in [Known Bugs](../../../known-bugs.md).
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
| ROSTER-08 | OP-33-10 | Edit only name/email; expect original team membership and assignment retained. |
| ROSTER-09 | OP-33-11 | Delete a student with incoming/outgoing evaluations; expect student/evaluation records absent and selected course/team counts/membership updated; other course/evaluation unchanged. |
| ROSTER-10 | OP-33-12 | Bulk delete two selected students while supplying a foreign-course ID; expect only target-course selected records removed, incoming/outgoing evaluations removed, retained same-course evaluation and unrelated course preserved. |
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

## 3. Recorded Initial Course Results

The initial seven course cases were recorded as passing on October 23, 2026.
The execution used Node 24.21.0, npm 11.19.0, and Docker Compose 5.1.1; the
application and runner images used Node 24.22.0. These results are a dated
snapshot from the initial course slice, not a current execution claim.

| Case | Recorded actual result | Status |
| --- | --- | --- |
| API-33-01 | HTTP 201; independent query confirmed fields, Active/default counts and professor; GET returned the created course. | Passed |
| API-33-02 | With cached counts set to 99, the list returned the actual 1 team and detail returned the actual 2 students; identifiers/details matched MongoDB. | Passed |
| API-33-03 | HTTP 200; edited name/semester were stored and returned by GET; other checked course fields and owner were preserved. | Passed |
| API-33-04 | HTTP 200; course remained Inactive with 2 students/1 team; active list excluded it and inactive list included it. | Passed |
| API-33-05 | HTTP 200; original ID reactivated and course count remained 1. | Passed |
| API-33-06 | HTTP 400/VALIDATION_ERROR; stored courses matched the pre-request snapshot. | Passed |
| API-33-07 | HTTP 404/NOT_FOUND; stored courses matched the pre-request snapshot, with no inserted record. | Passed |

The recorded initial course runs passed all seven selected cases, and the
service-free backend suite (10 files, 62 tests), lint, and formatting checks also
passed at that snapshot. Frontend build, hosted CI, new coverage measurement, mutation testing,
and deliberate application-failure checks were not run for that initial slice.

The full application case inventories are preserved in Section 2 and Section 4.
The separate shared SWE4724 Test Document/template was not present in the
reviewed checkout. This repository record therefore does not claim that the
course submission document was updated.


## 4. Expanded Verification and Review

The initial implementation record covered eight application suites for all 36
inventoried operations. Plans above precede execution; operation IDs are
included in test titles. This is selected scenario coverage for every
inventoried operation, not exhaustive verification of every input or failure
path.

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

### Verified Repairs

The expanded regression cases exposed four defects, and the retained assertions
passed after the corresponding controller repairs:

1. Details-only student edits retain existing team membership.
2. Individual deletion removes evaluations received and authored by the student.
3. Bulk deletion removes evaluations in both directions within the selected course.
4. Course reports correctly associate populated team references and calculate team membership and averages.

The October 24 recorded full-suite results passed after these controller repairs.
Earlier filtered results identified the defects and confirmed the retained
assertions after repair. See BUG-005–008 in [Known Bugs](../../../known-bugs.md). Review also strengthened recipient
cardinality, foreign-course exclusion from completion totals, and course-filter
and read-only assertions. No new dependencies or configuration were added.

### Current Recorded Integration Results — October 26, 2026

Two complete local integration runs passed 176 tests in 12 files: the original
73, 96 authentication/authorization cases, and seven email cases. Both runs
verified cleanup. The focused and concurrent email runs are recorded in
[email integration](email-integration.md). Current source review confirms
dedicated assertions for invitation-link shape and SMTP rejection/retry,
professor ownership, and student-recipient authorization. This documentation
update did not rerun those suites. These local results do not establish hosted
CI execution.

### Recorded Full-Suite Results — October 24, 2026

These dated results are an earlier snapshot.

| Check | Actual result |
| --- | --- |
| `npm --prefix src/backend test` | 10 files / 62 tests passed with the controller repairs. |
| `npm test` | 8 files / 63 frontend tests passed. |
| `npm run test:all` | Both service-free suites passed. |
| `npm run lint` | Passed, zero diagnostics. |
| `npm run format:check` | Passed. |
| Operation-ID audit | All 36 IDs present across the eight application suites. |
| `git diff --check` | Passed. |
| `npm run test:integration` | 9 files / 73 tests passed (69 application + 4 environment); exit 0; cleanup verified. |
| `npm run test:integration` (repeat) | 9 files / 73 tests passed; exit 0; independent fresh database; cleanup verified. |

The two complete runs included all 36 operation IDs and verified cleanup. They
used Node 24.21.0, npm 11.19.0, and Docker Compose 5.6.1; application and test
images used Node 24.22.0. Logs and JSON exit/cleanup records were retained in
ignored per-run directories.
No frontend build, browser journey, hosted CI or new coverage measurement was
performed for the expanded backend change.

### Remaining Limits

- The original course-scoped sentinel checks do not establish cross-professor
  access control. The subsequent [authentication and authorization tests](authentication-authorization-integration.md)
  cover professor ownership, credential rejection, child-resource isolation,
  and student-recipient permissions; consult that record for execution results
  and remaining access-control limits.
- Captured SMTP establishes recipients, token association, invitation link
  shape, and deterministic rejection/retry behavior, not provider delivery or
  browser navigation. Known account-recovery defects remain separate concerns.
- Self/foreign recipients are addressed in the access-control record above.
  Duplicate recipients, later-entry rating/feedback failures, concurrency,
  token uniqueness/security, deadline enforcement and database outages remain
  unverified integrity concerns. Rejecting an invalid first entry does not prove
  submission atomicity.
- Evaluation reset clears tokens/records and is tested to invalidate the old
  student capability. Cached completion flags and the complete reset/relaunch
  lifecycle remain verification gaps. The status endpoint still reports `evaluations_sent: true`
  when at least one student has recorded SMTP acceptance; partial-roster
  acceptance and its aggregate status are not fully covered. Token existence
  does not establish successful SMTP delivery.
- Roster reassignment/reimport variations, malformed streams/filesystem failures,
  arbitrary CSV escaping, every grading boundary, and unrestricted update-field
  variants outside the fields specifically protected by authorization tests
  are outside these bounded cases. Protected ownership and operator-field
  handling on selected updates is covered in the
  [authorization integration record](authentication-authorization-integration.md).
- Browser navigation/end-to-end behavior, service-backed CI, and the unavailable
  separate shared SWE4724 Test Document remain separate work. No requirement text
  or historical implementation assessment is rewritten to match current code.

## 5. Priority workflow regression follow-up

These cases use the existing guarded API/MongoDB/Mailpit environment, synthetic
fixtures, sequential isolation and independent database reads. No application
repair, numerical coverage gate or approved matrix outcome changes here.

| Test source | Matrix cases and expected outcomes |
| --- | --- |
| [Priority roster](../../../../../src/backend/tests/integration/priorityRoster.test.js) | REG-CW02-03 edit preserves another owner's course; REG-CW03-03 mixed rows disclose errors and persist only valid records; REG-CW03-06 real duplicate-key failure discloses partial processing with consistent relationships/counts; REG-CW03-11 assigned/unassigned manual additions read back consistently and preserve the unrelated course; REG-CW04-10 named empty team lists with matching stored counts. |
| [Priority lifecycle](../../../../../src/backend/tests/integration/priorityLifecycle.test.js) | REG-CW05-02 empty roster does not launch; REG-CW05-04 submission/reset clears completion, tokens and responses, revokes old access and preserves roster/teams/other course; REG-CW06-03 altered known-good token denied without writes; REG-CW06-04 token constrains recipient and saved identity/course despite supplied foreign context; REG-CW09-04 deleted response stays absent in report/CSV while a retained reverse response stays attributed correctly. |
| [Priority submission](../../../../../src/backend/tests/integration/prioritySubmission.test.js) | REG-CW08-04 duplicate recipient rejected or deduplicated; REG-CW08-06 concurrent submissions retain one complete response set; REG-CW08-07 later missing rating and short feedback each leave no earlier writes; REG-CW08-11 four invalid scale boundaries return validation errors without response/completion changes. |

Run focused cases with the same cleanup safeguards:

```bash
npm run test:integration -- priorityRoster.test.js priorityLifecycle.test.js prioritySubmission.test.js
```

The first focused run on October 28, 2026 ran 18 tests: six passed and twelve
failed, exit 1 with verified cleanup. Review corrected two overstrict test
oracles (partial-result wording and no-response report schema) and strengthened
fixtures; that initial run is superseded by the full run below.

Final full run on October 28, 2026: `npm run test:integration` ran 194 tests
in 15 files: **184 passed, 10 failed**, exit 1, cleanup verified true
(run ID `155d058f8d739ea3`). All 176 pre-existing tests passed; the 18 added
cases produced eight passes and ten failures. Failures cover undisclosed CSV
processing errors, retained reset completion, duplicate/concurrent submissions,
two later-entry partial writes, and four invalid-scale server errors. See
[known defects](../../../known-bugs.md#priority-integration-failures-observed-october-28-2026).
The intermediate full run had 183 passes/11 failures before the remaining
partial-result wording assertion was corrected. No failure is skipped or marked
as expected; these regressions block a claim of complete verified behavior.

Backend unit tests: `npm --prefix src/backend test`, 65/65 passed. Root
`npm run lint`, `npm run format:check`, and `git diff --check` passed.
The first lint attempt used an incomplete reused dependency directory and failed
module resolution; a clean lockfile install in this worktree resolved it.
No frontend source changed; no browser or production-build rerun was performed.

Partial-invitation aggregate status has separate implementation/evidence on an
unmerged branch; this follow-up neither duplicates that repair nor claims its
results on this baseline. The external shared Test Document remains deferred
and was not updated. Existing historical runs above remain dated evidence.
