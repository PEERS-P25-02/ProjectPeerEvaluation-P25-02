# Continuous integration

The configured GitHub Actions workflow is `.github/workflows/ci.yml`. It runs on pushes to all branches and on pull requests targeting `main`. The build, quality, unit-test, and coverage jobs use Ubuntu and Node.js 24 with the committed package lockfiles.

The workflow has nine jobs: Frontend Build; Lint and Formatting; Unit Tests; Integration Tests; End-to-End Tests; Regression Checks; Unit Test Coverage; OWASP Dependency-Check; and Gitleaks Secret Scan. The build installs root dependencies, while quality, unit-test, and coverage jobs each install both packages, for seven `npm ci` commands per workflow run. Integration Tests and End-to-End Tests use Node.js 24 to invoke the root Docker Compose runners. They upload `test-results/integration/` and `test-results/e2e/` after their test steps run or fail; missing result files fail the upload. Regression Checks summarizes the Unit Tests, Integration Tests, and End-to-End Tests outcomes and fails unless all three succeeded; it does not rerun tests. The unit-test job runs `npm test` for frontend and backend. The coverage job runs both coverage commands, executing those suites a second time to collect metrics. Frontend and backend coverage reports are separate artifacts without percentage thresholds. Formatting and backend unit tests run after earlier step failures; backend coverage runs after frontend coverage failure.

## Reproduce CI checks locally

Run commands from the repository root. CI uses `npm ci` for lockfile-based installs; [Getting Started](../getting-started.md) describes the recommended local setup.

The two service-backed test commands require Docker and Docker Compose to be installed and Docker to be running. They use isolated generated settings and do not require cloud credentials. The first hosted PR #138 run (40735605439) failed during MongoDB startup in Integration Tests and End-to-End Tests; cleanup was verified and result artifacts uploaded. Both jobs now use Ubuntu 22.04, and the compatibility rerun is pending. Regression Checks behavior and repository required-check configuration have not been verified. The integration and E2E suites are selected regression checks, not complete coverage of the [functional regression matrix](../requirements/regression-test-matrix.md); see the [coverage gaps](../modernization/implementation/testing/regression-coverage-gaps.md).

```bash
npm ci
npm ci --prefix src/backend
npm run build
npm run lint
npm run format:check
npm test
npm --prefix src/backend test
npm run test:integration
npm run test:e2e
npm run test:coverage
npm --prefix src/backend run test:coverage
```

Inspect the GitHub Actions tab for job logs and uploaded coverage, integration, and E2E artifacts. Pull requests also display check results. The last recorded main-branch ruleset review found eight old required check names; current ruleset settings have not been rechecked. The first hosted PR #138 integration and E2E attempts failed at MongoDB startup; both uploaded artifacts after verified cleanup. Their Ubuntu 22.04 compatibility rerun is pending.

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
