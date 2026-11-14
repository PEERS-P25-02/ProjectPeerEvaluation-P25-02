# Backend Dockerfile Validation

## Goal

The goal of this work is to run the PEERS backend inside Docker and confirm that it can connect to MongoDB and Mailpit without storing secrets inside the Docker image.

## Backend Image

The backend Docker image is built from:

`src/backend/Dockerfile`

The backend context's `.dockerignore` allowlists `package.json`, `package-lock.json`, `.npmrc`, `index.js`, and the runtime directories `config/`, `controllers/`, `middleware/`, `models/`, `routes/`, and `utils/`. It also preserves `scripts/runtimeCoverage.cjs`, which is loaded by the opt-in coverage Compose overlay. Tests, test configuration, debug and data-generation scripts, migrations, uploads, local environment files, coverage output, and local dependencies are excluded. Each runtime source directory is included as a unit with test and generated files filtered out. New runtime directories require an intentional allowlist update.

`Dockerfile.test` uses `Dockerfile.test.dockerignore`, replacing the production rules so its context retains the package files, application source directories, complete `tests/` tree, and `vitest.integration.config.mjs` used by `npm run test:integration`. It excludes local dependencies, environment files, coverage output, uploads, Git metadata, migrations, and unrelated scripts such as debug and data-generation tools.

Build context means files available to Docker while building. It is separate from the final production image, which is assembled by this Dockerfile from production dependencies and copied backend source. A successful build alone does not inventory either the context or final image; record those inspections separately when validating a change.

Build command:

```bash
docker build -t peers-backend ./src/backend
```

**Verification status:** This appendix contains no standalone build or runtime results. Backend image startup, MongoDB connectivity, and captured email are covered by the recorded [Compose verification](../development-environment.md#compose-verification).
