# Continuous integration

The pull-request workflow in `.github/workflows/ci.yml` targets `main` and checks the immutable PR head. It has no push or merge-group trigger. Build, quality, and security checks run independently of application-test selection. Node.js 24 and committed lockfiles are used for npm jobs.

Select Regression Tests records the PR base, head, merge-base, changed paths, and selection. Documentation-only changes explicitly select no application tests. Code changes run both complete unit suites once with coverage; only integration and browser execution is narrowed. Shared infrastructure, unknown application paths, invalid/empty change data, and uncertain mappings choose full suite discovery. Full mode discovers new tests through the ordinary suite commands.

The source-to-test mapping is maintained in [`scripts/selectRegressionTests.cjs`](../../../scripts/selectRegressionTests.cjs). Review mappings when sources, dependencies, tests, or helpers change. Selected service-backed jobs use isolated Compose stacks with MongoDB, Mailpit, and synthetic data. They capture coverage from the API and browser application processes before cleanup. Frontend unit and browser tests share original-source Istanbul instrumentation; the test-only browser build exports snapshots, while backend runtime capture uses V8. Per-source hashes protect source identity. The ordinary production build emits no source maps. A valid selected report below the **80% changed-executable-line** minimum triggers full integration and browser discovery; full mode already runs those suites. The final coverage check enforces the minimum. Missing, malformed, incompatible, or incomplete reports fail rather than triggering an ordinary low-coverage fallback.

`CI Gate` checks selection, build, quality, security, tests, and coverage outcomes. It accepts skipped work only when explicitly unselected or unnecessary under the coverage decision. A successful workflow does not establish merge protection: the last live settings inspection found main unprotected and its ruleset disabled with legacy check names. Activating protection and merge-queue validation belongs to session 2.

Coverage uses the production JavaScript/JSX manifest in [`scripts/coverage/policy.json`](../../../scripts/coverage/policy.json), including unvisited files with zero hits. Unit and runtime hits are combined by original source identity, with separate frontend/backend reports for lines, statements, functions, and branches. HTML, CSS, and assets are outside these execution metrics. The [quality-gate policy](../requirements/quality-gate-policy.md) preserves the sponsor's historical scoped coverage target separately. Overall package floors are inactive; selected PR measurements cannot establish full-suite baselines. Test selection and line hits also do not demonstrate complete [functional regression coverage](../requirements/regression-test-matrix.md).

## Reproduce CI checks locally

Run commands from the repository root. CI uses `npm ci` for lockfile-based installs; [Getting Started](../getting-started.md) describes the recommended local setup.

The service-backed commands require Docker and Docker Compose already running. They use isolated generated settings and require no cloud credentials. Set `PEERS_COVERAGE=1` to retain runtime coverage. These commands remain independently runnable:

```bash
npm ci
npm ci --prefix src/backend
npm run build
npm run lint
npm run format:check
PEERS_COVERAGE=1 npm test
npm --prefix src/backend run test:coverage
PEERS_COVERAGE=1 npm run test:integration
PEERS_COVERAGE=1 npm run test:e2e
```

The frontend CI command `PEERS_COVERAGE=1 npm test` produces canonical Istanbul snapshots for merging with browser execution. Ordinary `npm run test:coverage` remains a diagnostic V8 unit report and is not the canonical frontend merge input. The backend CI coverage command retains its `assertCoverage` guard.

Inspect Actions job summaries and artifacts for the tested SHA, run ID, and attempt. Selection artifacts retain `changes.json` and `selection.json`; unit artifacts retain both package reports; service-backed artifacts retain result records, logs, cleanup status, and raw runtime captures. Initial/final coverage artifacts retain normalized inputs, the merge plan, source manifest/provenance, combined and per-package HTML/LCOV/JSON summaries, and the patch report. Artifact identity includes the head SHA, run ID, and attempt to avoid mixing runs.

A local unit/integration/browser combined-report proof succeeded, with this PR explicitly reporting no changed executable production lines as not applicable. The canonical frontend/backend union passed compatibility validation with no mismatches; the hosted session-1 workflow remains pending; older selection probes do not validate this coverage implementation. See the [implementation record](../modernization/implementation/continuous-integration.md) for actual evidence and limitations. Session 2 must run complete merge-group suites, approve separate frontend/backend four-metric floors from full measurements, adapt security checks, and activate reviewed required-check and queue settings. Push-to-main checks, post-merge verification, and deployment are deferred to Milestone 3.

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
