# Continuous integration

The pull-request workflow in `.github/workflows/ci.yml` targets `main` and temporarily also targets `ci/selective-regression` for probe PRs; it checks the immutable PR head. It has no push or merge-group trigger. Build, quality, and security checks run independently of application-test selection. Node.js 24 and committed lockfiles are used for npm jobs.

Select Regression Tests records the PR base, head, merge-base, changed paths, and selection. Documentation-only changes explicitly select no application tests. Code changes run both complete unit suites once with coverage; API integration and browser E2E execution are selected conservatively. API integration runs contribute backend runtime coverage to the patch report; browser E2E runs validate journeys but do not contribute coverage. Shared infrastructure, unknown application paths, invalid/empty change data, and uncertain mappings choose full suite discovery. Full mode discovers new tests through the ordinary suite commands.

The source-to-test mapping is maintained in [`scripts/selectRegressionTests.cjs`](../../../scripts/selectRegressionTests.cjs). The selector discovers current test files for full fallback and regression-ID evidence, so a deleted or renamed historical test path cannot break full discovery. Its explicit feature mappings are starting points and need review when sources, dependencies, tests, or helpers change. Selected service-backed jobs use isolated Compose stacks with MongoDB, Mailpit, and synthetic data. API integration runs capture backend runtime coverage before cleanup; browser E2E runs do not collect coverage. Backend runtime capture uses V8, and per-source hashes protect source identity. The ordinary production build emits no source maps. One Changed-Line Coverage job combines unit coverage with any selected API runtime coverage and enforces the **80% changed-executable-line** minimum. It does not run broader API discovery or a separate final coverage stage; below-minimum reports fail. Missing, malformed, incompatible, or incomplete reports also fail.

Review the regression selection summary against the changed source paths on each PR. If a change affects a journey that was not selected, update the source-to-test mapping before relying on the gate.

`CI Gate` checks selection, build, quality, security, tests, and changed-line coverage outcomes. It accepts skipped application-test work only when the selector explicitly chose no execution. A successful workflow does not establish merge protection: the last live settings inspection found main unprotected and its ruleset disabled with legacy check names. Activating protection and merge-queue validation remains deferred.

Coverage uses the production JavaScript/JSX manifest in [`scripts/coverage/policy.json`](../../../scripts/coverage/policy.json), including unvisited files with zero hits. Unit and API integration runtime hits are combined by original source identity, with separate frontend/backend reports for lines, statements, functions, and branches. Browser E2E execution is not part of this coverage union. HTML, CSS, and assets are outside these execution metrics. The [quality-gate policy](../requirements/quality-gate-policy.md) preserves the sponsor's historical scoped coverage target separately. Overall package floors are inactive; selected PR measurements cannot establish full-suite baselines. Test selection and line hits also do not demonstrate complete [functional regression coverage](../requirements/regression-test-matrix.md).

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
npm run test:e2e
```

The frontend CI command `PEERS_COVERAGE=1 npm test` produces canonical Istanbul snapshots for the combined report. Browser E2E does not collect coverage. Ordinary `npm run test:coverage` remains a diagnostic V8 unit report and is not the canonical frontend merge input. The backend CI unit report is collected from V8 and normalized to Istanbul for the canonical combined report; its `assertCoverage` guard remains active.

Inspect Actions job summaries and artifacts for the tested SHA, workflow run ID, and each producer attempt. Upload steps expose exact artifact IDs to downstream jobs; the changed-line coverage job validates suite, SHA, run ID, and producer attempt from the selected input artifacts. A partial rerun may combine successful producers from an earlier attempt with the coverage consumer's attempt, while mismatched or missing evidence fails. Selection artifacts retain `changes.json` and `selection.json`; unit artifacts retain both package reports; service-backed artifacts retain result records, logs, cleanup status, and raw runtime captures. The changed-line coverage artifact retains normalized inputs, input provenance, combined and per-package HTML/LCOV/JSON summaries, and the patch report.

Historical hosted evidence: the [Session A run](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/41061538619) passed its earlier PR job graph at `0c5faf6`; initial coverage reported `N/A (0/0)` and separate final enforcement reused it successfully. That run predates the current single Changed-Line Coverage job and does not prove the measured 80% threshold. See the [implementation record](../modernization/implementation/continuous-integration.md) for local evidence and limitations. Full merge-queue validation, approved separate frontend/backend four-metric floors, security event handling, and activation of reviewed required-check and queue settings remain deferred. Push-to-main checks, post-merge verification, and deployment are deferred.

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
