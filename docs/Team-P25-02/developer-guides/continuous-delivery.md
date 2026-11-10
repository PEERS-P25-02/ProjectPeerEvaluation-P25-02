# Continuous delivery to staging

The `.github/workflows/cd.yml` workflow handles staging image publication and deployment separately from verification in `.github/workflows/ci.yml`. It starts when a CI workflow run completes, but publishes only when that run succeeded, was a push to `main`, and came from this repository. Before publishing, it checks that the verified SHA is still the current `main` tip and is a two-parent merge commit. It builds the frontend and backend production images, pushes full-SHA tags to GitHub Container Registry (GHCR), and records immutable digest references and CI/CD run provenance in a `staging-images-<sha>-<run>-<attempt>` artifact. Render deploys use these digest references.

The `deploy-staging` job runs only when the publication job succeeds and the repository Actions variable `STAGING_DEPLOY_ENABLED` is exactly `true`. It deploys the backend first, then the frontend, using the Render deploy hooks with each digest reference. It polls the Render API and requires each deployment to reach `live` with the expected image reference. The deployment script rechecks the current `main` tip before each hook and after both services are live.

## Bootstrap configuration

Both existing Render services are currently Git-backed. The frontend is a Static Site, which cannot run the container image. Configure delivery in this order:

1. Run the corrected workflow on a qualifying merged commit and confirm both image digests in the workflow summary and artifact. The first publication attempt, [main-push run 42754779210](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/42754779210), had a successful CI gate but skipped publication. A successful publication run and anonymous image pulls are still unverified.
2. If GitHub creates the GHCR packages as private, set both packages to public and verify anonymous pulls by digest. Render's services need to pull the images without registry credentials.
3. Keep the existing frontend Static Site while creating a new Render Web Service for the frontend container. Migrate the existing backend Web Service from its Git source to the backend container image, retaining its Atlas and Mailtrap runtime settings and secrets in Render. Disable Git auto-deploy after the backend source migration. Configure both image-backed services with their corresponding GHCR image and required runtime settings; review Render’s overlapping-deploy policy before enabling the deploy hooks, and verify behavior before retiring the existing frontend Static Site.
4. Add the following repository Actions configuration. Keep deployment disabled until both image-backed services and IDs are ready.

| Type     | Name                          | Purpose                                                                                                            |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Variable | `STAGING_DEPLOY_ENABLED`      | Set to `true` only after the image-backed services are ready; absent or any other value keeps deployment disabled. |
| Variable | `RENDER_FRONTEND_SERVICE_ID`  | Render service ID used to poll the frontend deployment.                                                            |
| Variable | `RENDER_BACKEND_SERVICE_ID`   | Render service ID used to poll the backend deployment.                                                             |
| Secret   | `RENDER_FRONTEND_DEPLOY_HOOK` | Frontend Render deploy hook URL.                                                                                   |
| Secret   | `RENDER_BACKEND_DEPLOY_HOOK`  | Backend Render deploy hook URL.                                                                                    |
| Secret   | `RENDER_API_KEY`              | Bearer key for authenticated deployment-status polling.                                                            |

The deploy hooks accept the image reference as the `imgURL` query parameter. The script requires HTTP 200 and a response containing `deploy.id`. A hook response of HTTP 202 is treated as failure because it does not provide the expected deployment ID; inspect Render and the workflow summary before retrying. Status polling uses `RENDER_API_KEY` and the service IDs, and succeeds only when each deployment reports `live` with the exact digest reference.

Do not configure a custom domain as part of this delivery setup. The existing `peers-staging-frontend.onrender.com` hostname is not yet assured for a replacement frontend service; verify Render's assigned hostname and routing during migration. The frontend image embeds `https://peers-staging-backend.onrender.com/api` at build time, so confirm that backend hostname remains valid for the migrated service.

## Current evidence limits

The corrected `workflow_run` CD workflow has not yet completed a hosted publication run. GHCR package creation, public visibility, and anonymous digest pulls have not been verified. Both Render services remain Git-backed; no image-backed Render deployment, health check, or smoke test has been completed. The existing frontend hostname has not been confirmed for a replacement service. A successful CI run or image publication alone is not evidence that staging is deployed or working.
