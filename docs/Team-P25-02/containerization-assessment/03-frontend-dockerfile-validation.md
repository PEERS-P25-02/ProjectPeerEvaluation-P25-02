# Frontend Dockerfile Validation

## Issue

GitHub Issue [#24](https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/issues/24) — Create and validate the frontend Dockerfile.

## Image design

The root `Dockerfile` has two stages:

1. A Node 24.22.0 build stage uses `npm ci` with the committed root lockfile and runs `npm run build`.
2. An explicitly versioned Nginx image serves only the generated `build/` output on port 80.

The `.dockerignore` file keeps local dependencies, generated output, backend source, Git metadata, and environment files out of the frontend build context. No runtime secret or local configuration is copied into the image.

Nginx falls back to `index.html` for client-side routes, while returning `404` for unknown static assets. This lets a direct browser visit to a React Router route load the application.

## Build and run

Run these commands from the repository root:

```bash
docker build -t peers-frontend .
docker run --rm --name peers-frontend -p 127.0.0.1:3000:80 peers-frontend
```

Open <http://localhost:3000>. Stop an attached container with `Ctrl+C`; for a detached run, use `docker stop peers-frontend`.

For a clean image build, first ensure no host `node_modules` or `build/` directory is required. The build stage installs all dependencies afresh with `npm ci`, and `.dockerignore` prevents both directories from entering the build context.

## API behavior and limitation

The production frontend currently selects `https://peer-evaluation-backend.onrender.com/api` in the shared API client and authentication pages. Therefore, this standalone frontend image serves the browser application but does **not** automatically target a locally running backend. The Vite development-server proxy is also not present in the production Nginx image.

This is intentional for this issue because the existing production-build behavior targets the deployed backend. The integrated local frontend-to-backend routing change belongs with Docker Compose issue [#26](https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/issues/26), where the team should choose and implement a browser-reachable local API address without embedding Compose-only hostnames into browser code.

## Verification checklist

- Build the image from a fresh checkout with `docker build -t peers-frontend .`.
- Start it with the documented port mapping and load <http://localhost:3000>.
- Refresh a client-side route to confirm the SPA fallback works.
- In browser developer tools, confirm that API calls use the documented deployed API destination.
- Record the Docker version, commands, and results in the pull request.

Docker was not available in the implementation environment when this document was added, so the image build and browser smoke test still need to be run on a machine with Docker before closing the issue.
