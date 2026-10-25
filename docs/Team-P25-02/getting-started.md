# Getting Started

This is the recommended way to run PEERS locally. It uses the setup script to install dependencies and prepare local settings, then Docker Compose to start the frontend, API, MongoDB, and Mailpit together.

## Prerequisites

- Git
- Node.js `^22.22.2 || ^24.15.0 || >=26.0.0` and npm 9 or newer (Node.js 24 LTS recommended)
- Docker Engine and Docker Compose v2.24 or newer
- Docker running before starting Compose

The root and backend packages enforce the supported Node.js and npm versions. Confirm the tools are available:

```bash
node --version
npm --version
docker --version
docker compose version
```

## Install and start

Clone the repository, install dependencies, and start the local stack:

```bash
git clone https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02.git
cd ProjectPeerEvaluation-P25-02
npm run setup
npm run docker:up
```

`npm run setup` installs frontend and backend dependencies, then prepares the root `.env` from `.env.example`. Setup preserves configured values, adds missing settings, and creates a random JWT secret if one is missing, blank, or a recognized development placeholder. Local `.env` files are ignored by Git. See [Local development](developer-guides/local-development.md) for manual configuration and setup safeguards.

Compose starts MongoDB, the backend, the frontend, and Mailpit. Mailpit captures locally generated email, so the local setup does not need MongoDB Atlas or an external mail account. Local email is not sent to real recipients.

## Open the application

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:5000/api>
- Backend readiness: <http://localhost:5000/api/health>
- Mailpit inbox: <http://localhost:8025>

The readiness endpoint returns HTTP 200 when MongoDB is connected and 503 otherwise. It does not check SMTP connectivity.

## Manage the stack

From the repository root:

```bash
npm run docker:ps
npm run docker:logs
npm run docker:down
```

Stopping Compose removes its containers and network but retains the named MongoDB data volume. Re-run `npm run docker:up` to rebuild after source edits. Compose binds its published ports to localhost; stop other services using ports 27017, 3000, 5000, 1025, or 8025 before startup.

For native npm development, separately managed services, custom environment settings, and the full command reference, see [Local development](developer-guides/local-development.md).
