# PEERS: Peer End to End Review System

PEERS is a React application with an Express API for course and team management, student peer evaluations, email invitations and reminders, and evaluation reports.

This README describes the current repository setup. The [historical README](README-historical.md) preserves the earlier project plan, milestones, team information, and proposed features.

## Requirements

- Node.js satisfying `^22.22.2 || ^24.15.0 || >=26.0.0` and npm 9 or newer. Node 24 LTS is recommended for development. Both packages enforce these requirements with `engine-strict=true`.
- Git to clone the repository, or download its ZIP.
- Docker with Compose v2.24 or newer for the local four-service stack.
- No Atlas or Mailtrap account is required for local development.

Use a Node version manager such as nvm. In WSL, install and run Linux Node/npm inside WSL; for native Windows, use nvm-windows. Verify your installation:

```bash
node --version
npm --version
```

## Local setup

Clone the repository and install dependencies from its root:

```bash
git clone https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02.git
cd ProjectPeerEvaluation-P25-02
npm run setup
```

The setup command installs frontend and backend dependencies, then prepares
the root `.env` for local development. It preserves configured values,
adds missing settings, and generates a JWT secret when missing or set to
a recognized placeholder.

Run `npm run setup:env` to prepare local environment configuration without reinstalling dependencies. The settings below are a reference.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Native-local default: `mongodb://localhost:27017/peer-eval`. MongoDB must be running separately. |
| `JWT_SECRET` | Generated automatically by setup and reused on later runs. |
| `PORT` | Backend port; defaults to `5000`. |
| `FRONTEND_URL` | Local default: `http://localhost:3000` for email links. |
| `SMTP_HOST`, `SMTP_PORT` | Native-local Mailpit: `localhost`, `1025`. |
| `SMTP_SECURE` | `true` for implicit TLS; port `465` also enables it. |
| `SMTP_AUTH_REQUIRED` | Setup uses `false` for local Mailpit. |
| `SMTP_USER`, `SMTP_PASS` | Empty in the generated local Mailpit configuration. |
| `SMTP_FROM` | Sender address displayed on email; local example: `peers-test@example.com`. |

Local `.env` and `.env.*` files are ignored; `.env.example` remains tracked.
After dependencies are installed, run `npm run setup:env` to prepare
configuration again without reinstalling dependencies.
Do not commit credentials or real student data.

### Docker Compose

After `npm run setup`, start the local stack:

```bash
npm run docker:up
npm run docker:ps
npm run docker:logs
npm run docker:down
```

`docker:up` prepares the root `.env`, builds the images, and waits for healthy
services. Open the frontend at http://localhost:3000 and Mailpit at
http://localhost:8025. The backend API is available through the frontend's
`/api` proxy and directly at http://localhost:5000/api.

The backend runs in production mode. Compose overrides native-local database
and SMTP addresses with service names, and rejects a missing or empty
`JWT_SECRET` before starting containers. Email is captured in Mailpit.
Render staging uses separately configured Mailtrap settings.

`docker:down` retains the named MongoDB volume. Stop native servers or separate
MongoDB/Mailpit containers before startup if they occupy the published ports.
Source edits require rebuilding; rerun `npm run docker:up`.

For CI, supply an ephemeral `JWT_SECRET` through the job environment and run
`docker compose -p peers-ci up --build --wait --wait-timeout 120` directly.
The root `.env` is optional for this invocation. Use an isolated runner because
host ports are fixed, and always clean up that job's resources with
`docker compose -p peers-ci down --volumes`, including after failure.

### Manual local Mailpit setup

For native npm execution without Compose, start Mailpit separately:

```bash
docker run -d --name peers-mailpit-test \
  -p 127.0.0.1:1025:1025 \
  -p 127.0.0.1:8025:8025 \
  axllent/mailpit:v1.27.4
```

For an existing container, use `docker start peers-mailpit-test`.
The backend submits email on SMTP port `1025`; inspect captured messages
at http://localhost:8025. Keep forwarding and relay disabled.
MongoDB must also be running at the configured URI.

