# Issue #47 — CI pipeline failure and recovery validation

**Date:** October 30, 2026  
**Branch:** `phoenix/issue-47-pipeline-validation`  
**Status:** Lint failure and recovery validated; browser failure artifacts and shared Test Document updates remain.

## Purpose and test setup

Validate that the PEERS GitHub Actions workflow reports representative failing and passing checks, and retains diagnostic artifacts. Trigger CI on a dedicated feature branch, never on `main`. The workflow is `.github/workflows/ci.yml`. Docker-backed integration and Playwright tests use isolated Compose environments.

## Test cases and observed results

| Test case | Procedure | Expected | Observed result | Status |
| --- | --- | --- | --- | --- |
| CI47-01 — Intentional lint failure | Add `src/frontend/ci47-intentional-failure.js` with invalid JavaScript, commit and push | Lint and Formatting fails; the workflow is marked failed; other independent checks remain visible | Commit `dcfc773`, GitHub Actions display run **#359**: Lint and Formatting and overall workflow failed; eight other jobs passed; five artifacts shown | Pass for status detection |
| CI47-02 — Restore the pipeline | Remove the temporary file, commit and push | Lint and overall workflow return to passing | Commit `0f96acf`, display run **#360**: all nine jobs succeeded; five artifacts shown | Pass |
| CI47-03 — Browser failure evidence | Introduce a controlled failing E2E assertion on an isolated branch; inspect artifacts and restore it | E2E failure, screenshot/trace and service logs available; cleanup verified | Not yet executed as part of #47 | Not run |
| CI47-04 — Regression aggregate failure | Temporarily fail a required unit, integration or E2E suite | Regression Checks fails when a required dependency fails | Not yet executed as part of #47 | Not run |

**Repository Actions history:** https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions  
**Failure commit:** https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/commit/dcfc773  
**Recovery commit:** https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/commit/0f96acf

The numbers #359 and #360 are the workflow's displayed sequence numbers, not its URL run IDs. Record exact run links from GitHub before declaring the full evidence checklist complete.

## Reproduction and verification

1. Start from clean `main` and switch to a dedicated issue branch.
2. Add a disposable JavaScript file containing `export const intentionalFailure = ;`, commit, and push. Observe the GitHub Actions **Lint and Formatting** job and full workflow status.
3. Open the failed job's logs and record the exact ESLint diagnostic and run URL.
4. Delete the disposable file, commit, and push. Verify all nine jobs pass on the restoration run.
5. Download integration, E2E, frontend/backend coverage and security-report artifacts as applicable. Distinguish evidence that an artifact was uploaded from evidence that its contents are complete and useful.

## Limitations and follow-ups

- The initial local `npm run lint` failed because `@vitest/eslint-plugin` was missing, not because ESLint parsed the deliberate syntax error. Install locked dependencies (`npm ci`; backend: `npm ci --prefix src/backend`) for local validation. The hosted lint check failed, but its precise diagnostic still needs to be captured from the job log.
- **Regression Checks passed on failed run #359** because it depends on Unit Tests, Integration Tests and End-to-End Tests, all of which passed. It is not intended to aggregate lint.
- Five artifacts appeared on both GitHub Actions run summaries. Their individual contents have not been inspected for this record.
- The failed browser screenshot/trace and failed regression aggregate behaviors are unverified by these two runs.
- No branch protection or required status-check enforcement was demonstrated.
- Update affected Sections 1–3 of the separate shared SWE4724 Test Document and link it in the PR. This record does not replace that deliverable.
- The intentional failure file was removed by recovery commit `0f96acf`.
