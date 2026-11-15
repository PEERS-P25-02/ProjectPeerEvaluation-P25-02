# Continuous delivery: staging images and deployment

The [CD workflow](../../../.github/workflows/cd.yml) runs after a successful `main` push [CI workflow](../../../.github/workflows/ci.yml). Publication accepts only this repository's current two-parent `main` merge commit. Pull requests and merge-group runs do not publish or deploy; a direct push that is not an eligible current two-parent merge, a stale run, or an unsuccessful CI run also does not publish or deploy images.

For every successful CI push run for this repository's current two-parent `main` merge commit, CD publishes both staging images and deploys both services, regardless of changed paths. Documentation-only and test-only changes are eligible. The workflow requires a successful same-repository `main` push run and confirms the candidate is still the current `main` tip and has exactly two parents before publication. The deployment helper repeats the current-main check before each service request; the two-parent check runs in the workflow. Unsuccessful, foreign, non-push, non-main, stale, or non-merge evidence does not initiate deployment. There is no path classifier, baseline comparison, or Render drift skip check.

After both services pass deployment checks, all three required smoke checks pass, and the same-run deployment and smoke artifacts validate, CD appends exactly one annotated `staging-success/cd-<run-id>-<attempt>` tag. The history tag contains the version-1 manifest with source SHA, exact backend/frontend GHCR digest refs, service and deploy IDs, workflow run ID/attempt, and the three required smoke names with `passed` results. It contains no smoke diagnostics or credentials. The workflow checks that the remote ref does not already exist, pushes the one tag without force, verifies the exact remote tag object ID, and shows the verified tag prominently in the Actions summary. Failed or incomplete validation creates no tag; a pre-existing tag is never overwritten.

