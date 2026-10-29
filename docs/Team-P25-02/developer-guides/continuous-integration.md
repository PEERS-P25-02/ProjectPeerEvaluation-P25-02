# Continuous integration

The configured GitHub Actions workflow is `.github/workflows/ci.yml`. It runs on pushes to all branches and on pull requests targeting `main`. The build, quality, unit-test, and coverage jobs use Ubuntu and Node.js 24 with the committed package lockfiles.

The workflow has ten jobs, including Select Regression Tests, the existing build/quality/test jobs, Regression Checks, Unit Test Coverage, and both security scans. Select Regression Tests reads changed paths and chooses existing Vitest and Playwright files. A push to `main`, an unrecognized application or shared-infrastructure change, or invalid change data selects every regression test file. A documentation-only change selects none. Unit, integration, and E2E jobs run only when selected; the service-backed jobs still create isolated Docker Compose environments and retain result artifacts when run. Regression Checks fails if selection fails, a selected job fails, or a job result disagrees with the selection. It stays present on every workflow run.

The build, quality, coverage, and security jobs remain independent of regression selection. Unit Test Coverage still runs both full unit suites and retains separate frontend/backend reports without percentage thresholds. The build installs root dependencies; quality and coverage install both packages. The selected unit job installs only the packages it needs. This means test selection does not remove all duplicate unit execution or the fixed Docker startup cost for a selected integration or E2E file.

The source-to-test mapping is maintained in [`scripts/selectRegressionTests.cjs`](../../../scripts/selectRegressionTests.cjs). Review its mapping whenever application paths, tests, helpers, routes, or CI infrastructure change. An unknown path selects all suites. Full mode calls the ordinary suite commands so newly added tests are discovered. The selection job also runs its own policy tests. Its summary lists the decision and exact files for selected mode; a skipped test job is expected only when its selected file list is empty. The selector is a conservative execution optimization, not a claim that every [regression matrix](../requirements/regression-test-matrix.md) outcome is fully covered.

## Reproduce CI checks locally

Run commands from the repository root. CI uses `npm ci` for lockfile-based installs; [Getting Started](../getting-started.md) describes the recommended local setup.

The two service-backed test commands require Docker and Docker Compose to be installed and Docker to be running. They use isolated generated settings and do not require cloud credentials. The earlier PR #138 MongoDB startup failure is historical; the [October 28 main run](https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/actions/runs/40790520102) completed all existing jobs successfully on Ubuntu 22.04. The new selection workflow has not yet run on GitHub. Repository required-check configuration has not been rechecked. The integration and E2E suites are selected regression checks, not complete coverage of the [functional regression matrix](../requirements/regression-test-matrix.md); see the [coverage gaps](../modernization/implementation/testing/regression-coverage-gaps.md).

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