### Frontend container

Build and run the production frontend image from the repository root:

```bash
docker build -t peers-frontend .
docker run --rm --name peers-frontend -p 127.0.0.1:3000:80 peers-frontend
```

Open **http://localhost:3000**. The image serves the compiled frontend through
Nginx and supports client-side routes. Standalone builds default to the deployed
backend URL. Compose supplies `VITE_API_BASE_URL=/api` at build time and mounts
`nginx/compose.conf` to proxy API requests to the backend service. See the [frontend container guide](docs/Team-P25-02/containerization-assessment/03-frontend-dockerfile-validation.md)
for the verification checklist and limitations.

Start both servers:

```bash
npm run dev
```

Open the frontend at **http://localhost:3000**. The backend defaults to **http://localhost:5000**, with API routes under `/api`. Check **http://localhost:5000/api/health** for backend readiness: it returns HTTP 200 when MongoDB is connected and 503 otherwise. It does not verify SMTP connectivity.

MongoDB must already be reachable; the startup command does not start it. Restart the backend after changing backend code or environment settings. The Windows `start.bat` and `start.ps1` scripts run setup before starting both servers.

## Commands

Run these from the repository root:

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

Production builds, including local previews, default to the deployed backend unless `VITE_API_BASE_URL` is supplied at build time. Compose sets it to `/api` for local API access through Nginx. Native development can continue using the Vite server at `localhost:3000`.

The one-shot test commands return a nonzero exit code when a test fails.

