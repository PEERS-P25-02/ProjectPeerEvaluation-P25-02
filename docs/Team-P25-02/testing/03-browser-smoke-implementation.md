# Issue #40 — Browser Smoke Test Setup

**Status:** Initial Playwright configuration and smoke tests committed; NOT YET EXECUTED.
**Issue:** https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/issues/40

## 1. Testing strategy
Use Playwright with Chromium against the existing four-service Docker Compose application (MongoDB, Mailpit, Express backend, Nginx frontend). Compose already has database, mail, API and frontend health checks. The Nginx frontend proxies `/api` to the backend; build argument `VITE_API_BASE_URL=/api` prevents hitting cloud services. The smoke tests use only a synthetic nonexistent email, do not create records, and must never run against staging/production. Use the dedicated local Compose environment and verify `E2E_BASE_URL` is `http://127.0.0.1:3000` before running.

The repository already contains a Docker Compose startup/shutdown implementation; this issue adds browser-test orchestration and evidence, not a new Docker stack. Playwright must be installed in the root project's dev dependencies and recorded in `package-lock.json` before considering setup reproducible.

## 2. Test cases
| ID | Steps | Expected outcome |
| --- | --- | --- |
| E2E-40-01 | Start the isolated Compose stack with `npm run docker:up`; ensure `docker compose ps` reports healthy services; request `/api/health` from the frontend origin. | HTTP 200, `status: OK`; real test backend and DB are ready. |
| E2E-40-02 | Navigate to `/` in Chromium using Playwright. | Professor Login heading and email/password fields visible. |
| E2E-40-03 | Submit a synthetic, nonexistent email and invalid password; inspect browser network response. | Browser makes same-origin POST `/api/auth/login` returning HTTP 401 and `AUTH_ERROR`, confirming frontend/backend communication without persisting data. |
| E2E-40-04 | Deliberately invalidate an assertion in a throwaway test branch and run the suite; then restore it. | Runner exits nonzero for failure and returns to passing afterward. |
| E2E-40-05 | Run cleanup with `npm run docker:down` in a guaranteed finally step. | Compose application containers stop; existing volumes are preserved (do not use `down -v`). |

## 3. Results and gaps
All cases: **NOT RUN / NOT VERIFIED**. The presence of the two test files does not establish successful execution. No Playwright package or browser has been installed in the committed lockfile yet. No automated start/stop wrapper has been added. Smoke tests validate a minimal invalid-login journey only; they do not cover authenticating actual fixture accounts (#41), password reset, email delivery, or E2E critical workflow coverage (#42). Before marking complete: install the pinned dev dependency, update lockfile and scripts, run against healthy Compose, capture actual results, validate failure exit and unconditional cleanup, and record exact commands and logs here. Integrate impacted entries into the shared SWE4724 Test Document as required.
