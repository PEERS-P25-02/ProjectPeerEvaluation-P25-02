# API-to-Database Operation Inventory (#33)

This inventory records **36 distinct HTTP method/path operations**: 33 in the
priority workflow chain and its direct supporting actions, plus three account
support operations. One operation may perform several database queries and need
several test scenarios. Reactivation shares course POST; report generation is a
separate HTTP alias. Counts describe the mounted backend at branch base
`97981000b79941de4cb9a3f0e1cb17770d633746`, plus the local #33 changes.
This branch is stacked on #32 / PR #99 and remains unmerged.

`C` means `/api/courses/:course_id`. Student-management `:student_id` is a
MongoDB document ID; the student-report route instead uses the business ID.
Suite paths are under `src/backend/tests/integration/`. Each suite exercises
actual HTTP and independently queries MongoDB. Cases, results and limitations
are in the [integration test guide](05-api-database-integration.md).
The current branch has 69 application tests for these operations plus four
environment checks; all 73 passed twice in fresh isolated runs with cleanup
verified on October 24, 2026. See the guide for run IDs and remaining gaps.

## Professor authentication (1)

Suite: `authentication.test.js`.

| Operation | Method and path | Database interaction |
| --- | --- | --- |
| OP-33-01 | `POST /api/auth/login` | Authenticate stored credentials and save last_login. |

## Courses (5)

Suite: `courses.test.js`.

| Operation | Method and path | Database interaction |
| --- | --- | --- |
| OP-33-02 | `GET /api/courses` | List the professor’s courses with filters and actual team counts. |
| OP-33-03 | `POST /api/courses` | Create a course or reactivate the matching inactive record. |
| OP-33-04 | `GET C` | Retrieve course fields and count actual enrolled students. |
| OP-33-05 | `PUT C` | Persist edits to the selected course. |
| OP-33-06 | `DELETE C` | Mark the course Inactive while retaining related records. |

## Student rosters (7)

Suite: `roster.test.js`.

| Operation | Method and path | Database interaction |
| --- | --- | --- |
| OP-33-07 | `POST C/roster` | Import multipart CSV, update students/teams, and clear course evaluation state. |
| OP-33-08 | `GET C/students` | List course students, including saved team assignments. |
| OP-33-09 | `POST C/students` | Create a student and maintain course/team relationships and counts. |
| OP-33-10 | `PUT C/students/:student_id` | Edit student details or move team membership. |
| OP-33-11 | `DELETE C/students/:student_id` | Remove a student and dependent evaluations; update relationships/counts. |
| OP-33-12 | `POST C/students/bulk-delete` | Delete selected students and dependent evaluations; update team counts. |
| OP-33-13 | `DELETE C/students` | Clear the course roster, teams and evaluation records. |

## Teams (7)

Suite: `teams.test.js`.

| Operation | Method and path | Database interaction |
| --- | --- | --- |
| OP-33-14 | `GET C/teams` | Read course teams and stored memberships. |
| OP-33-15 | `POST C/teams` | Create named teams and update course counts. |
| OP-33-16 | `PUT C/teams/:team_id` | Rename a team or update its status, including member labels. |
| OP-33-17 | `DELETE C/teams/:team_id` | Delete an empty team; reject populated teams. |
| OP-33-18 | `DELETE C/teams` | Clear teams and remove students’ team assignments. |
| OP-33-19 | `POST C/teams/:team_id/students/:student_id` | Assign or move a student, updating both sides and counts. |
| OP-33-20 | `DELETE C/teams/:team_id/students/:student_id` | Remove membership and update both sides and counts. |

## Evaluation management (5)

Suite: `evaluationManagement.test.js`.

| Operation | Method and path | Database interaction |
| --- | --- | --- |
| OP-33-21 | `POST C/evaluations/send` | Create/reuse course students’ tokens and send captured invitations. |
| OP-33-22 | `POST C/teams/:team_id/evaluations/send` | Create/reuse tokens and send invitations only for the selected team. |
| OP-33-23 | `GET C/evaluations/status` | Derive sent/completed/pending totals and per-student status from stored data. |
| OP-33-24 | `POST C/evaluations/remind` | Read pending evaluators and send reminders, respecting optional selection. |
| OP-33-25 | `DELETE C/evaluations/reset` | Remove selected course tokens and evaluation records. |

## Student evaluation (3)

Suite: `studentEvaluation.test.js`.

| Operation | Method and path | Database interaction |
| --- | --- | --- |
| OP-33-26 | `GET /api/evaluate/:token` | Resolve the evaluator, course, peers and static rubric; report prior completion. |
| OP-33-27 | `POST /api/evaluate/:token` | Save peer ratings/feedback and mark the evaluator complete; reject repeats. |
| OP-33-28 | `GET /api/evaluate/:token/status` | Resolve token and determine completion from stored evaluations. |

## Reports (5)

Suite: `reports.test.js`.

| Operation | Method and path | Database interaction |
| --- | --- | --- |
| OP-33-29 | `GET C/reports` | Read course/student/team/evaluation records and derive scores, grades and summaries. |
| OP-33-30 | `GET C/reports/download` | Derive a CSV export from stored course evaluation data. |
| OP-33-31 | `GET C/reports/student/:student_id` | Read one student’s report using the business student_id. |
| OP-33-32 | `GET C/reports/team/:team_id` | Read one team’s students and evaluation summary. |
| OP-33-33 | `POST C/reports/generate` | Alias that derives the course report without persisting Report records. |

## Account support (3)

Suite: `accountSupport.test.js`.

| Operation | Method and path | Database interaction |
| --- | --- | --- |
| OP-33-34 | `POST /api/auth/register` | Persist a new professor with a bcrypt password hash. |
| OP-33-35 | `POST /api/auth/reset-password` | Save a reset token/expiry and send captured email for an existing professor. |
| OP-33-36 | `POST /api/auth/update-password` | Validate reset credentials, replace the password hash and consume the token. |

## Boundaries

Excluded: maintenance migration, AI settings, MFA/refresh/auto-assignment
placeholders, health/logout, and unmounted duplicate routers. The rubric is
static configuration with no mounted database CRUD API. Reports are derived in
memory; these operations do not save Report documents.

Operation coverage does not establish complete validation, resource ownership,
failure atomicity, concurrency safety, browser navigation, or SMTP failure
handling. Those limits remain explicit in the test guide.
