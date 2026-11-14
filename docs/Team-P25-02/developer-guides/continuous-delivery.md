# Continuous delivery: staging images and deployment

The [CD workflow](../../../.github/workflows/cd.yml) runs after a successful `main` push [CI workflow](../../../.github/workflows/ci.yml). Publication accepts only this repository's current two-parent `main` merge commit. Pull requests, merge groups, direct pushes, stale runs, and unsuccessful CI runs do not publish or deploy images.

Before publication, CD compares the candidate tree with the `staging-last-success` tag. Since [CD run 43533681946](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43533681946), the tag identifies the source commit of the last deployment that also passed staging smoke validation. A missing or invalid tag, a tag that is not an ancestor of the candidate, or a comparison error selects deployment of both services. CD skips both only when every changed path is in these audited exclusions:

- Directories: `docs/`, `src/frontend/test/`, `src/frontend/tests/`, `src/backend/tests/`, and `tests/e2e/`.
- Exact files: `README.md`, `Dockerfile.e2e`, `Dockerfile.e2e.dockerignore`, `src/backend/Dockerfile.test`, `src/backend/Dockerfile.test.dockerignore`, `playwright.config.cjs`, `src/backend/vitest.config.mjs`, `src/backend/vitest.coverage.config.mjs`, `src/backend/vitest.integration.config.mjs`, `compose.e2e.yml`, `compose.test.yml`, `compose.test.coverage.yml`, and `scripts/runE2ETests.cjs`.

The denylist is encoded in the [decision helper](../../../scripts/decideStaging.cjs). It was audited against the production [frontend Dockerfile](../../../Dockerfile), [root `.dockerignore`](../../../.dockerignore), [backend Dockerfile](../../../src/backend/Dockerfile), and [backend `.dockerignore`](../../../src/backend/.dockerignore). The root production context removes documentation and test trees; the backend production context removes backend tests. The test-only Dockerfiles and their ignore files, E2E/test configuration, Compose files, and runner are not used by CD's direct production image builds. Any other path, including production Dockerfiles and ignore rules, workflow/deployment code, package inputs, runtime source, and frontend build instrumentation, triggers both services. Re-audit the exclusions when either production build context or the CD workflow changes.

The `staging-last-success` baseline is an annotated tag with a versioned JSON manifest. After both services pass deployment checks, all three required smoke checks pass, and the same-run deployment and smoke artifacts validate, CD atomically creates `staging-success/cd-<run-id>-<attempt>` and moves the baseline to the same source commit with the same manifest. The history tag is never force-updated by the workflow. The atomic push uses a lease for the previously observed baseline object; a rejected lease, unsupported atomic push, artifact mismatch, or pre-existing history tag fails the final job without advancing either ref. Skipped and failed runs do not move the baseline, so later comparisons include their changes.

Before a path-only skip, CD parses the annotated manifest and reads the Render deploy list for both configured staging services. It paginates with Render cursors (up to ten pages of 100), requires one unambiguous live deploy per service, no unknown or active deploy state, and an exact match between both live image references, the manifest digests, and the configured service IDs. A missing or lightweight legacy marker, missing configuration, API failure, pagination limit, ambiguous state, or digest drift selects deployment of both services. This check is read-only. The path decision summary and the separate final-decision summary record bounded reason codes only.

The annotated tag format is `kind: cd`, `schema_version: 1`, source SHA, exact backend/frontend GHCR digest refs, service and deploy IDs, workflow run ID/attempt, and the three required smoke names with `passed` results. It contains no smoke diagnostics or credentials. The baseline tag keeps its commit target, so existing `staging-last-success^{commit}` comparisons continue to work. The success job summary links to the exact history tag only after the remote refs are verified.

Workflow behavior makes history tags append-only by choosing unique run/attempt names and never forcing them. GitHub currently has no tag ruleset protecting these refs; a maintainer or sufficiently privileged token can still modify or delete them. Do not describe the tags as Git-enforced immutable records. Local synthetic tests cover the atomic ref transaction, but do not prove GitHub accepts atomic pushes or that hosted Render responses match the parser. A post-merge eligible CD run is required for those hosted checks.

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