The initial unit tests are documented in the
[Unit Testing Implementation](docs/Team-P25-02/testing/01-unit-testing-implementation.md#initial-unit-test-cases).

The backend test scope, limitations, and results are documented in the
[Backend Unit Testing Implementation](docs/Team-P25-02/testing/02-backend-unit-testing-implementation.md).

Broader integration, regression, and end-to-end coverage remains planned.

### Testing

Run the package-specific command when working on one package:

```powershell
# Frontend, from the repository root
npm test

# Backend, from the repository root
npm --prefix src/backend test
```

Use the combined command as a local convenience check when you want to verify
both packages. CI should run the package-specific commands separately so
frontend and backend failures are reported independently:

```powershell
npm run test:all
```

To inspect code coverage locally, run:

```powershell
npm run test:all:coverage
```

Vitest prints a text summary and writes HTML reports to `coverage/` and
`src/backend/coverage/`. CI uploads these reports as workflow artifacts.
Coverage is currently informational; no minimum threshold is enforced.

Frontend tests belong in `src/frontend/tests/` and use `.test.jsx` or `.spec.jsx`
filenames. Use React Testing Library for rendered component behavior and import
test functions and mocks from Vitest. The frontend Vitest setup is loaded
automatically from `src/frontend/test/setup.js`.

Backend tests belong in `src/backend/tests/` and use `.test.js` or `.spec.js`
filenames. Keep unit tests isolated from MongoDB, SMTP, and live application
startup unless the test is specifically an integration test.

### Isolated integration test environment

With Docker running, run this from the repository root:

```bash
npm run test:integration
```

The standalone `compose.test.yml` starts the backend, disposable MongoDB,
Mailpit, and a Vitest runner. It generates a separate project, database, and
temporary JWT secret for each invocation; it does not load your development
`.env` or publish host ports. No Atlas or Mailtrap account is required.

The initial checks verify readiness, API/database communication, SMTP capture,
and repeatable fixture reset. The command removes its containers, storage,
network, and generated image tags after success, failure, or a handled interrupt.
Logs and an exit/cleanup summary remain in the ignored
`test-results/integration/<run-id>/` directory.

See the [environment verification guide](docs/Team-P25-02/testing/04-integration-test-environment.md)
for prerequisites, safeguards, verification cases, and limitations. Ordinary
unit-test commands remain independent of Docker.

### Linting and formatting

Run from the repository root. These commands cover frontend, backend, tests,
and tooling JavaScript/JSX:

```bash
npm run lint          # Check code with ESLint
npm run format:check  # Check Prettier formatting
npm run format        # Apply Prettier formatting
```

See the [ESLint migration notes](docs/Team-P25-02/eslint-migration.md) for
configuration details and limitations.

## Project structure

- `index.html` and `src/index.jsx`: frontend entry points.
- `src/frontend/`: React pages, authentication context, API services, and styles.
- `src/backend/`: Express server, routes, controllers, Mongoose models, middleware, utilities, and maintenance scripts.
- `public/`: static hosting assets.
- `docs/Team-P25-02/`: architecture, requirements, and development reports.
- `vite.config.mjs`: frontend server and build configuration.
- `build/`: generated frontend output, ignored by Git.

The frontend uses React and Vite; the backend uses Express, Mongoose/MongoDB, JWT authentication, and Nodemailer/SMTP.

## Troubleshooting

- Missing dependencies: run `npm run setup` from the repository root.
- Unsupported runtime: check Node/npm versions against the requirements above.
- Port conflicts: Vite uses port 3000 with strict port checking; the backend defaults to 5000. Changing ports also requires checking frontend API URLs and backend CORS configuration.
- Database errors: check `MONGODB_URI`, database availability, and backend logs.
- Email failures: check SMTP configuration and test delivery with controlled recipients.

## Documentation and contributing

See the [Team P25-02 documentation index](docs/Team-P25-02/README.md) and the [Vite migration notes](docs/Team-P25-02/CRA-to-Vite%20migration.md). The historical README records earlier plans; proposed features there do not establish current implementation.

Use feature branches, link relevant issues in pull requests, describe behavior changes, and report validation. Check applicable `AGENTS.md` instructions before editing.

## Continuous Integration (CI)

The project uses GitHub Actions to validate dependency installation
for both the frontend and backend.

### Workflow

Workflow file: `.github/workflows/ci.yml`

The workflow runs automatically when:

- A pull request targeting `main` is opened or updated.
- Changes are pushed to any branch, including feature branches and `main`.

The workflow uses Ubuntu and Node.js 24 to:

1. Check out the repository.
2. Configure Node.js and npm dependency caching.
3. Install frontend dependencies using `npm ci`.
4. Install backend dependencies using `npm ci`.

Both installations use the committed package lockfiles.
If either installation fails, the workflow reports a failed job.

### Running Installation Checks Locally

From the repository root:

```bash
npm ci
cd src/backend
npm ci
```

Use Node.js 24 locally to match CI, with npm 9 or newer.

### Viewing CI Results

1. Open the repository on GitHub.
2. Select the Actions tab.
3. Open the "CI - Dependency Installation" workflow.
4. Select a workflow run to review its status.
5. Open the "Install Frontend and Backend" job to inspect logs.

Pull requests also display workflow check results. Branch-push runs provide early feedback, while the PR check should be configured as a required status check for merging into `main` by a repository administrator.

### Troubleshooting

If an installation fails:

- Review the failed step in the GitHub Actions logs.
- Verify that both package-lock.json files are committed.
- Confirm that package.json and package-lock.json are consistent.
- Reproduce the issue locally with npm ci.
- Confirm that the Node.js/npm versions meet project requirements.

Issue #45 extends the CI workflow with independent frontend build, repository-wide ESLint (frontend, backend, tests and tooling), Prettier formatting, frontend Vitest, and backend Vitest jobs. Each job uses Node.js 24, locked dependencies, and fails when its command exits nonzero. To reproduce:

```bash
npm ci
npm run build
npm run lint
npm run format:check
npm test
npm --prefix src/backend ci
npm --prefix src/backend test
```

The lint and formatting commands use Issue #85's ESLint 9 flat configuration and Prettier setup. These checks do not replace integration, regression or E2E tests. Repository administrators must configure desired PR job names as required status checks.

See [Issue #45 CI verification](docs/Team-P25-02/testing/02-ci-build-lint-unit-verification.md) for planned cases and recorded evidence.
