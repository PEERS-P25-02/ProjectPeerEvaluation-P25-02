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

## BUG-009: Course endpoints do not enforce professor ownership

- Status: Fixed and verified by isolated integration regression tests.
- Previous behavior: An authenticated professor could address another professor's course through course-scoped endpoints. In the baseline authorization run, all 28 foreign-course cases failed to return the required `404 NOT_FOUND` response.
- Fix: Authenticate the courses router once and verify each `course_id` belongs to the authenticated professor before its route handler runs. Invalid IDs return `400 VALIDATION_ERROR`; absent and foreign courses return the same `404 NOT_FOUND` response.
- Verification: The original backend failed all 28 cross-professor route checks; the repaired backend passed them in both final full-suite runs with verified cleanup.
- Evidence: [Authentication and authorization integration record](modernization/implementation/testing/authentication-authorization-integration.md).

## BUG-010: Team reports can return a team from another course

- Status: Fixed and verified by isolated integration regression tests.
- Previous behavior: The team report looked up a team by ID alone, so a request for an authorized course could return the team document for a team belonging to a different course.
- Fix: Scope the team lookup by both team ID and the authorized course ID. A team outside that course follows the existing `404 NOT_FOUND` path.
- Verification: The original endpoint returned HTTP 200 for the foreign-team probe; the repaired endpoint returned 404 in both final full-suite runs.
- Evidence: [Authentication and authorization integration record](modernization/implementation/testing/authentication-authorization-integration.md).

## BUG-011: Resource update bodies can reassign protected fields

- Status: Fixed and verified by isolated integration regression tests.
- Previous behavior: Course, student, and team update handlers accepted request bodies without field allowlists, and team creation copied submitted team objects. This allowed requests to attempt reassignment of ownership, identity, relationships, and system-maintained fields, including foreign student references in teams.
- Fix: Restrict course updates to course name, number, section, semester, and status; student updates to student ID, name, email, and group assignment, deriving `team_id` in the existing assignment flow; team updates to name and status; and team creation to name and optional status with the route's course ID.
- Verification: The original backend allowed the course-owner and student-course reassignment probes and accepted a submitted team identity. The repaired backend passed protected-field and identity checks in both final full-suite runs.
- Evidence: [Authentication and authorization integration record](modernization/implementation/testing/authentication-authorization-integration.md).

## BUG-012: Student evaluation submissions accept ineligible recipients

- Status: Fixed and verified by isolated integration regression tests.
- Previous behavior: Evaluation submissions did not verify that every requested recipient was an eligible peer, allowing attempts involving the token holder, a student in another course, a student on a different team, or a later forbidden recipient in a mixed request.
- Fix: Validate the complete recipient set against the token holder's eligible peer set before saving any evaluations. Teamless students retain the supported same-course peer eligibility rule.
- Verification: The original backend failed all five recipient-denial cases. The repaired backend passed those cases, the mixed-recipient no-write check, and the allowed teamless submission in both final full-suite runs.
- Evidence: [Authentication and authorization integration record](modernization/implementation/testing/authentication-authorization-integration.md).

## BUG-013: Invitation email links omit the frontend hash route

- Status: Fixed and covered by captured-email integration tests.
- Previous behavior: Invitation emails used `/evaluate/<token>`, while the frontend routes evaluations through `/#/evaluate/<token>`.
- Fix: Build the invitation URL with the evaluation route in its hash, preserving the configured frontend pathname. The clickable link and fallback text use the same URL.
- Verification: Both original-backend content cases failed on the missing hash route. The repaired cases check the captured URL and resolve its token to the intended student/course through the real API. Actual browser navigation remains an E2E target.
- Evidence: [Email integration record](modernization/implementation/testing/email-integration.md).

## BUG-014: Failed invitation sends are reported as successful

- Status: Fixed and covered by real SMTP rejection tests.
- Previous behavior: Course and team invitation endpoints returned HTTP 200 and a success message even when Mailpit rejected every attempted message; frontend handlers treat successful HTTP responses as successful sends.
- Fix: Return HTTP 502 when any intended send fails, retaining accepted/failed counts and recipient details. Fully successful batches continue to return HTTP 200.
- Verification: Four original-backend cases failed when actual Mailpit sender/recipient rejection produced HTTP 200. The repaired cases require truthful failure responses, no captured rejected messages, restored SMTP, and successful retry with retained tokens.
- Evidence: [Email integration record](modernization/implementation/testing/email-integration.md).

## BUG-015: Generated tokens are mistaken for successful invitation sends

- Status: Fixed and covered by SMTP, status, reset, and roster tests.
- Previous behavior: Tokens were stored before SMTP was attempted, and their existence made evaluation status claim invitations were sent even after rejection.
- Fix: Record `invitation_accepted_at` only after SMTP acceptance and only for the token actually emailed. Status requires recorded acceptance; a failed resend preserves prior acceptance. Evaluation reset and roster replacement clear the marker with the token. Existing tokens are not assigned guessed acceptance history.
- Verification: Failure/retry cases assert false status before acceptance and true status with stored timestamps after acceptance. A failed resend preserves the original timestamps/messages. Existing fixture tests check legacy tokens, reset/import clearing, and unrelated-course preservation; unit tests check a failed token-matched acknowledgment update.
- Evidence: [Email integration record](modernization/implementation/testing/email-integration.md).

## BUG-016: Partially accepted invitation batches appear complete

- Status: Fixed and verified; follow-up results are recorded in the email integration record.
- Previous behavior: One student's SMTP acceptance made the course-level `evaluations_sent` flag true, while students without acceptance appeared alongside invited students as pending submissions.
- Fix: Expose not-sent, partial, and complete invitation states and accepted/outstanding counts. Set the legacy sent flag only for complete acceptance. Show partial status and per-student acceptance separately from submission progress, while retaining reset protection for partially sent evaluations.
- Regression: Accept one team's invitation, reject the remaining team, then retry successfully; status must progress from partial, remain partial on rejection, and finally become complete.
- Evidence: [Email integration record](modernization/implementation/testing/email-integration.md).
