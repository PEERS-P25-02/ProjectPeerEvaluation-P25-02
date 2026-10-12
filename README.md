# PEERS: Peer End to End Review System

PEERS is a React application with an Express API for course and team management, student peer evaluations, email invitations and reminders, and evaluation reports.

This README describes the current repository setup. The [historical README](README-historical.md) preserves the earlier project plan, milestones, team information, and proposed features.

## Requirements

- Node.js satisfying `^20.19.0 || >=22.12.0` and npm 9 or newer. Both packages enforce these requirements with `engine-strict=true`.
- Git to clone the repository, or download its ZIP.
- Docker for local MongoDB and Mailpit containers.
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

The setup command currently installs frontend and backend dependencies.
Automatic .env creation and random JWT_SECRET generation are planned separately
and are not implemented yet.

Configure `src/backend/.env` using `src/backend/.env.example` as a reference. Preserve any existing configuration. Set these values for your development environment:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Native-local default: `mongodb://localhost:27017/peer-eval`. MongoDB must be running separately. |
| `JWT_SECRET` | Replace `REPLACE_WITH_RANDOM_SECRET` with a unique random signing secret. |
| `PORT` | Backend port; defaults to `5000`. |
| `FRONTEND_URL` | Use `http://localhost:3000` for local email links. |
| `SMTP_HOST`, `SMTP_PORT` | Native-local Mailpit: `localhost`, `1025`. |
| `SMTP_SECURE` | `true` for implicit TLS; port `465` also enables it. |
| `SMTP_AUTH_REQUIRED` | Defaults to `true`; explicitly set `false` for local/CI Mailpit. |
| `SMTP_USER`, `SMTP_PASS` | Leave both empty for default Mailpit; supply both for authenticated SMTP. |
| `SMTP_FROM` | Sender address displayed on email; local example: `peers-test@example.com`. |

Local `.env` and `.env.*` files are ignored; `.env.example` remains tracked.
Copy the example only if `src/backend/.env` is absent. If it exists,
merge the settings manually and preserve configured values.
Do not commit credentials or real student data.

### Manual local Mailpit setup

Until the Compose stack is implemented, start Mailpit separately:

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

Start both servers:

```bash
npm run dev
```

Open the frontend at **http://localhost:3000**. The backend defaults to **http://localhost:5000**, with API routes under `/api`. Check **http://localhost:5000/api/health** for a running API process; this endpoint does not verify MongoDB or SMTP connectivity.

MongoDB must already be reachable; the startup command does not start it. Restart the backend after changing backend code or environment settings. The Windows `start.bat` and `start.ps1` scripts run setup before starting both servers.

## Commands

Run these from the repository root:

| Command | Behavior |
| --- | --- |
| `npm run setup` | Install frontend and backend dependencies. |
| `npm run dev` | Start both servers. |
| `npm run start:frontend` / `npm start` | Start Vite on port 3000. |
| `npm run start:backend` | Start Express from `src/backend`. |
| `npm run build` | Build the frontend into `build/`. |
| `npm run preview` | Preview the frontend production build locally. |

Production builds, including local previews, use the configured deployed backend. Use the development server at `localhost:3000` for local API testing. The shared API service also selects the deployed backend on hosts other than `localhost`.

No automated test command is currently configured in either package. Verify relevant browser/API workflows against development data, and run `npm run build` for frontend changes. Testing infrastructure is planned separately.

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