`staging-last-success` remains on the remote as a historical reference and is retired from active CD. Neither CD nor manual rollback reads, moves, or deletes it. Keep the [manual latest-verified history backfill procedure](#one-time-historical-backfill) for appending a history tag from matching deployment and smoke artifacts. Workflow history tags are append-only by convention; a maintainer or sufficiently privileged token can still modify or delete them absent a protective tag ruleset. A future eligible automatic CD run may replace a manually restored version; no persistent hold is planned. See [manual staging rollback](#manual-staging-rollback) for recovery under [issue #169](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/issues/169).

If eligibility validation fails, inspect the CI run identity, candidate SHA, current `main` tip, and merge-parent count. Correct the underlying source/run issue before retrying; the publication job must not bypass these guards.

### Manual staging rollback

Use [Manual Staging Rollback](../../../.github/workflows/staging-rollback.yml) only for the two configured staging services. Select the exact `staging-success/cd-<run>-<attempt>` or `staging-success/rollback-<run>-<attempt>` tag from a verified run, enter a short reason, and explicitly acknowledge that the older images must be compatible with current MongoDB Atlas data and external configuration. A history tag proves its original deployment and three smoke checks passed; it does not prove that its GHCR images remain available or that today's database is compatible. Original Render deploy IDs are audit evidence, not restore targets. The retired `staging-last-success` tag is not a selectable target.

Dispatch on `main`. A read-only preflight validates the request and selected history tag, then the rollback job waits for the shared staging concurrency group if CD is running. Inside that group, it verifies both GHCR digests, checks that the configured Render services have no active or queued deployment, and confirms the selected tag is unchanged before requesting a deploy. CD and rollback cannot mutate staging simultaneously through these workflows. A CD run queued during rollback may deploy immediately after rollback finishes and replace the restored images; another manual rollback may then be needed. A failed preflight does not hold staging. Deployments started outside these workflows remain a coordination limit.

Rollback requests both exact recorded GHCR digests, backend first, then requires backend health HTTP 200 with `status: OK`, and finally deploys the frontend. Each new Render deploy ID must become `live` on its exact digest. The workflow then runs the current three staging smoke checks using code from the dispatched `main` revision, records bounded redacted evidence, and appends one annotated `staging-success/rollback-<run>-<attempt>` tag only after all checks pass. It does not build images, change `main`, restore Atlas, or move a baseline marker. A failed or partial rollback creates no success tag and does not automatically reverse images already deployed; inspect the phase, new deploy IDs, Render state, and smoke evidence before trying another recovery. Do not blindly repeat a POST after a timeout or ambiguous response.

The shared workflow queue allows up to 100 pending runs; an overflow can cancel a run. Workflow-created history tags use non-force pushes but are not protected from privileged edits without a tag ruleset. The first hosted rollback rehearsal and its evidence remain pending after this implementation merges; local mocked checks do not establish live recoverability.

### One-time historical backfill

Backfill at most the newest historical CD success for which both exact run/attempt artifacts exist and agree. Inspect the deployment artifact for `result: success`, both `live` statuses, service/deploy IDs, and exact image refs; inspect the smoke artifact for `validation_result: success`, matching SHA/images, and exactly the three required checks passed. Do not infer a success from the old baseline SHA. Download both artifacts from the same run, then run the same manifest validator with that run's SHA, images, configured service IDs, run ID, and attempt:

Replace the clearly marked placeholders below with the non-secret values from the reviewed artifacts and existing staging configuration. Do not put the Render API key in this shell or in the artifacts.

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

Review the resulting manifest against the artifact contents, then create only `staging-success/cd-<historical-run-id>-<attempt>` with a non-force annotated tag push. Backfill never changes `staging-last-success`; that remote tag is retired from active CD and is neither read nor moved by the workflow. Backfill is manual and is not run by this workflow.

After confirming the generated manifest and that the history ref does not already exist, the history-only write is:

```sh
history_tag="staging-success/cd-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
git tag -a "$history_tag" "$SOURCE_SHA" -F staging-success.json
git push origin "refs/tags/$history_tag"
```

This push intentionally has no force option. If the tag already exists or push fails, stop and inspect the remote ref; do not replace it. Do not update `staging-last-success` during backfill.

The publication job builds the repository-root frontend Dockerfile and `src/backend/Dockerfile` for `linux/amd64`. It embeds the public `https://peers-staging-backend.onrender.com/api` address in the frontend image; Atlas and Mailtrap values remain Render runtime settings. Each image has a full source-SHA GHCR tag. The job records both immutable digest references, source SHA, and CI/CD run identities in its summary and downloadable `staging-images-<sha>-<run>-<attempt>` artifact. Deployment consumes these exact digest outputs, not a moving `latest` tag.

## Render configuration

The first hosted deployment reached `live` for both configured image-backed service IDs. Configure `RENDER_API_KEY` as a GitHub Actions secret and `BACKEND_SERVICE_ID` and `FRONTEND_SERVICE_ID` as Actions variables that identify only the staging services. Each service's configured image repository must match its corresponding published GHCR image. Confirm the services cannot independently deploy an unverified Git commit and review Render's overlapping-deploy policy when changing service settings. Keep credentials, Atlas and Mailtrap values, and real student data out of Actions logs and artifacts.

### Staging invitation interval

The backend waits ten seconds between individual course/team invitation attempts by default (`SMTP_INVITATION_INTERVAL_MS=10000` when unset). This matches the published Mailtrap Free Email Sandbox limit of one message per ten seconds for a single sequential batch; the first attempt starts immediately and there is no wait after the last. Keep staging at the default or set the same value explicitly. Isolated local/CI Mailpit uses `0` because it has no staging rate limit. The interval does not change recipient selection, saved tokens, SMTP failure counts, or HTTP 502 partial-failure behavior.

The delay is **per request**, not a shared rate limiter. Concurrent invitation requests, multiple backend instances, or reminders/password-reset messages can still exceed Mailtrap's shared limit. A batch of 19 students needs at least 180 seconds of gaps before SMTP and database time, while the frontend API client times out at 180 seconds; larger batches can therefore finish on the server after the browser has timed out. A retry can resend to students whose first invitation was accepted. Use a higher-throughput sandbox or a separately planned asynchronous sending design for larger or concurrent batches. No hosted invitation behavior is verified by local tests alone. [Mailtrap plan limits](https://mailtrap.io/pricing/)

The API key must be able to trigger and retrieve deploys for both services. `BACKEND_SERVICE_ID` and `FRONTEND_SERVICE_ID` must identify distinct staging services; missing, invalid, or duplicate IDs fail success-manifest validation. The workflow does not create or change Render services, registry credentials, or service settings. If a variable is missing or points to the wrong service, correct the Actions setting before retrying; do not put service IDs or the API key in workflow source.

## Deployment sequence and evidence

After both digests are published, the dependent job rechecks the current `main` tip and asks the [Render Trigger Deploy API](https://api-docs.render.com/reference/create-deploy) to deploy the backend digest through its `imageUrl` field. It requires a started deploy with an ID, then polls [Retrieve Deploy](https://api-docs.render.com/reference/retrieve-deploy) for `live` and the exact image reference. Only then does it require `https://peers-staging-backend.onrender.com/api/health` to return HTTP 200 and `status: OK`, which also requires MongoDB connectivity. It rechecks `main` before requesting the frontend digest and waits for that deploy to become `live` with the matching image reference.

CD runs are serialized. A failed request, terminal deploy failure, digest mismatch, stale source, or timeout fails the job. HTTP 202 is recorded as a failure because a queued deploy may not provide a usable ID; inspect Render because that queued deploy might still run. If `main` advances after the backend deploy, the second stale-source check can stop before frontend, leaving a temporary mixed pair until a later run completes. This workflow does not roll back automatically.

The requester reports that Render also checks frontend `/` and backend `/api/health` at the service level; those platform settings were not inspected from this repository. The CD helper independently checks backend `/api/health` before deploying the frontend. The smoke suite rechecks backend health after both services are live and opens frontend `/` during the login check, without adding a standalone root-page case.

Before requesting either Render deployment, CD requires a configured `STAGING_EVALUATION_TOKEN` secret with the expected format. This prevents a known missing-secret failure after service mutation; it does not establish that the separately provisioned fixture exists or is unsubmitted.

The job summary and `staging-deployment-<sha>-<run>-<attempt>` artifact retain the source SHA, digest references, service and deploy IDs, observed statuses, backend health result, failure phase, and reason. They do not contain the API key or raw Render responses. After both digests are live, `validate-staging-smoke` runs the separate staging Playwright config and uploads `staging-smoke-<sha>-<run>-<attempt>`, a bounded outcome record tied to the source SHA and both digests. It includes sanitized per-check title/status/duration and a bounded failure category/diagnostic; diagnostic URLs and evaluation-token forms are redacted before writing. The run summary contains no test error details or evaluated page URLs; on failure it links to the manual rollback workflow. The three checks cover backend/database health, rendered login plus rejected synthetic credentials, and loading an unsubmitted dedicated synthetic evaluation. The job requires the protected `STAGING_EVALUATION_TOKEN` secret; its fixture must be provisioned separately and never modified by smoke tests. Origins are fixed and guarded in the config. Browser traces, screenshots, and video are disabled, the secret is masked in workflow logs, and the backend application request logger redacts evaluation-token path segments. A hosted platform may maintain request/access logs outside this application's control; confirm its access-log retention policy before provisioning a long-lived token. The history-tag job depends on successful smoke validation and evidence upload. A failed smoke creates no history tag; restoration is the separate manual operation under [issue #169](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/issues/169). See the [staging smoke implementation record](../modernization/implementation/testing/staging-smoke-tests.md) for local validation and hosted limits.

On 2026-11-13, the requester confirmed this staging workspace has no HTTP request logs. [Render documents](https://render.com/docs/logging) that Pro and higher workspaces can retain requested URLs in those logs; recheck this assumption if the workspace plan or log configuration changes.

Fixture recovery and token rotation require separate maintainer authorization; follow the [manual staging fixture procedure](../modernization/implementation/testing/staging-smoke-tests.md#manual-fixture-recovery-or-token-rotation). CD does not repair or provision the fixture.

## Evidence status

The [first main-push run with publication in CI](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/42754779210) passed `CI Gate` but skipped publication. [PR #175](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/pull/175) moved publication to the separate CD workflow. After [PR #177](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/pull/177) merged, [main CI run 43081890387](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43081890387) passed its applicable jobs, and [CD run 43082439610](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43082439610) published and deployed both immutable images. The [deployment artifact](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43082439610/artifacts/13884538355) records both deploy IDs and `live` statuses, backend health HTTP 200 with `status: OK`, and `result: success`. See the [dated implementation record](../modernization/implementation/continuous-integration.md#first-hosted-render-deployment-2026-11-11) for exact digests and verification limits.

After [PR #183](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/pull/183) merged, [CD run 43533681946](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43533681946) deployed both digests and passed all three staging smoke checks; its then-active baseline job succeeded. This is historical evidence for the prior workflow design. The [smoke artifact](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43533681946/artifacts/14088562649) records each check as `passed` for source `dc5f32e587083fd6ff589eb417e03cf4e2687e1d`. See the [staging smoke validation record](../modernization/implementation/testing/staging-smoke-tests.md#validation-evidence-and-limits) for the hosted evidence and remaining limits.
