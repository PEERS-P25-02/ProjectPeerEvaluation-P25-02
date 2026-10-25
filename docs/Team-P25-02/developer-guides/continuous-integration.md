# Continuous integration

The configured GitHub Actions workflow is `.github/workflows/ci.yml`. It runs on pushes and on pull requests targeting `main`. Jobs use Ubuntu and Node.js 24 with the committed package lockfiles.

The workflow has five jobs: Frontend Build; Lint and Formatting; Unit Tests and Coverage; OWASP Dependency-Check; and Gitleaks Secret Scan. The build installs root dependencies, while the quality and test jobs each install both packages, for five `npm ci` commands per workflow run, down from ten. Coverage commands run the unit tests themselves, so each package suite runs once. Frontend and backend coverage reports are uploaded as separate artifacts without percentage thresholds. Formatting still runs after lint failure, backend coverage still runs after frontend test failure, and artifact uploads are attempted after test failures unless the workflow is cancelled. The workflow does not run the Docker integration suite.

## Reproduce CI checks locally

Run commands from the repository root. CI uses `npm ci` for lockfile-based installs; [Getting Started](../getting-started.md) describes the recommended local setup.

```bash
npm ci
npm ci --prefix src/backend
npm run build
npm run lint
npm run format:check
npm run test:coverage
npm --prefix src/backend run test:coverage
```

Inspect the GitHub Actions tab for job logs and uploaded coverage artifacts. Pull requests also display check results. The active main-branch ruleset currently requires eight old check names; administrators must migrate it to **Frontend Build**, **Lint and Formatting**, and **Unit Tests and Coverage** before this workflow is merged. Security checks remain planned for later activation as required checks.

## Optional Compose stack check in CI

This optional recipe can run the local Compose stack in an isolated CI runner. It is not part of the configured GitHub Actions workflow. Compose publishes fixed localhost ports, so do not run it alongside another stack using those ports. Supply an ephemeral JWT secret through the job environment; the development `.env` is not required when the job supplies `JWT_SECRET`.

```bash
docker compose -p peers-ci up --build --wait --wait-timeout 120
docker compose -p peers-ci down --volumes
```

Run the startup command in the stack-start step. Put the cleanup command in a separate GitHub Actions cleanup step configured with `if: always()` so it also runs after startup failure. It removes the project's containers, network, and MongoDB volume. Use a dedicated runner because Compose publishes ports 27017, 3000, 5000, 1025, and 8025 on the host.

## Dependency updates

Dependabot checks the root and backend npm packages weekly. It groups minor and patch updates by production and development dependencies and limits the number of open update pull requests for each package directory. Review dependency changes and workflow results before merging.

## Troubleshooting dependency installation

If `npm ci` fails in the workflow or locally:

- Inspect the failing GitHub Actions step or local command output.
- Confirm both root and backend `package-lock.json` files are present and committed.
- Check that each `package.json` matches its lockfile.
- Reproduce with `npm ci` in the affected package directory.
- Check Node.js and npm versions against the project requirements; CI uses Node.js 24.
