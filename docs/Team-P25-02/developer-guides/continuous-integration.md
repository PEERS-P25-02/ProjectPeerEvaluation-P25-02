# Continuous integration

The CI workflow in `.github/workflows/ci.yml` runs for pushes to `main`, pull requests targeting `main`, and merge-group candidates targeting `main`. Each run checks the immutable event head; a push run checks the exact SHA recorded as the push's `after` commit. Every event runs both complete unit suites, the full API integration suite, build, lint/format, CI policy tests, and security checks, regardless of changed paths. Full browser E2E and Overall Line Coverage run on merge-group candidates and pushes; they are event-inapplicable on pull requests. Changed-Line Coverage runs only on pull requests, where it enforces at least **80% changed executable line coverage**. Overall Line Coverage enforces at least **70% line coverage separately for frontend and backend** on merge-group candidates and pushes. On a `main` push, a successful `CI Gate` unlocks the staging image-publication job. Node.js 24 and committed lockfiles are used for npm jobs.

For pull requests, `scripts/regressionChanges.cjs` supplies changed-path and merge-base evidence to patch-coverage calculation. It does not select or skip test suites. Every PR, merge-group candidate, and main push runs both complete unit suites with coverage and the complete API integration suite, including documentation-only changes. Full browser E2E runs for merge-group candidates and pushes; PR browser E2E is event-inapplicable. Full test commands discover the current suites, and no file-to-test map or path classification reduces them.

The full test commands discover current test files, so deleted or renamed historical test paths do not prevent suite execution. Service-backed jobs use isolated Compose stacks with MongoDB, Mailpit, and synthetic data. API integration runs capture backend runtime coverage before cleanup; browser E2E runs do not collect coverage. Backend runtime capture uses V8, and per-source hashes protect source identity. The ordinary production build emits no source maps.

For every PR candidate, Changed-Line Coverage combines canonical frontend/backend unit reports with full API runtime coverage and enforces at least **80% changed executable line coverage**; browser coverage is excluded. A change with no executable lines is recorded as not applicable, while missing or malformed evidence fails. Changed-Line Coverage is skipped for merge-group candidates and pushes. For each merge-group candidate and push, Overall Line Coverage combines full unit and API coverage and enforces a **70% line coverage floor separately for frontend and backend**. It runs after the unit and API integration suites succeed and may run alongside browser E2E. `CI Gate` is the stable final check and evaluates build, quality, security, all required tests, and the applicable coverage result. Only event-inapplicable jobs may skip. Workflow configuration does not itself enable repository rulesets or merge-queue settings; consult current repository settings before claiming that the check is enforced for merges.

Coverage uses the production JavaScript/JSX manifest in [`scripts/coverage/policy.json`](../../../scripts/coverage/policy.json), including unvisited files with zero hits. Unit and API integration runtime hits are combined by original source identity, with separate frontend/backend reports for lines, statements, functions, and branches. Browser E2E execution is not part of this coverage union. HTML, CSS, and assets are outside these execution metrics. The [quality-gate policy](../requirements/quality-gate-policy.md) preserves the sponsor's historical scoped coverage target separately. Merge-group and main-push full-suite results enforce the 70% overall line floor per package. Test execution and line hits do not demonstrate complete [functional regression coverage](../requirements/regression-test-matrix.md).

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

Inspect Actions job summaries and artifacts for the tested SHA, workflow run ID, and each producer attempt. Upload steps expose exact artifact IDs to downstream jobs; coverage jobs validate suite, SHA, run ID, and producer attempt for their inputs. A partial rerun may combine successful producers from an earlier attempt with the coverage consumer's attempt, while mismatched or missing evidence fails. Unit and service-backed artifacts are uploaded for every candidate. The PR changed-line artifact retains normalized inputs, provenance, combined and per-package HTML/LCOV/JSON summaries, and the patch report. Merge-group candidates and pushes produce a separate overall-line artifact. Documentation-only candidates retain the same required suite and coverage evidence as other changes.

The Unit Tests with Coverage job summary shows two generic Vitest result blocks: frontend first, then backend. Integration Tests and E2E Tests do not currently publish file or test counts in their job summaries. Open each job's test step log for its final counts, or download its retained results artifact for `runner.log` and `result.json`; the latter records run and cleanup status, not test counts.

The [implementation record](../modernization/implementation/continuous-integration.md#full-premerge-suite-revision-2026-11-09) links successful hosted PR and merge-group runs for the merged full-suite workflow and distinguishes earlier revisions. The PR changed-line result was N/A because no executable lines changed; controlled coverage failures and revised documentation-only candidates remain unverified. A later [main-push run](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/42725558352) passed all applicable jobs and `CI Gate` for landed SHA `9d1d627e8aaf39e07e08c4a626eb9c076228ec45`. That run predates the image-publication job; hosted image publication remains pending.

## Staging image publication

After `CI Gate` succeeds on a `main` push, `Publish Staging Images` checks out the same landed SHA and builds two `linux/amd64` production images. The frontend uses the repository-root `Dockerfile` with `VITE_API_BASE_URL=https://peers-staging-backend.onrender.com/api` embedded at build time. The backend uses `src/backend/Dockerfile` with `src/backend` as its build context. Neither build takes Atlas, Mailtrap, or other runtime secrets as arguments. Pull requests and merge groups never publish images; an unsuccessful gate or image build stops publication.

The job uses its scoped `GITHUB_TOKEN` with `packages: write` and publishes full-SHA tags to `ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-frontend` and `ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-backend`. The tag identifies the source commit; the job outputs and a downloadable `staging-images-<sha>-<run>-<attempt>` artifact record the immutable digest references, run, and attempt. Use the digest references for Render deployment and rollback; do not use a moving `latest` tag. The job also writes the references to its run summary. A failed or missing digest prevents a successful publication handoff.

GitHub may create new packages as private. A package administrator must set both packages to **public** and verify anonymous digest pulls before configuring the image-backed Render services. The frontend needs a new Render Web Service because its current Static Site cannot run the Nginx image; the backend Web Service can switch its source to the published image. Render source migration, deploy hooks, and deployed health/smoke checks are later work. The first hosted publication and Render pull are pending until the workflow is merged and runs on `main`.

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
