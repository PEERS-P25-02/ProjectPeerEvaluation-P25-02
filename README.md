# PEERS: Peer End to End Review System

PEERS is a React application with an Express API for course and team management, student peer evaluations, email invitations and reminders, and evaluation reports. The project uses MongoDB for application data.

## Prerequisites

- Git
- Node.js `^22.22.2 || ^24.15.0 || >=26.0.0` and npm 9 or newer (Node.js 24 LTS recommended)
- Docker Engine and Docker Compose v2.24 or newer for the automated local setup

Both npm packages enforce the Node.js and npm requirements. See [Getting Started](docs/getting-started.md) for the recommended setup, or the [development guide](docs/development.md) for manual setup and command references.

The [quality gate policy](docs/requirements/quality-gates.md) defines the agreed verification scope and pass/fail rules.

## Project map

- `index.html` and `src/index.jsx`: frontend entry points.
- `src/frontend/`: React pages, components, authentication, API services, and styles.
- `src/backend/`: Express server, routes, controllers, Mongoose models, middleware, utilities, and maintenance scripts.
- `public/`: static hosting assets.
- `vite.config.mjs`: frontend server, build, and test configuration.
- `build/`: generated frontend output, ignored by Git.
- `docs/`: current setup and development guides, requirements, architecture, and the historical archive.

## Guides and project documents

- [Documentation index](docs/README.md)
- [Getting Started](docs/getting-started.md)
- [Development](docs/development.md)
- [Testing](docs/testing.md)
- [CI/CD](docs/ci-cd.md)
- [Staging operations](docs/staging-operations.md)
- [Architecture](docs/architecture.md)
- [Requirements](docs/requirements/requirements.md)
- [Requirements traceability](docs/requirements/traceability.md)
- [Historical documents and records](docs/archive/README.md)
