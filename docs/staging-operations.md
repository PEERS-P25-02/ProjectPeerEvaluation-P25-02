# Staging operations

Staging exercises the deployed application and a small set of critical paths
before relying on a delivery. It consists of separate image-backed Render web
services for the frontend and backend, a MongoDB Atlas database, and a Mailtrap
email sandbox. GitHub Container Registry (GHCR) stores the frontend and backend
images used by Render. Staging checks are limited evidence, not a full regression
suite or proof of external email delivery.

Local development uses local or Compose services; CI integration and browser
tests use isolated disposable MongoDB and Mailpit services. Staging uses its own
hosted services and a reusable synthetic fixture. See [development](development.md)
and [testing](testing.md) for local and CI setup and test isolation.

## Configuration

Configure these settings in the appropriate service, without recording their
values in the repository, logs, or artifacts:

- **Render backend environment:** `MONGODB_URI` for Atlas (`MONGO_URI` is a
  legacy fallback), a strong `JWT_SECRET`, `FRONTEND_URL` for email links, and
  Mailtrap settings `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
  `SMTP_AUTH_REQUIRED`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. Use
  authenticated SMTP for staging. `SMTP_INVITATION_INTERVAL_MS` defaults to
  10000 ms when unset. `PORT` is supplied by the runtime. See the
  [environment template](../.env.example) for setting descriptions; its local
  values are not staging credentials.
- **GitHub Actions repository variables:** `BACKEND_SERVICE_ID` and
  `FRONTEND_SERVICE_ID` identify distinct staging services. Optional
  `STAGING_BACKEND_NAME`, `STAGING_FRONTEND_NAME`, `STAGING_BACKEND_URL`, and
  `STAGING_FRONTEND_URL` override workflow defaults. Origins must be bare HTTPS
  `*.onrender.com` origins, without a path, port, or trailing slash. Service
  names, IDs, origins, and configured GHCR image repositories must identify the
  intended staging services.
- **GitHub Actions secrets:** `RENDER_API_KEY` must be able to trigger and
  inspect deployments for both services. `STAGING_EVALUATION_TOKEN` holds the
  dedicated synthetic fixture token. The workflow uses GitHub's `GITHUB_TOKEN`
  for its GHCR and repository operations.

The frontend image embeds `STAGING_BACKEND_URL` plus `/api` at build time;
changing a runtime setting alone does not change that compiled URL. The backend
`FRONTEND_URL` should match the frontend origin used for links. Inspect provider
settings through authorized access; repository defaults and templates do not
prove the present hosted configuration. See [CI/CD](ci-cd.md#continuous-delivery)
for the automation and its configuration checks.

## Monitor a deployment

1. In GitHub Actions, open the CD run associated with the successful `main` CI
   run for the intended commit. Check the source SHA and run attempt; a skipped
   or ineligible run is not a deployment. The [CI/CD guide](ci-cd.md#triggers-and-eligibility)
   explains eligibility.
2. Inspect the publication summary and `staging-images-<sha>-<run>-<attempt>`
   artifact for the source SHA and both immutable image digest references. In the
   same run and attempt, inspect the deployment summary and
   `staging-deployment-<sha>-<run>-<attempt>` artifact for service and deploy
   IDs, image refs, live statuses, backend health, and any failure phase.
3. In Render, inspect both staging services' deployment status and logs, using
   the recorded deploy IDs and image refs to identify the deployments. Confirm
   the frontend origin loads and the backend `/api/health` returns HTTP 200 with
   `status: OK`; the login smoke check also exercises frontend-to-backend
   communication. Avoid exposing credentials or token-bearing URLs in logs or
   shared notes.
4. Inspect the smoke job summary and `staging-smoke-<sha>-<run>-<attempt>`
   artifact. A complete CD success requires successful publication, both exact
   image deployments live, healthy backend, all three smoke checks passed,
   evidence validation, and the verified success-history job. Check the run's
   final job results and summary; a Render request accepted or a service marked
   live alone is insufficient. Artifacts may be absent or incomplete after an
   early failure and expire according to repository retention.

The run is evidence of what was verified then; later changes can alter staging.
If a deployment fails or times out, inspect both Render services before any
retry: one service may already have changed, and an ambiguous or queued request
may still run. See [failure handling and recovery](#failure-handling-and-recovery) before retrying.

## Smoke verification

After both deployments pass, CD runs the separate staging Playwright suite. It
uses Chromium, one worker, no retries, and disables traces, screenshots, and
video. The summary and sanitized smoke artifact provide per-check results;
failure details in the artifact are bounded and redact URLs and token forms.
Inspect the failed job and artifact for the check and diagnostic. The
[CI/CD guide](ci-cd.md#post-deployment-verification-and-history) describes
the evidence and success gate.

| Check                      | Expected result and meaning                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend health and MongoDB | `GET /api/health` stays at the configured backend URL, returns HTTP 200, and has JSON `status: OK`. The endpoint reports OK when its MongoDB connection is connected.                                                                                                                                                                          |
| Frontend login             | The frontend origin displays **Professor Login**, email and password fields. Submitting the suite's synthetic invalid credentials sends a POST to the configured backend `/api/auth/login`, receives HTTP 401 with `error.code` of `AUTH_ERROR`, and leaves the login heading visible.                                                         |
| Synthetic evaluation       | The evaluation request for the fixture token returns HTTP 200. The frontend stays on its configured origin and displays **Group Member Evaluation Rubric**, **Course Information**, `Staging Smoke Course`, `Evaluate: Staging Smoke Teammate`, `Communication`, and a visible, enabled rating control. The check selects and submits nothing. |

The evaluation check exercises an unsubmitted fixture; its assertions do not
independently inspect every stored submission or database field. The fixture
must contain a synthetic evaluator and teammate on the same team, with an active
unsubmitted token. A well-formed token alone does not establish that the fixture
exists or is usable. See the [smoke implementation record](archive/implementation-records/staging-smoke-tests.md#fixture-and-operation)
for fixture details and the separately authorized recovery procedure.

For an explicitly authorized manual verification, the supported way to repeat
all three assertions is the [staging test command](testing.md#staging-smoke-checks).
Install Chromium as described there, confirm the configured origins, and supply
`STAGING_EVALUATION_TOKEN` securely in the process environment; do not put the
token in shell history. The suite does not provision or repair the fixture.
The health endpoint and login page can also be inspected individually as above,
but those observations alone do not establish a full smoke pass. Do not select a
rating or submit the synthetic evaluation during inspection.

Keep tokens and token-bearing links out of chat, screenshots, shell history,
source, and retained notes. The application redacts evaluation-token path
segments in its request logger, but platform access logs may have different
retention; verify hosted logging before using a long-lived token. Use only
synthetic data and coordinate fixture repair or token rotation with a maintainer.

## Troubleshooting

- **Backend unhealthy or database disconnected:** inspect the backend Render
  deployment and application logs, Atlas availability and network access, and
  the configured `MONGODB_URI`. A failed health check prevents the normal
  frontend deployment step; inspect actual service state before retrying.
- **Frontend cannot reach backend:** compare the built frontend API origin with
  the intended backend and check both service logs and the login request. A
  changed backend origin requires a frontend image built with the new origin.
- **Smoke failure:** use the sanitized artifact's failed check and diagnostic,
  then check service health, URLs, and fixture state. A failed smoke run does
  not record a verified CD success; it does not automatically undo deployments.
- **Incorrect configuration:** compare Actions variables, secrets, and Render
  settings with the intended services. Check URL formatting and distinct
  service IDs; never paste protected values into an issue or log.
- **Missing, changed, or submitted fixture:** ask a maintainer to inspect the
  dedicated synthetic records and secret. Follow the separately authorized
  [fixture recovery procedure](archive/implementation-records/staging-smoke-tests.md#manual-fixture-recovery-or-token-rotation);
  do not modify unrelated data.
- **Email sandbox:** check Mailtrap credentials, inbox, and plan limits when
  diagnosing invitation delivery. The ten-second invitation delay is per request,
  not a shared rate limiter; concurrent sends or other mail can exceed sandbox
  limits, and large batches can outlast the browser timeout. Smoke checks do not
  send email or prove external delivery.


## Manual staging rollback

Use [Manual Staging Rollback](../.github/workflows/staging-rollback.yml) when
both staging services need restoration to a previously verified image pair.
A successful history entry records an earlier verification, not current image
availability or compatibility. Confirm the older images work with the current
Atlas data and external configuration. **Rollback restores container images;
it does not restore database state or external configuration.** Coordinate any
separate data recovery with the responsible maintainers.

1. Ensure you have repository access to run Actions workflows and inspect runs,
   artifacts, and history tags. The workflow needs repository contents and GHCR
   package read access, the configured staging variables and `RENDER_API_KEY`,
   and the synthetic fixture secret described in [Configuration](#configuration).
   The Render key must be able to trigger and inspect both deployments. Confirm
   both services and their image repositories identify the intended staging
   environment. After replacing services, first obtain a successful CD history
   entry for their new IDs; old entries identify the former services.
2. Find an eligible annotated `staging-success/cd-<run-id>-<attempt>` entry and
   verify its evidence as described in [Deployment history](#deployment-history-and-historical-backfill).
   The retired `staging-last-success` marker is not an eligible target. Ensure
   both historical GHCR digests remain accessible and review database and
   configuration compatibility before proceeding.
3. In GitHub Actions, select **Manual Staging Rollback**, choose **Run workflow**
   on `main`, and supply `target_tag` (the exact tag), `reason` (1–500
   characters), and `compatibility_acknowledged` (true after checking current
   database and external configuration). Do not include secrets in the reason.
4. Read-only preflight validates the dispatch, annotated tag and manifest, source
   commit, and configured service IDs. A successful preflight enters the shared
   CD deployment queue. Under that lock the job checks both GHCR digests, service
   identity and configured image repositories, active or queued Render deploys,
   and that the tag has not changed. Deployments initiated outside these workflows
   are not fully coordinated by the GitHub queue.
5. The workflow requests the exact backend digest first, waits for a new deploy
   to be `live` on that digest and backend health to return HTTP 200 and
   `status: OK`, then restores and verifies the frontend digest. It runs the
   three current `main` smoke checks and verifies their evidence against the
   selected source SHA and image pair. It does not build images or write a new
   success tag or GitHub Release.
6. Inspect both job results and summaries in the Actions run. Download
   `staging-rollback-preflight-<run>-<attempt>` and, when produced,
   `staging-rollback-evidence-<run>-<attempt>` for the redacted outcome, phase,
   digest refs, new deploy IDs and statuses, health and smoke results. The
   successful preflight also uploads `staging-rollback-target-<run>-<attempt>`.
   Artifacts may be incomplete or absent after early failure and expire under
   repository retention; preserve evidence separately if needed.

## Failure handling and recovery

A failed or partial rollback is **not automatically reversed**. Inspect the
workflow phase, summaries and available artifacts, and both Render services and
deploy IDs before selecting another recovery action.

- **Preflight failure:** correct the invalid dispatch, tag, manifest, or service
  IDs and inspect the preflight evidence. No rollback deployment starts and the
  failed preflight does not hold the staging queue.
- **Missing or inaccessible GHCR digest:** inspect package access and whether
  both exact historical images still exist. The digest check stops before Render
  requests; select another compatible verified pair if the target cannot be used.
- **Render failure or timeout:** check service logs and actual deployment state.
  A request may be queued or still running even after an ambiguous response or
  timeout; do not blindly repeat the request. Resolve active deployments and the
  underlying failure before another attempt.
- **Partial restoration:** backend may already be live while frontend remains
  old or failed. Compare both live image refs with the target and inspect health;
  decide on a compatible recovery pair before another authorized rollback or CD.
- **Smoke failure:** inspect the failed check and sanitized diagnostic, service
  health, origins and fixture. A live image pair alone is not a verified rollback;
  use [Smoke verification](#smoke-verification) and the fixture recovery guidance.
- **Other deployments:** CD and rollback share a queue, but external deployments
  can race them. Inspect GitHub and Render for running or queued work. A later
  eligible CD run can start after rollback and replace the restored images; there
  is no persistent hold. The shared queue holds up to 100 pending runs, and
  overflow can cancel a run.

## Deployment history and historical backfill

Find verified tags in the successful CD run's history summary or list and inspect
remote history in a repository checkout:

```sh
git fetch --tags origin
git tag --list 'staging-success/cd-*'
git show 'staging-success/cd-<run-id>-<attempt>'
```

The annotated tag's JSON manifest identifies the source SHA, exact backend and
frontend digest refs, service and deploy IDs, CD run and attempt, and passing
checks. Compare these with the same run and attempt's image, deployment and
smoke artifacts and their job results. Confirm the tag points to the recorded
commit, the deployment reports success, both deploys are live on the matching
refs, backend health passed, and exactly the three required smoke checks passed.
Artifacts can expire; a tag alone cannot establish present service state or image
availability. Tags are append-only by convention, but privileged users can
change them without a protective ruleset.

### One-time historical backfill

A maintainer with permission to push tags may backfill at most the newest
historical CD success with matching deployment and smoke artifacts from the
same run and attempt. Review success, live statuses, health, SHA, exact image
refs, service/deploy IDs and all three passed checks first. Do not infer success
from `staging-last-success`. Download the artifacts and run the current validator
from a repository checkout, substituting reviewed non-secret values and paths:

```sh
export DEPLOYMENT_FILE='staging-deployment.json'
export SMOKE_FILE='staging-smoke-result.json'
export SOURCE_SHA='replace-with-40-hex-artifact-source-sha'
export BACKEND_IMAGE='replace-with-reviewed-backend-digest-ref'
export FRONTEND_IMAGE='replace-with-reviewed-frontend-digest-ref'
export BACKEND_SERVICE_ID='replace-with-staging-backend-service-id'
export FRONTEND_SERVICE_ID='replace-with-staging-frontend-service-id'
export GITHUB_RUN_ID='replace-with-historical-cd-run-id'
export GITHUB_RUN_ATTEMPT='replace-with-historical-attempt'
node scripts/stagingHistory.cjs manifest
```

Review `staging-success.json` against the artifacts and confirm the remote tag
and local tag do not already exist. Then append the single annotated tag without
force, using a checkout that contains the recorded commit:

```sh
history_tag="staging-success/cd-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
git ls-remote --refs origin "refs/tags/$history_tag"
git tag -a "$history_tag" "$SOURCE_SHA" -F staging-success.json
git push origin "refs/tags/$history_tag"
git ls-remote --refs origin "refs/tags/$history_tag"
git rev-parse "refs/tags/$history_tag"
```

Compare the final remote and local tag object IDs. If the ref exists or a push
fails, stop and inspect it; do not overwrite it. Never put the Render API key in
these commands or artifacts. The retired `staging-last-success` is a historical
reference, not proof of a verified deployment or a rollback target; current CD
and rollback do not read or move it, and backfill must not update it. Historical
implementation and hosted evidence are in the [success-history record](archive/implementation-records/staging-success-history-2026-11-14.md)
and [rollback record](archive/implementation-records/manual-staging-rollback-2026-11-14.md).

## Release management

The implemented lifecycle is CI verification followed by eligible staging
image publication, deployment, smoke checks, and a verified staging-success
history tag, as described in [CI/CD](ci-cd.md#continuous-delivery). These tags
are deployment evidence, not formal release candidates or GitHub Releases.
Formal release-candidate creation, approval, versioning, and release publication
are not implemented by these workflows; production release automation remains a
limitation, not a supported procedure.
