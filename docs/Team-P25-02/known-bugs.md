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
