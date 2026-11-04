# Backend API and Database Integration Testing Implementation

## Purpose and Scope

This record describes selected backend API and database integration scenarios using actual Express requests and independent MongoDB queries. The case tables map scenarios to the 36 operations in the separate [API/database operation inventory](api-database-operation-inventory.md). Scenario counts exceed operation counts; coverage of each operation does not establish exhaustive inputs, failure paths, or workflows.

The record covers API/database operations, authentication and account support, submission integrity, and selected priority workflow regressions. It does not replace validated requirements, the operation inventory, the regression matrix, or browser end-to-end records.

<a name="1-testing-strategy"></a>

## Testing Environment and Tools

The suites use actual HTTP requests through mounted Express routes and independent MongoDB queries; controllers, responses, and database operations are not mocked. Guarded fixtures seed synthetic professors, courses, teams, and students, reset run-owned data between cases, and log in through the API when needed. Cases that share a run database execute sequentially. Teardown resets records and inbox state and closes the database connection.

Run with the repository-supported Node/npm versions, Docker, Compose v2.24 or later, and Linux container support. The [integration test environment record](integration-test-environment.md#1-testing-strategy) documents run-only settings, destination safeguards, readiness, diagnostics, and cleanup. No developer `.env`, Atlas account, or Mailtrap credentials are needed; the first image build requires network access. Submission-integrity cases require transaction-capable MongoDB. The supplied stacks configure a single-node replica set; native backend connections through the published port need `directConnection=true` because MongoDB advertises the Compose hostname.

## Test Organization

The case tables below retain their stable scenario IDs and map application cases to operation IDs. The separate [operation inventory](api-database-operation-inventory.md) remains the canonical 36-operation catalog.

| Section | Operations | Source |
| --- | --- | --- |
| Professor login | OP-33-01 | [authentication.test.js](../../../../../src/backend/tests/integration/authentication.test.js) |
| Courses | OP-33-02–06 | [courses.test.js](../../../../../src/backend/tests/integration/courses.test.js) |
| Rosters | OP-33-07–13 | [roster.test.js](../../../../../src/backend/tests/integration/roster.test.js) |
| Teams | OP-33-14–20 | [teams.test.js](../../../../../src/backend/tests/integration/teams.test.js) |
| Evaluation management | OP-33-21–25 | [evaluationManagement.test.js](../../../../../src/backend/tests/integration/evaluationManagement.test.js) |
| Student evaluation | OP-33-26–28 | [studentEvaluation.test.js](../../../../../src/backend/tests/integration/studentEvaluation.test.js) |
| Reporting | OP-33-29–33 | [reports.test.js](../../../../../src/backend/tests/integration/reports.test.js) |
| Account support | OP-33-34–36 | [accountSupport.test.js](../../../../../src/backend/tests/integration/accountSupport.test.js) |

Additional backend regression suites cover [submission integrity](../../../../../src/backend/tests/integration/submissionIntegrity.test.js), [priority roster workflows](../../../../../src/backend/tests/integration/priorityRoster.test.js), and [priority lifecycle workflows](../../../../../src/backend/tests/integration/priorityLifecycle.test.js). Browser behavior is documented separately in the end-to-end testing record.

## Test Cases

These API-33 cases describe course behavior and expected outcomes. Each case
starts from independently seeded data rather than depending on a prior case.
All paths in the initial table are under `/api/courses`.

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


### Expanded Application Cases

These rows describe current application assertions. OP IDs map to the separate
operation inventory; scenario counts exceed operation counts.

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

<a name="5-submission-integrity"></a>

### Submission Integrity

The [submission integrity suite](../../../../../src/backend/tests/integration/submissionIntegrity.test.js)
extends OP-33-27 through real HTTP requests and independent MongoDB queries.
It uses the existing isolated fixture lifecycle and synthetic records. The
controller validates the complete batch before writes and rejects duplicate
recipients. A MongoDB transaction commits response records and evaluator
completion together; a forced Student version update serializes submissions
for the same evaluator before the transaction-local completion check. Existing
completion records remain authoritative for repeat rejection. No unique index
or migration is introduced, and existing duplicate data is not repaired.

MongoDB must be a replica set or sharded deployment. The supplied local,
integration, and browser-test Compose stacks initialize a single-node replica
set automatically and wait for its writable primary. Existing named volumes
are retained without data deletion. A native backend using the Compose
published MongoDB port needs `directConnection=true` because the replica set
advertises the Compose hostname `mongodb`.

| Target / case | Steps | Expected result |
| --- | --- | --- |
| REG-CW08-04 | Submit the same eligible recipient twice, then correct the request. | HTTP 400 `VALIDATION_ERROR`, unchanged students/evaluations; corrected retry stores the complete two-peer submission with HTTP 201. |
| REG-CW08-07 / REG-CW08-11 | Place a valid peer first and an invalid rating or feedback entry second. Cases include missing, below/above-bound, participation-bound, nonnumeric string and null ratings, and short/non-string feedback. | HTTP 400 `VALIDATION_ERROR`, unchanged response and completion state; corrected retry succeeds with exact stored values. |
| REG-CW08-06 | Send eight concurrent two-peer requests with distinct request/recipient feedback markers and ratings, with false and stale-true initial completion flags. | Exactly one HTTP 201 and seven HTTP 409 `ALREADY_COMPLETED`; exactly two response records from one winning request and only its evaluator completion/version update. |
| REG-CW08-07 / database rollback | Temporarily add a disposable collection validator rejecting the second recipient, submit two otherwise-valid entries, restore the validator, then retry. | HTTP 500 and unchanged students/evaluations after rejection; corrected retry returns HTTP 201 and stores both responses. Validator restoration runs even on failure. |

<a name="6-priority-workflow-regression-follow-up"></a>

### Priority Workflow Regression Follow-up

| Test source | Matrix cases and expected outcomes |
| --- | --- |
| [Priority roster](../../../../../src/backend/tests/integration/priorityRoster.test.js) | REG-CW02-03 edit preserves another owner's course; REG-CW03-03 mixed rows disclose errors and persist only valid records; REG-CW03-06 real duplicate-key failure discloses partial processing with consistent relationships/counts; REG-CW03-11 assigned/unassigned manual additions read back consistently and preserve the unrelated course; REG-CW04-10 named empty team lists with matching stored counts. |
| [Priority lifecycle](../../../../../src/backend/tests/integration/priorityLifecycle.test.js) | REG-CW05-02 empty roster does not launch; REG-CW05-04 submission/reset clears completion, tokens and responses, revokes old access and preserves roster/teams/other course; REG-CW06-03 altered known-good token denied without writes; REG-CW06-04 token constrains recipient and saved identity/course despite supplied foreign context; REG-CW09-04 deleted response stays absent in report/CSV while a retained reverse response stays attributed correctly. |
| [Submission integrity](../../../../../src/backend/tests/integration/submissionIntegrity.test.js) | REG-CW08-04 duplicate recipient rejected with HTTP 400 and no writes; REG-CW08-06 concurrent submissions retain one complete response set; REG-CW08-07 later missing rating and short feedback each leave no earlier writes; REG-CW08-11 professionalism 0/6, participation 0/5, and communication 0 return validation errors without response/completion changes. |

### Current Priority Regression Behavior

The current source validates complete submission batches before writing, uses a MongoDB transaction to commit responses and evaluator completion together, and serializes concurrent submissions for one evaluator. The priority regression cases also assert CSV partial-error disclosure and evaluation-reset completion cleanup. Their case mappings remain in the priority table above.

## Execution Instructions

Run the complete isolated integration suite from the repository root:

```bash
npm run test:integration
```

To select only the initial course cases while retaining environment setup and cleanup:

```bash
npm run test:integration -- courses.test.js
```

For the priority workflow regression cases:

```bash
npm run test:integration -- priorityRoster.test.js priorityLifecycle.test.js submissionIntegrity.test.js
```

The ordinary backend unit command, `npm --prefix src/backend test`, excludes integration files and needs no running services. For an integration run, inspect `runner.log`, `services.log`, and `result.json` under ignored `test-results/integration/<run-id>/`; each completed run should exit successfully and report cleanup verification. Local execution does not by itself establish CI enforcement.

## Verification Results

The October 31, 2026 full integration run passed 200 tests across 15 files at revision `d0088f7`; the command exited 0 and verified cleanup. The email, authentication, API/database, submission-integrity, and priority regression suites are part of the integrated backend suite. See the [recorded integration result at commit dd7d26d](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/dd7d26d1aa3b4431b6cd477271e19ca8f792435f/docs/Team-P25-02/modernization/implementation/testing/integration-testing.md#test-results).

The test cases and assertions are **implemented**. This dated full-suite run is local **verified** evidence for revision `d0088f7`; it does not establish that every case is selected or CI-enforced on every change.

<a name="4-expanded-verification-and-review"></a>

Historical expanded-verification detail is preserved in the [original record at commit dd7d26d](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/dd7d26d1aa3b4431b6cd477271e19ca8f792435f/docs/Team-P25-02/modernization/implementation/testing/api-database-integration.md#4-expanded-verification-and-review).

<a name="current-combined-follow-up"></a>

Historical combined-follow-up detail is preserved in the [original record at commit dd7d26d](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/dd7d26d1aa3b4431b6cd477271e19ca8f792435f/docs/Team-P25-02/modernization/implementation/testing/api-database-integration.md#current-combined-follow-up).

## Limitations and Remaining Work

- The case set is bounded. It does not establish every input variant, all resource permissions, every grading boundary, or arbitrary application/database failure behavior.
- Captured SMTP verifies selected recipient, token association, link shape, and deterministic rejection/retry assertions; it does not prove provider delivery or browser navigation. Partial invitation acceptance and its aggregate status remain incompletely covered; token existence does not prove SMTP acceptance.
- Submission integrity cases cover duplicate recipients, selected later-entry validation failures, bounded concurrent submission, and rollback after an injected write failure. They do not establish arbitrary database-outage behavior or every concurrent reset/relaunch interaction.
- Roster cases do not exhaust reassignment/reimport variants, malformed CSV streams or filesystem failures, arbitrary CSV escaping, or all processing failures.
- Browser navigation and hosted CI execution are separate verification concerns. The October 31 local result does not establish either.