Review the resulting manifest against the artifact contents, then create only `staging-success/cd-<historical-run-id>-<attempt>` with a non-force annotated tag push. Backfill never changes `staging-last-success`. If that marker is still a legacy lightweight tag, the drift guard will select deployment on the next eligible run that would otherwise skip; that successful run will establish the metadata-bearing baseline. Backfill is manual and is not run by this workflow.

After confirming the generated manifest and that the history ref does not already exist, the history-only write is:

```sh
history_tag="staging-success/cd-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
git tag -a "$history_tag" "$SOURCE_SHA" -F staging-success.json
git push origin "refs/tags/$history_tag"
```

This push intentionally has no force option. If the tag already exists or push fails, stop and inspect the remote ref; do not replace it. Do not update the baseline during backfill.

To troubleshoot a decision, inspect the **Staging path decision** job summary for the baseline, candidate, path counts, and bounded path list rendered as JSON strings in code spans. A `missing-or-invalid-baseline` or `baseline-or-diff-error` reason deliberately deploys both services; inspect the tag and rerun after correcting the underlying Git/ref issue. An invalid candidate or failed current-main/two-parent guard fails the decision job before publication.

The publication job builds the repository-root frontend Dockerfile and `src/backend/Dockerfile` for `linux/amd64`. It embeds the public `https://peers-staging-backend.onrender.com/api` address in the frontend image; Atlas and Mailtrap values remain Render runtime settings. Each image has a full source-SHA GHCR tag. The job records both immutable digest references, source SHA, and CI/CD run identities in its summary and downloadable `staging-images-<sha>-<run>-<attempt>` artifact. Deployment consumes these exact digest outputs, not a moving `latest` tag.

## Render configuration

The first hosted deployment reached `live` for both configured image-backed service IDs. Configure `RENDER_API_KEY` as a GitHub Actions secret and `BACKEND_SERVICE_ID` and `FRONTEND_SERVICE_ID` as Actions variables that identify only the staging services. Each service's configured image repository must match its corresponding published GHCR image. Confirm the services cannot independently deploy an unverified Git commit and review Render's overlapping-deploy policy when changing service settings. Keep credentials, Atlas and Mailtrap values, and real student data out of Actions logs and artifacts.

### Staging invitation interval

The backend waits ten seconds between individual course/team invitation attempts by default (`SMTP_INVITATION_INTERVAL_MS=10000` when unset). This matches the published Mailtrap Free Email Sandbox limit of one message per ten seconds for a single sequential batch; the first attempt starts immediately and there is no wait after the last. Keep staging at the default or set the same value explicitly. Isolated local/CI Mailpit uses `0` because it has no staging rate limit. The interval does not change recipient selection, saved tokens, SMTP failure counts, or HTTP 502 partial-failure behavior.

The delay is **per request**, not a shared rate limiter. Concurrent invitation requests, multiple backend instances, or reminders/password-reset messages can still exceed Mailtrap's shared limit. A batch of 19 students needs at least 180 seconds of gaps before SMTP and database time, while the frontend API client times out at 180 seconds; larger batches can therefore finish on the server after the browser has timed out. A retry can resend to students whose first invitation was accepted. Use a higher-throughput sandbox or a separately planned asynchronous sending design for larger or concurrent batches. No hosted invitation behavior is verified by local tests alone. [Mailtrap plan limits](https://mailtrap.io/pricing/)

The API key must be able to trigger and retrieve deploys for both services. `BACKEND_SERVICE_ID` and `FRONTEND_SERVICE_ID` must identify distinct staging services; missing, invalid, or duplicate IDs fail success-manifest validation and make a skip check choose deployment. The workflow does not create or change Render services, registry credentials, or service settings. If a variable is missing or points to the wrong service, correct the Actions setting before retrying; do not put service IDs or the API key in workflow source.

## Deployment sequence and evidence

