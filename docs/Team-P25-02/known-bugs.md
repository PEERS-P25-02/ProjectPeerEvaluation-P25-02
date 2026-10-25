# Known Bugs

Track application defects discovered during development and verification. Record the observed behavior, current evidence, and verification limits. Use synthetic data; omit credentials and tokens.

## BUG-001: Password-reset email opens the login page

- Status: Open; observed during manual local testing.
- Reproduce: Request a password reset for an existing test professor, open the captured Mailpit email, and follow its reset link.
- Expected: The password-reset form opens.
- Actual: The application opens the login page.
- Evidence: `src/frontend/App.jsx` uses HashRouter, while `src/backend/utils/emailUtils.js` generates `/reset-password/:token` without the required `/#/` route.
- Follow-up: Fix generated links and verify navigation from a captured email. Review invitation and reminder links for the same routing mismatch.

## BUG-002: Password-reset success response does not match the frontend

- Status: Open; identified through code inspection, not yet reproduced.
- Reproduce: After BUG-001 is fixed, submit matching new passwords using a valid reset token for a test account.
- Expected: A successful update displays confirmation and returns to login.
- Predicted failure: The page reports failure despite a successful update.
- Evidence: `src/frontend/pages/ResetPassword.jsx` checks `res.data.success`, but `src/backend/controllers/authController.js` returns only a success message from `updatePassword`.
- Follow-up: Align the response contract and verify success, invalid and expired tokens, and login with the updated password.

## BUG-003: Selected-student reminders lose the selection filter

- Status: Fixed in source; verification was recorded October 19, 2026.
- Previous behavior: The reminder query declared `_id` twice. The `$nin: completedEvaluations` key replaced `$in: student_ids`, so unselected students with pending evaluations could be included.
- Fix: Combine `$in` and `$nin` under the same `_id` field in `src/backend/controllers/evaluationController.js`.
- Verification: Three in-memory recipient checks passed: selected pending students only, all pending students when no selection is provided, and no recipients for a completed-only selection. MongoDB and SMTP dependencies were stubbed; no permanent test cases were added and no live reminders were sent.
- Evidence: [ESLint implementation and verification](modernization/implementation/tooling/eslint-and-formatting.md).

## BUG-004: Sample-data script imports an undeclared UUID package

- Status: Fixed in source; verification was recorded October 19, 2026.
- Previous behavior: `src/backend/scripts/createITManagementTeams.js` imported `uuid`, but neither manifest declared it. Resolution in the local environment failed with `MODULE_NOT_FOUND`.
- Fix: Use `randomUUID()` from Node's built-in `node:crypto`, preserving the version-4 UUID format without adding a package.
- Verification: Import and token-generation checks passed, including 20 generated values matching the version-4 UUID format. The recorded full-repository lint command exited successfully with no errors or warnings at that time. The database-mutating script was not run.
- Evidence: [ESLint implementation and verification](modernization/implementation/tooling/eslint-and-formatting.md).

## BUG-005: Editing student details removes existing team membership

- Status: Fixed in source and covered by the API/database regression suite.
- Previous behavior: Updating only student name and email could remove the student from the stored team and decrement its count while the student's team assignment remained.
- Fix: In `studentController.updateStudent`, remove old membership only when `group_assignment` was explicitly supplied and membership changes.
- Regression case: OP-33-10 in `roster.test.js` compares the complete stored team before and after a details-only update and verifies that the assignment remains.
- Verification: The defect was reproduced in an earlier selected run; the retained assertion passed after the repair.

## BUG-006: Individual student deletion leaves dependent evaluations

- Status: Fixed in source and covered by the API/database regression suite.
- Previous behavior: Deleting a student could leave feedback the student received or authored.
- Fix: Delete selected-course `Evaluation` records where `student_id` or `evaluator_id` matches the removed student.
- Regression case: OP-33-11 checks both directions, team membership and counts, and an unchanged unrelated course.
- Verification: The defect was reproduced in an earlier selected run; the retained assertion passed after the repair.

## BUG-007: Bulk student deletion misses evaluations they authored

- Status: Fixed in source and covered by the API/database regression suite.
- Previous behavior: Bulk deletion removed feedback addressed to deleted students but could leave feedback authored by them.
- Fix: Match both `student_id` and `evaluator_id` within the selected course.
- Regression case: OP-33-12 verifies incoming and outgoing feedback removal while preserving unrelated and retained feedback, including when input contains a foreign-course ID.
- Verification: The defect was reproduced in an earlier selected run; the retained assertion passed after the repair.

## BUG-008: Course reports lose populated team members and averages

- Status: Fixed in source and covered by the API/database regression suite.
- Previous behavior: Course reports could return team membership and averages as empty or zero for populated teams.
- Fix: Compare the populated reference's `_id` (or its unpopulated ID) rather than stringifying a plain populated object after `toObject()`.
- Regression cases: OP-33-29 and OP-33-33 verify mean, curved, and generate-alias reports, exact team membership, and independently calculated averages of 87.5 and 90.63.
- Verification: Three report assertions failed in an earlier selected run and passed after the repair.

### Recorded Regression Verification — October 24, 2026

The October 24, 2026 recorded verification passed all 73 API/database tests in two fresh isolated runs with cleanup verified. Details, scope, and remaining limits are in the [full integration record](modernization/implementation/testing/api-database-integration.md).
