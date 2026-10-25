# Local development

Use [Getting Started](../getting-started.md) for the recommended automated setup. This guide covers manual/native development, custom local services and environment settings, the standalone frontend image, troubleshooting, and every root npm command.

## Prerequisites and package setup

- Node.js `^22.22.2 || ^24.15.0 || >=26.0.0` and npm 9 or newer; Node.js 24 LTS is recommended.
- Docker Engine and Docker Compose v2.24 or newer when running local services in containers.
- A MongoDB service reachable from the backend.

Both packages enforce Node.js and npm versions. Use a Node version manager such as nvm. In WSL, install and run Linux Node/npm inside WSL; for native Windows, use nvm-windows. Check versions with `node --version` and `npm --version`.

The recommended wrapper, `npm run setup`, installs both packages and prepares root `.env`; see [Getting Started](../getting-started.md). To install each package manually from the repository root and prepare configuration, run:

```bash
npm install
npm --prefix src/backend install
npm run setup:env
```

To prepare only the environment after installation, run `npm run setup:env`. Edit the root `.env` to customize local values, then restart the backend after changing backend code or environment settings. `start.bat` and `start.ps1` run `npm run setup` before starting both servers.

The setup script reads the root `.env.example`; there is no backend-local `.env.example`. It preserves existing settings, adds missing settings, and creates a 32-byte random JWT secret if the saved secret is absent, blank, or a recognized development placeholder. It checks both the command environment and saved `APP_ENV`/`NODE_ENV` before writing, and refuses values explicitly marked for another environment. A newly created `.env` requests owner-only read/write permissions. `.env` and `.env.*` are ignored by Git; `.env.example` remains tracked. Do not commit credentials or real student data.

## Native services and application

Native npm startup does not start MongoDB or Mailpit. Start MongoDB separately and ensure `MONGODB_URI` points to it. For local email capture, create a Mailpit container if one does not already exist:

```bash
docker run -d --name peers-mailpit-test \
  -p 127.0.0.1:1025:1025 \
  -p 127.0.0.1:8025:8025 \
  axllent/mailpit:v1.27.4
```

If `peers-mailpit-test` already exists, use `docker start peers-mailpit-test` instead. Configure `SMTP_HOST=localhost` and `SMTP_PORT=1025`. Mailpit's web inbox is at <http://localhost:8025>; keep forwarding and relay disabled. Stop the container with `docker stop peers-mailpit-test` when finished.

Start the frontend and backend together:

```bash
npm run dev
```

Vite serves the frontend at <http://localhost:3000> and proxies `/api` to the backend at `localhost:5000`. The backend API is at <http://localhost:5000/api>; its health endpoint at <http://localhost:5000/api/health> reports MongoDB readiness, not SMTP readiness. Restart the backend after changing backend code or environment settings. Alternatively, start one process at a time with `npm run start:frontend` (or `npm start`) and `npm run start:backend`.

## Compose service commands

For the local Compose stack, `npm run docker:up` runs `npm run setup:env`, builds images, starts the services, and waits for health checks. It uses Compose service names for MongoDB and SMTP and always directs email to local Mailpit, even if other SMTP settings exist in `.env`. Compose rejects a missing or empty JWT secret. The root `.env` supplies local configuration; setup prepares it.

- `npm run docker:ps` shows service status and health.
- `npm run docker:logs` follows service logs.
- `npm run docker:down` removes the stack's containers and network but retains MongoDB's named volume.
- Run `npm run docker:up` again after source edits to rebuild images.

Local Compose uses production-mode backend and frontend builds. Published ports are localhost-only: MongoDB 27017, frontend 3000, backend 5000, SMTP 1025, and Mailpit web UI 8025. Stop other services on these ports before starting the stack.

## Standalone frontend image

Build and run the production frontend image from the repository root:

```bash
docker build -t peers-frontend .
docker run --rm --name peers-frontend -p 127.0.0.1:3000:80 peers-frontend
```

Open <http://localhost:3000>. Nginx serves the compiled frontend and supports client-side routes. A standalone production build defaults to the deployed backend unless `VITE_API_BASE_URL` is supplied at build time. Compose builds with `VITE_API_BASE_URL=/api` and mounts `nginx/compose.conf` to proxy API calls to the backend service. The frontend image's Nginx default configuration does not add that Compose API proxy. See the [frontend container assessment](../modernization/implementation/containerization/frontend-dockerfile.md) for its validation scope and limitations.

## Environment configuration reference

The root `.env.example` documents the local defaults. `npm run setup:env` preserves saved settings and adds only missing values, except that it replaces missing or recognized placeholder JWT secrets. The backend loads the root `.env` file. Important values:

