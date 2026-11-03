# Continuous integration

The CI workflow in `.github/workflows/ci.yml` runs for pull requests targeting `main` and merge-queue candidates targeting `main`. Each run checks the immutable event head against its recorded base. It has no `push` trigger: CI after a direct push or merge to `main` is deferred to Milestone 3. Build, quality, and security checks run independently of application-test selection; policy tests run when code tests are selected or selection fails. Node.js 24 and committed lockfiles are used for npm jobs.

Select Regression Tests records the event base, head, merge-base, changed paths, and selection. Documentation-only changes in either event explicitly select no application tests. For these candidates, unit, API integration, browser E2E, CI policy-test, and coverage jobs skip; build, lint/format, both security scans, selection, and `CI Gate` still run. Code PRs run both complete unit suites once with coverage and select API integration/browser E2E conservatively. Selected API integration contributes backend runtime coverage to changed-line coverage; browser E2E validates journeys but contributes no coverage. Shared infrastructure, unknown application paths, invalid/empty change data, and uncertain mappings choose full suite discovery. Merge-group code candidates require full unit, API integration, and browser E2E discovery, including tests added or renamed by queued changes.

The source-to-test mapping is maintained in [`scripts/selectRegressionTests.cjs`](../../../scripts/selectRegressionTests.cjs). The selector discovers current test files for full fallback and regression-ID evidence, so a deleted or renamed historical test path cannot break full discovery. Its explicit feature mappings are starting points and need review when sources, dependencies, tests, or helpers change. Selected service-backed jobs use isolated Compose stacks with MongoDB, Mailpit, and synthetic data. API integration runs capture backend runtime coverage before cleanup; browser E2E runs do not collect coverage. Backend runtime capture uses V8, and per-source hashes protect source identity. The ordinary production build emits no source maps.

For code PRs, Changed-Line Coverage combines canonical frontend/backend unit reports with selected API runtime coverage and enforces at least **80% changed executable line coverage**; browser coverage is excluded. For merge-group code candidates, Overall Line Coverage combines full unit and API coverage and enforces a **70% line coverage floor separately for frontend and backend**. It runs only after the full merge-group suites succeed. `CI Gate` is the stable final check and evaluates selection, build, quality, security, tests, and the applicable coverage result. It accepts skips when expected for the event or explicitly selected by the selector. Workflow configuration does not itself enable repository rulesets or merge-queue settings; consult current repository settings before claiming that the check is enforced for merges.

Coverage uses the production JavaScript/JSX manifest in [`scripts/coverage/policy.json`](../../../scripts/coverage/policy.json), including unvisited files with zero hits. Unit and API integration runtime hits are combined by original source identity, with separate frontend/backend reports for lines, statements, functions, and branches. Browser E2E execution is not part of this coverage union. HTML, CSS, and assets are outside these execution metrics. The [quality-gate policy](../requirements/quality-gate-policy.md) preserves the sponsor's historical scoped coverage target separately. Merge-group full-suite results enforce the 70% overall line floor per package; selected PR measurements do not establish those full-suite baselines. Test selection and line hits also do not demonstrate complete [functional regression coverage](../requirements/regression-test-matrix.md).

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

Inspect Actions job summaries and artifacts for the tested SHA, workflow run ID, and each producer attempt. Upload steps expose exact artifact IDs to downstream jobs; coverage jobs validate suite, SHA, run ID, and producer attempt for their inputs. A partial rerun may combine successful producers from an earlier attempt with the coverage consumer's attempt, while mismatched or missing evidence fails. Selection artifacts retain `changes.json` and `selection.json`; unit and service-backed artifacts are uploaded when those suites run. The PR changed-line artifact retains normalized inputs, provenance, combined and per-package HTML/LCOV/JSON summaries, and the patch report. Successful merge-group code candidates produce a separate overall-line artifact. Docs-only candidates still retain selection evidence and the OWASP Dependency-Check report; they do not produce unit, service-test, or coverage artifacts.

The [implementation record](../modernization/implementation/continuous-integration.md) distinguishes hosted evidence for earlier revisions from the current workflow. Do not treat earlier PR probes as proof of the current queue checks or coverage floors. Push-to-main checks, post-merge verification, and deployment are deferred to Milestone 3.

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
