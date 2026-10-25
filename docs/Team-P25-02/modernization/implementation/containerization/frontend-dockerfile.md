# Frontend Dockerfile Validation

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