| Variable | Behavior |
| --- | --- |
| `MONGODB_URI` | Preferred backend database URI; local default is `mongodb://localhost:27017/peer-eval`. MongoDB must be running separately for native use. |
| `MONGO_URI` | Legacy database URI fallback when `MONGODB_URI` is absent; prefer `MONGODB_URI`. |
| `JWT_SECRET` | JWT signing secret; generated by local setup when missing or a recognized placeholder. Compose requires a nonempty value. |
| `PORT` | Backend port; defaults to `5000`. |
| `FRONTEND_URL` | Frontend origin used for email links; local default is `http://localhost:3000`. |
| `SMTP_HOST`, `SMTP_PORT` | SMTP server address and port; native local Mailpit uses `localhost` and `1025`. Compose overrides these with its Mailpit service. |
| `SMTP_SECURE` | `true` enables implicit TLS; the exact port value `465` also enables it automatically. The local example is `false`. |
| `SMTP_AUTH_REQUIRED` | Defaults to `true` in backend code; local setup uses `false` for Mailpit. Staging should use appropriate authenticated settings. |
| `SMTP_USER`, `SMTP_PASS` | SMTP credentials; both must be set together when authentication is used. Local Mailpit leaves both empty. |
| `SMTP_FROM` | Sender address displayed in generated email; local example is `peers-test@example.com`. |
| `SMTP_SERVICE` | Optional Nodemailer provider preset; when set, it overrides `SMTP_HOST` and `SMTP_PORT`. Leave unset for Mailpit. |

The project documents distinguish local/CI Mailpit capture from a separate Mailtrap Email Testing sandbox for staging. The Compose stack overrides SMTP to Mailpit. Deployment environment values are configured separately; this guide does not verify deployed settings. See the [environment configuration record](../modernization/plans/development-environment/02-configuration-and-testing-plan.md) for project documentation about those environments.

Local `.env` files are ignored by Git; `.env.example` is tracked. Keep secrets out of source control and use controlled recipients when configuring a non-local SMTP service.

## Troubleshooting

- Unsupported runtime: check Node.js/npm versions against the prerequisites; both packages enable `engine-strict`.
- Missing packages: run `npm run setup` from the repository root.
- Port conflicts: Vite requires port 3000; Compose publishes its services on localhost ports listed above. When changing ports, check the Vite API proxy and backend CORS configuration.
- Database errors: check `MONGODB_URI`, confirm MongoDB is running, and inspect backend logs.
- Email failures: check SMTP host, port, authentication, and Mailpit inbox. The health endpoint does not verify SMTP.
- Frontend API calls from a production build: confirm `VITE_API_BASE_URL` was supplied at build time; Compose uses `/api` with its Nginx proxy.

## Root npm command reference

Run these commands from the repository root.

| Command | Behavior |
| --- | --- |
| `npm run setup` | Install both packages and prepare local backend configuration. |
| `npm run setup:env` | Prepare local backend configuration without reinstalling dependencies. |
| `npm run docker:up` | Prepare configuration, build, and start the Compose stack; wait for healthy services. |
| `npm run docker:down` | Stop and remove the stack containers/network; retain MongoDB data. |
| `npm run docker:logs` | Follow Compose service logs. |
| `npm run docker:ps` | Show Compose service status and health. |
| `npm run dev` | Start both servers. |
| `npm run start:frontend` / `npm start` | Start Vite on port 3000. |
| `npm run start:backend` | Start Express from `src/backend`. |
| `npm run build` | Build the frontend into `build/`. |
| `npm run preview` | Preview the frontend production build locally. |
| `npm run lint` | Check JavaScript and JSX with ESLint. |
| `npm run format:check` | Check Prettier formatting without changing files. |
| `npm run format` | Apply Prettier formatting. |
| `npm test` | Run the frontend Vitest suite once and exit. |
| `npm run test:watch` | Run the frontend Vitest suite in watch mode for local development. |
| `npm --prefix src/backend test` | Run the backend Vitest suite once and exit. |
| `npm --prefix src/backend run test:watch` | Run the backend Vitest suite in watch mode for local development. |
| `npm run test:all` | Run the frontend and backend Vitest suites together once and exit; convenient for local validation. |
| `npm run test:coverage` | Run frontend tests and generate V8 coverage reports under `coverage/`. |
| `npm --prefix src/backend run test:coverage` | Run backend tests and generate V8 coverage reports under `src/backend/coverage/`. |
| `npm run test:all:coverage` | Run frontend and backend coverage commands sequentially; no minimum threshold is enforced. |

For test selection, coverage behavior, isolated integration checks, and implementation-record links, see [Testing](testing.md).
