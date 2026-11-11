# Continuous delivery: staging images

The [CD workflow](../../../.github/workflows/cd.yml) publishes frontend and backend images after a successful `main` push [CI workflow](../../../.github/workflows/ci.yml) completes. It accepts only a run from this repository for the current two-parent `main` merge commit. Pull requests, merge groups, direct pushes, stale runs, and unsuccessful CI runs do not publish images.

The job builds the repository-root frontend Dockerfile and `src/backend/Dockerfile` for `linux/amd64`. It embeds the public `https://peers-staging-backend.onrender.com/api` address in the frontend image; Atlas and Mailtrap values remain runtime settings in Render. Each image has a full source-SHA GHCR tag. The job records both immutable digest references, source SHA, and CI/CD run identities in its summary and downloadable `staging-images-<sha>-<run>-<attempt>` artifact. Render deployment should use these digests, never a moving `latest` tag.

## Render setup after publication

Both Render services are still Git-backed. Keep them as they are until a qualifying hosted CD run publishes both images, the GHCR packages are set to public, and anonymous pulls by digest succeed. Render checks image access and starts a deploy when an image-backed service is created or its source changes.

The frontend is currently a Static Site; its Nginx image requires a new Web Service. The backend Web Service can switch its source to the backend image while retaining its Atlas and Mailtrap runtime settings. The requested `peers-staging-frontend.onrender.com` hostname is not yet confirmed for the new frontend service; do not assume it will transfer, and do not add a custom domain. Confirm the final frontend URL before updating the backend `FRONTEND_URL` setting.

Render deploy hooks and post-deployment checks are **not configured in this PR**. Add them after image publication and service setup under [deployment issue #167](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/issues/167) and [validation issue #168](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/issues/168). A hook response only confirms a request was accepted; later validation must establish the deployed revision and health.

## Evidence status

The [first main-push run with publication in CI](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/42754779210) passed `CI Gate` but skipped its publication job. The separate CD workflow has not yet had a hosted publication run. GHCR package visibility, anonymous pulls, Render image deployment, and staging health remain unverified.