After both digests are published, the dependent job rechecks the current `main` tip and asks the [Render Trigger Deploy API](https://api-docs.render.com/reference/create-deploy) to deploy the backend digest through its `imageUrl` field. It requires a started deploy with an ID, then polls [Retrieve Deploy](https://api-docs.render.com/reference/retrieve-deploy) for `live` and the exact image reference. Only then does it require `https://peers-staging-backend.onrender.com/api/health` to return HTTP 200 and `status: OK`, which also requires MongoDB connectivity. It rechecks `main` before requesting the frontend digest and waits for that deploy to become `live` with the matching image reference.

CD runs are serialized. A failed request, terminal deploy failure, digest mismatch, stale source, or timeout fails the job. HTTP 202 is recorded as a failure because a queued deploy may not provide a usable ID; inspect Render because that queued deploy might still run. If `main` advances after the backend deploy, the second stale-source check can stop before frontend, leaving a temporary mixed pair until a later run completes. This workflow does not roll back automatically.

The requester reports that Render also checks frontend `/` and backend `/api/health` at the service level; those platform settings were not inspected from this repository. The CD helper independently checks backend `/api/health` before deploying the frontend. The smoke suite rechecks backend health after both services are live and opens frontend `/` during the login check, without adding a standalone root-page case.

Before requesting either Render deployment, CD requires a configured `STAGING_EVALUATION_TOKEN` secret with the expected format. This prevents a known missing-secret failure after service mutation; it does not establish that the separately provisioned fixture exists or is unsubmitted.

The job summary and `staging-deployment-<sha>-<run>-<attempt>` artifact retain the source SHA, digest references, service and deploy IDs, observed statuses, backend health result, failure phase, and reason. They do not contain the API key or raw Render responses. After both digests are live, `validate-staging-smoke` runs the separate staging Playwright config and uploads `staging-smoke-<sha>-<run>-<attempt>`, a bounded outcome record tied to the source SHA and both digests. It includes sanitized per-check title/status/duration and a bounded failure category/diagnostic; diagnostic URLs and evaluation-token forms are redacted before writing. The run summary contains no test errors or URLs. The three checks cover backend/database health, rendered login plus rejected synthetic credentials, and loading an unsubmitted dedicated synthetic evaluation. The job requires the protected `STAGING_EVALUATION_TOKEN` secret; its fixture must be provisioned separately and never modified by smoke tests. Origins are fixed and guarded in the config. Browser traces, screenshots, and video are disabled, the secret is masked in workflow logs, and the backend application request logger redacts evaluation-token path segments. A hosted platform may maintain request/access logs outside this application's control; confirm its access-log retention policy before provisioning a long-lived token. The baseline job depends on successful smoke validation and evidence upload. A failed smoke leaves the prior baseline in place; restoration remains a separate operation under [issue #169](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/issues/169). See the [staging smoke implementation record](../modernization/implementation/testing/staging-smoke-tests.md) for local validation and hosted limits.

On 2026-11-13, the requester confirmed this staging workspace has no HTTP request logs. [Render documents](https://render.com/docs/logging) that Pro and higher workspaces can retain requested URLs in those logs; recheck this assumption if the workspace plan or log configuration changes.

Fixture recovery and token rotation require separate maintainer authorization; follow the [manual staging fixture procedure](../modernization/implementation/testing/staging-smoke-tests.md#manual-fixture-recovery-or-token-rotation). CD does not repair or provision the fixture.

## Evidence status

The [first main-push run with publication in CI](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/42754779210) passed `CI Gate` but skipped publication. [PR #175](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/pull/175) moved publication to the separate CD workflow. After [PR #177](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/pull/177) merged, [main CI run 43081890387](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43081890387) passed its applicable jobs, and [CD run 43082439610](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43082439610) published and deployed both immutable images. The [deployment artifact](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43082439610/artifacts/13884538355) records both deploy IDs and `live` statuses, backend health HTTP 200 with `status: OK`, and `result: success`. See the [dated implementation record](../modernization/implementation/continuous-integration.md#first-hosted-render-deployment-2026-11-11) for exact digests and verification limits.

After [PR #183](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/pull/183) merged, [CD run 43533681946](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43533681946) deployed both digests and passed all three staging smoke checks; its baseline job succeeded. The [smoke artifact](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43533681946/artifacts/14088562649) records each check as `passed` for source `dc5f32e587083fd6ff589eb417e03cf4e2687e1d`. See the [staging smoke validation record](../modernization/implementation/testing/staging-smoke-tests.md#validation-evidence-and-limits) for the hosted evidence and remaining limits.
