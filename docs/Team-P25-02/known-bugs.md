# Known Bugs

Track application defects discovered during development and verification.
Add the GitHub issue and fix PR when available. Record verification before
marking a finding resolved. Use synthetic data; omit credentials and tokens.

## BUG-001: Password-reset email opens the login page

- Status: Open; observed during manual local testing for #76.
- Reproduce: Request a password reset for an existing test professor,
  open the captured Mailpit email, and follow its reset link.
- Expected: The password-reset form opens.
- Actual: The application opens the login page.
- Evidence: `src/frontend/App.jsx` uses HashRouter, while
  `src/backend/utils/emailUtils.js` generates `/reset-password/:token`
  without the required `/#/` route.
- Follow-up: Fix generated links and verify navigation from captured email.
  Review invitation/reminder links for the same routing mismatch.
- Coordination: #35 email integration tests and password-reset workflow tests.
- Fix issue / PR: Not yet assigned.

## BUG-002: Password-reset success response does not match the frontend

- Status: Open; identified through code inspection, not yet reproduced.
- Reproduce: After BUG-001 is fixed, submit matching new passwords using
  a valid reset token for a test account.
- Expected: A successful update displays confirmation and returns to login.
- Predicted failure: The page reports failure despite a successful update.
- Evidence: `src/frontend/pages/ResetPassword.jsx` checks `res.data.success`,
  but `src/backend/controllers/authController.js` returns only a success
  message from `updatePassword`.
- Follow-up: Align the response contract and verify success, invalid/expired
  tokens, and login with the updated password.
- Fix issue / PR: Not yet assigned.

## BUG-003: Selected-student reminders lose the selection filter

- Status: Resolved locally on October 19, 2026 during #85; no fix PR recorded yet.
- Previous behavior: The reminder query declared `_id` twice. The second key,
  containing `$nin: completedEvaluations`, overwrote `$in: student_ids`, so
  unselected students with pending evaluations could be included.
- Fix: Combine `$in` and `$nin` under the same `_id` field in
  `src/backend/controllers/evaluationController.js`.
- Verification: Three in-memory recipient checks passed: selected pending
  students only, all pending students without a selection, and no recipients
  for a completed-only selection. MongoDB and SMTP dependencies were stubbed;
  no permanent test cases were added and no live reminders were sent.
- Evidence: [ESLint implementation and verification](eslint-migration.md).

## BUG-004: Sample-data script imports an undeclared UUID package

- Status: Resolved locally on October 19, 2026 during #85; no fix PR recorded yet.
- Previous behavior: `src/backend/scripts/createITManagementTeams.js` imported
  `uuid`, but neither manifest declared it. Resolution in the local environment
  failed with `MODULE_NOT_FOUND`.
- Fix: Use `randomUUID()` from Node's built-in `node:crypto`, preserving the
  version-4 UUID format without adding a package.
- Verification: Import and token-generation checks passed, including 20
  generated values matching the version-4 UUID format. Full-repository lint
  passes with zero errors and warnings. The database-mutating script was not run.
- Evidence: [ESLint implementation and verification](eslint-migration.md).


## BUG-005: Editing student details removes existing team membership

- Status: Fixed locally on the unmerged #33 branch; final combined verification
  is recorded in the [#33 guide](testing/05-api-database-integration.md).
- Reproduce: PUT only name/email for a student already assigned to a team.
- Observed failure: Student.team_id remained assigned but Team.students lost
  that student and its count decreased.
- Fix: In studentController.updateStudent, remove old membership only when
  group_assignment was explicitly supplied and membership changes.
- Regression: OP-33-10 details-only case in roster.test.js compares the entire
  stored team before/after and verifies the retained assignment.
- Evidence: Historical run `def2859724e0125c` failed this assertion; filtered run
  `1baa3368a04b6e8a` passed after the repair. Both verified cleanup.
- Fix issue / PR: #33 working tree; no separate fix PR created.

## BUG-006: Individual student deletion leaves dependent evaluations

- Status: Fixed locally on the unmerged #33 branch; see current #33 verification.
- Reproduce: Delete a student who has both received and authored evaluations.
- Observed failure: The student disappeared while dependent feedback remained.
- Fix: Delete selected-course Evaluation records where student_id OR
  evaluator_id matches the removed student.
- Regression: OP-33-11 checks both directions, memberships/counts and an
  unchanged unrelated course.
- Evidence: `def2859724e0125c` failed; `1baa3368a04b6e8a` passed after repair;
  both cleanup checks passed. Final restored-suite results are in the #33 guide.
- Fix issue / PR: #33 working tree; no separate fix PR created.

## BUG-007: Bulk student deletion misses evaluations they authored

- Status: Fixed locally on the unmerged #33 branch; see current #33 verification.
- Reproduce: Bulk-delete a student who authored feedback about a retained student.
- Observed failure: Feedback authored by the deleted student remained because
  cleanup matched only the feedback recipient.
- Fix: Match both student_id and evaluator_id within the selected course.
- Regression: OP-33-12 preserves unrelated/retained feedback while removing
  incoming and outgoing records, including with a foreign-course ID in input.
- Evidence: `def2859724e0125c` failed; `1baa3368a04b6e8a` passed after repair;
  both cleanup checks passed. Final restored-suite results are in the #33 guide.
- Fix issue / PR: #33 working tree; no separate fix PR created.

## BUG-008: Course reports lose populated team members and averages

- Status: Fixed locally on the unmerged #33 branch; see current #33 verification.
- Reproduce: Request a course mean/curved report or its generate alias for a
  populated team with received evaluations.
- Observed failure: Individual scores were available but team membership and
  team averages were empty/zero.
- Fix: Compare the populated reference’s _id (or unpopulated ID), rather than
  stringifying a plain populated object after toObject().
- Regression: OP-33-29/33 mean, curved and alias cases require exact team members
  and independently calculated averages of 87.5 and 90.63.
- Evidence: Three report assertions failed in `def2859724e0125c`; the filtered
  `1baa3368a04b6e8a` run passed after repair. Both verified cleanup. Current
  restored-suite results remain separately recorded in the #33 guide.
- Fix issue / PR: #33 working tree; no separate fix PR created.


### Final #33 Regression Verification — October 24, 2026

BUG-005–008 are fixed locally and covered by the current roster/report suites.
Complete runs `45f54785c1864e05` and `4d5532e6f33dec89` each passed all 73
integration tests in fresh stacks, exited 0 and verified cleanup. Backend unit
regression tests (62) also passed. These fixes remain unmerged;
no separate GitHub fix issues/PRs were created. See the #33 guide for scope/limits.
