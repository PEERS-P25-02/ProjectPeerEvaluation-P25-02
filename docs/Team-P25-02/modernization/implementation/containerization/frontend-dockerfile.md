# Frontend Dockerfile Validation

## Image design

The root `Dockerfile` has two stages:

1. A Node 24.22.0 build stage uses `npm ci` with the committed root lockfile and runs `npm run build`.
2. An explicitly versioned Nginx image serves only the generated `build/` output on port 80.

The root `.dockerignore` uses a production allowlist. Its build context includes the root package manifests and `.npmrc`, `vite.config.mjs`, `index.html`, `src/index.jsx`, `src/frontend/`, `public/`, `nginx/default.conf`, and the Vite coverage helper and policy under `scripts/`. It excludes frontend tests, generated output, local dependencies, environment files, backend source, docs, Git data, worktrees, and unrelated scripts. Add new production build inputs intentionally; the source directories are included as units with tests and generated output removed.

`Dockerfile.e2e` has its own `Dockerfile.e2e.dockerignore`, which replaces the root rules for that build. It includes the root package manifests and `.npmrc`, `playwright.config.cjs`, and `tests/e2e/`, allowing the runner to install its locked dependencies and run the checked-in E2E suite.

Build context describes files available to Docker during a build. It does not describe the final image: the frontend serving stage contains the compiled `build/` site and Nginx configuration, while the Node build stage and its source are not copied into that final stage. No runtime secret or local configuration is copied into the image.

The [standalone Nginx configuration](../../../../../nginx/default.conf) falls back to `index.html` for unmatched paths, while returning `404` for missing files with CSS, JS, MJS, MAP, SVG, WOFF, or WOFF2 extensions. Other missing asset paths use the HTML fallback. This lets a direct browser visit to a React Router route load the application.

## Build and run

Run these commands from the repository root:

```bash
docker build -t peers-frontend .
docker run --rm --name peers-frontend -p 127.0.0.1:3000:80 peers-frontend
```

Open <http://localhost:3000>. Stop an attached container with `Ctrl+C`; for a detached run, use `docker stop peers-frontend`.

For a clean image build, first ensure no host `node_modules` or `build/` directory is required. The build stage installs all dependencies afresh with `npm ci`, and `.dockerignore` prevents both directories from entering the build context.

## API behavior and limitation

Standalone production builds default to `https://peer-evaluation-backend.onrender.com/api` in the shared API client and authentication pages. Set the public `VITE_API_BASE_URL` build argument to select another API destination; runtime frontend environment variables do not change compiled assets.

Docker Compose sets `VITE_API_BASE_URL=/api` and mounts `nginx/compose.conf`. The browser calls its frontend origin, and Nginx forwards `/api/` requests to `backend:5000` without changing the API path. Evaluation test links use the current frontend origin in this configuration. The standalone Nginx configuration and Vite development proxy remain available for their respective startup modes.

## Verification checklist

- Build the image from a fresh checkout with `docker build -t peers-frontend .`.
- Start it with the documented port mapping and load <http://localhost:3000>.
- Refresh a client-side route to confirm the SPA fallback works.
- In browser developer tools, confirm that API calls use the documented deployed API destination.
- Record the Docker version, commands, and results in the pull request.

## Recorded verification

Validated on October 16, 2026 with Docker Desktop client and server version
29.8.2.

- The production image built successfully.
- The container started Nginx successfully.
- A browser loaded the login page at `http://127.0.0.1:3000/`.
- Requests to `/` and `/course-management` both returned HTTP 200, and the
  client-route response matched `index.html`, confirming the SPA fallback.

The image is about 77 MB. The smoke-test container was stopped and removed after verification; the local image was retained.
