# Continuous delivery: staging images and deployment

The [CD workflow](../../../.github/workflows/cd.yml) runs after a successful `main` push [CI workflow](../../../.github/workflows/ci.yml). Publication accepts only this repository's current two-parent `main` merge commit. Pull requests, merge groups, direct pushes, stale runs, and unsuccessful CI runs do not publish or deploy images.

The publication job builds the repository-root frontend Dockerfile and `src/backend/Dockerfile` for `linux/amd64`. It embeds the public `https://peers-staging-backend.onrender.com/api` address in the frontend image; Atlas and Mailtrap values remain Render runtime settings. Each image has a full source-SHA GHCR tag. The job records both immutable digest references, source SHA, and CI/CD run identities in its summary and downloadable `staging-images-<sha>-<run>-<attempt>` artifact. Deployment consumes these exact digest outputs, not a moving `latest` tag.

## Render configuration

The maintainer reports that both staging services now run the published images. Configure `RENDER_API_KEY` as a GitHub Actions secret and `BACKEND_SERVICE_ID` and `FRONTEND_SERVICE_ID` as Actions variables that identify only the image-backed staging services. Each service's configured image repository must match its corresponding published GHCR image. Confirm the services cannot independently deploy an unverified Git commit and review Render's overlapping-deploy policy before enabling this workflow on `main`. Keep credentials, Atlas and Mailtrap values, and real student data out of Actions logs and artifacts.

The API key must be able to trigger and retrieve deploys for both services. The workflow does not create or change Render services, registry credentials, or service settings. If a variable is missing or points to the wrong service, correct the Actions setting before retrying; do not put service IDs or the API key in workflow source.

## Deployment sequence and evidence

After both digests are published, the dependent job rechecks the current `main` tip and asks the [Render Trigger Deploy API](https://api-docs.render.com/reference/create-deploy) to deploy the backend digest through its `imageUrl` field. It requires a started deploy with an ID, then polls [Retrieve Deploy](https://api-docs.render.com/reference/retrieve-deploy) for `live` and the exact image reference. Only then does it require `https://peers-staging-backend.onrender.com/api/health` to return HTTP 200 and `status: OK`, which also requires MongoDB connectivity. It rechecks `main` before requesting the frontend digest and waits for that deploy to become `live` with the matching image reference.

CD runs are serialized. A failed request, terminal deploy failure, digest mismatch, stale source, or timeout fails the job. HTTP 202 is recorded as a failure because a queued deploy may not provide a usable ID; inspect Render because that queued deploy might still run. If `main` advances after the backend deploy, the second stale-source check can stop before frontend, leaving a temporary mixed pair until a later run completes. This workflow does not roll back automatically.

The job summary and `staging-deployment-<sha>-<run>-<attempt>` artifact retain the source SHA, digest references, service and deploy IDs, observed statuses, backend health result, failure phase, and reason. They do not contain the API key or raw Render responses. A passing job establishes the two reported Render deploy results and backend health; frontend reachability and critical-workflow smoke testing remain [issue #168](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/issues/168), and rollback remains [issue #169](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/issues/169).

## Evidence status

The [first main-push run with publication in CI](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/42754779210) passed `CI Gate` but skipped publication. [PR #175](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/pull/175) moved publication to the separate CD workflow. The maintainer reports that hosted image publication and image-backed Render services now work; this deployment job has not yet had a hosted run. Treat actual deploy results and health as unverified until its qualifying post-merge run completes.
