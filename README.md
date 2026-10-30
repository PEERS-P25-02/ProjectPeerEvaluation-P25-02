# PEERS: Peer End to End Review System

PEERS is a React application with an Express API for course and team management, student peer evaluations, email invitations and reminders, and evaluation reports. The project uses MongoDB for application data.

## Prerequisites

- Git
- Node.js `^22.22.2 || ^24.15.0 || >=26.0.0` and npm 9 or newer (Node.js 24 LTS recommended)
- Docker Engine and Docker Compose v2.24 or newer for the automated local setup

Both npm packages enforce the Node.js and npm requirements. See [Getting Started](docs/Team-P25-02/getting-started.md) for the recommended setup, or the [developer guides](docs/Team-P25-02/developer-guides/local-development.md) for manual setup and command references.

The [quality gate policy](docs/Team-P25-02/requirements/quality-gate-policy.md) defines the agreed verification scope and pass/fail rules.

## Project map

- `index.html` and `src/index.jsx`: frontend entry points.
- `src/frontend/`: React pages, components, authentication, API services, and styles.
- `src/backend/`: Express server, routes, controllers, Mongoose models, middleware, utilities, and maintenance scripts.
- `public/`: static hosting assets.
- `vite.config.mjs`: frontend server, build, and test configuration.
- `build/`: generated frontend output, ignored by Git.
- `docs/Team-P25-02/`: requirements, project reports, implementation records, and guides.

## Guides and project documents

- [Getting Started](docs/Team-P25-02/getting-started.md)
- [Local development and command reference](docs/Team-P25-02/developer-guides/local-development.md)
- [Testing](docs/Team-P25-02/developer-guides/testing.md)
- [Continuous integration](docs/Team-P25-02/developer-guides/continuous-integration.md)
- [Team P25-02 documentation index](docs/Team-P25-02/README.md)
- [Vite migration notes](docs/Team-P25-02/modernization/implementation/tooling/vite-migration.md)
- [Historical README](README-historical.md), which preserves earlier plans and proposed features
