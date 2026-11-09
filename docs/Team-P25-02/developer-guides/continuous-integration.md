# Continuous integration

The CI workflow in `.github/workflows/ci.yml` runs for pull requests targeting `main` and merge-group candidates targeting `main`. Each run checks the immutable event head against its recorded base. It has no `push` trigger: CI after a direct push or merge to `main` is deferred to Milestone 3. Both complete unit suites, the full API integration suite, build, lint/format, CI policy tests, and security checks run for every candidate, regardless of changed paths. Full browser E2E runs on merge-group candidates and is event-inapplicable on pull requests. Node.js 24 and committed lockfiles are used for npm jobs.

For pull requests, `scripts/regressionChanges.cjs` supplies changed-path and merge-base evidence to patch-coverage calculation. It does not select or skip test suites. Every PR and merge-group candidate runs both complete unit suites with coverage and the complete API integration suite, including documentation-only changes. Full browser E2E runs for every merge-group candidate; PR browser E2E is event-inapplicable. Full test commands discover the current suites, and no file-to-test map or path classification reduces them.

The full test commands discover current test files, so deleted or renamed historical test paths do not prevent suite execution. Service-backed jobs use isolated Compose stacks with MongoDB, Mailpit, and synthetic data. API integration runs capture backend runtime coverage before cleanup; browser E2E runs do not collect coverage. Backend runtime capture uses V8, and per-source hashes protect source identity. The ordinary production build emits no source maps.

For every PR candidate, Changed-Line Coverage combines canonical frontend/backend unit reports with full API runtime coverage and enforces at least **80% changed executable line coverage**; browser coverage is excluded. A change with no executable lines is recorded as not applicable, while missing or malformed evidence fails. For every merge-group candidate, Overall Line Coverage combines full unit and API coverage and enforces a **70% line coverage floor separately for frontend and backend**. It runs after the unit and API integration suites succeed and may run alongside browser E2E. `CI Gate` is the stable final check and evaluates build, quality, security, all required tests, and the applicable coverage result. Only event-inapplicable jobs may skip. Workflow configuration does not itself enable repository rulesets or merge-queue settings; consult current repository settings before claiming that the check is enforced for merges.

Coverage uses the production JavaScript/JSX manifest in [`scripts/coverage/policy.json`](../../../scripts/coverage/policy.json), including unvisited files with zero hits. Unit and API integration runtime hits are combined by original source identity, with separate frontend/backend reports for lines, statements, functions, and branches. Browser E2E execution is not part of this coverage union. HTML, CSS, and assets are outside these execution metrics. The [quality-gate policy](../requirements/quality-gate-policy.md) preserves the sponsor's historical scoped coverage target separately. Merge-group full-suite results enforce the 70% overall line floor per package. Test execution and line hits do not demonstrate complete [functional regression coverage](../requirements/regression-test-matrix.md).

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

Inspect Actions job summaries and artifacts for the tested SHA, workflow run ID, and each producer attempt. Upload steps expose exact artifact IDs to downstream jobs; coverage jobs validate suite, SHA, run ID, and producer attempt for their inputs. A partial rerun may combine successful producers from an earlier attempt with the coverage consumer's attempt, while mismatched or missing evidence fails. Unit and service-backed artifacts are uploaded for every candidate. The PR changed-line artifact retains normalized inputs, provenance, combined and per-package HTML/LCOV/JSON summaries, and the patch report. Merge-group candidates produce a separate overall-line artifact. Documentation-only candidates retain the same required suite and coverage evidence as other changes.

The [implementation record](../modernization/implementation/continuous-integration.md#full-premerge-suite-revision-2026-11-09) links the successful hosted PR and merge-group runs for the merged full-suite workflow and distinguishes earlier revisions. The PR changed-line result was N/A because no executable lines changed; controlled coverage failures and revised documentation-only candidates remain unverified. Push-to-main checks, post-merge verification, and deployment are deferred to Milestone 3.

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
