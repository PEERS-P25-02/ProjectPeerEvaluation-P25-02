# Isolated Integration Test Environment (#32)

This issue establishes and verifies the environment for later integration suites.
It does not complete the application integration, email, or browser test plans.
This implementation supports FR-11/FR-12 and NFR-02/NFR-05/NFR-07 from the
[validated requirements](../requirements-validation/01-requirements-and-constraints.md).

## 1. Testing Strategy

Use Node/npm satisfying the [repository requirements](../../../README.md) and
Docker Engine/Desktop with Compose v2.24+ and Linux container support. Docker
must be running and accessible to the current user. No development stack,
local configuration file, Atlas account, or Mailtrap credentials are required.

From the repository root:

```bash
npm run test:integration
```

The first run builds two backend images using the existing lockfile: the
application image and a test-runner image that includes Vitest. Image pulls
and dependency installation require network access during the build.

The [standalone Compose file](../../../compose.test.yml) defines MongoDB 8.0,
Mailpit 1.27.4, the actual Express backend, and the Vitest runner. The service
versions match the development stack. MongoDB and Mailpit health checks gate
backend startup; the backend health check includes MongoDB connectivity.
The runner starts after backend readiness. Startup waits at most 120 seconds
after the image build; individual tests and fixture hooks have 15-second limits.

The root command generates a fresh 16-character hexadecimal run ID and random
JWT secret, supplies an empty Compose interpolation file, and strips inherited
Compose options. It never reads or writes the developer `.env`. Runtime services
use an internal project network with no published host ports or external access.
The frontend origin is `http://localhost:3000` for email composition only; no
frontend is started by this command.

Each invocation owns a unique `peers-test-<run-id>` Compose project, database
`peers_test_<run-id>`, and Mailpit inbox. MongoDB uses tmpfs at `/data/db` and
`/data/configdb`, rather than a persistent or shared development volume. Mailpit
uses its default disposable inbox with SMTP authentication, forwarding, and
relay disabled. Environment checks call the real API and SMTP service, without
mocking their persistence or delivery boundaries.

The fixture helper initializes model indexes and seeds an invented professor,
course, team, and two students. It resets known model collections between cases,
preserving indexes and run-ownership metadata. The exact MongoDB, API, and Mailpit
destinations must match the private stack. Database cleanup additionally checks
the connected host/database and a matching ownership marker. Unmarked databases
containing records, foreign markers, development targets, and Atlas URIs are
rejected. Existing sample-data/maintenance scripts are not used.

Cases that reset a database or inbox run sequentially within one stack. Independent
invocations may run concurrently because they share no ports, containers, data
volumes, or inbox. Each invocation generates its own Compose image tags.

The orchestration command retains `runner.log`, `services.log`, and `result.json`
under ignored `test-results/integration/<run-id>/`. It returns nonzero for failed
builds, readiness, tests, or cleanup. It removes run-owned containers, volumes,
network, and generated image tags in a final cleanup block, then verifies that
no containers, networks, or volumes with that project label remain. Shared base
images and Docker build cache remain available for reuse.

SIGINT/SIGTERM trigger cleanup and nonzero exits. SIGKILL, host failure, or Docker
daemon failure cannot guarantee automatic cleanup. Use the project name printed
by the command to inspect only that run. If manual cleanup is needed:

```bash
docker compose --file compose.test.yml --project-name peers-test-<run-id> down --volumes --remove-orphans --rmi local
```

Compose still requires `TEST_RUN_ID=<run-id>` and a nonempty `TEST_JWT_SECRET`
in the shell environment to parse this manual command. For cleanup, a newly
generated temporary secret is sufficient; do not retrieve or print old secrets.
Never substitute the development project's name or use global Docker pruning.

Optional Vitest arguments pass through the root command, for example:

```bash
npm run test:integration -- --testNamePattern="captures backend SMTP"
```

The backend package's `test:integration` script runs only the suite inside an
already configured test environment; it does not provision Docker. Use the root
command for the complete lifecycle. Ordinary unit tests exclude integration
files and retain their service-free behavior.

Issue #32 owns environment configuration, fixtures, guards, and verification;
#35 owns detailed email scenarios and #46 owns hosted CI execution/artifact upload.
Record defects in GitHub Issues and [Known Bugs](../known-bugs.md), with the
command and retained evidence. The cases below establish environment adequacy;
no numerical coverage threshold is introduced.

## 2. Test Cases

Cases were recorded before live environment execution. Use synthetic data only.

| ID | Purpose and steps | Expected result |
| --- | --- | --- |
| ENV-32-01 | Run the root command; wait for service health checks; request `/api/health` and ping the selected database. | Healthy services; HTTP 200; correct run database; MongoDB ping succeeds. |
| ENV-32-02 | Seed fixtures, log in through the API, create a synthetic course, and query MongoDB for its returned ID. | The API-created record exists in this run database with the expected fields and professor. |
| ENV-32-03 | Request a reset email for the fixture professor; poll Mailpit; reset fixtures/inbox. | One captured message addresses the fixture professor; inbox and fixture records are cleared. This does not verify browser password reset. |
| ENV-32-04 | Seed/reset multiple times; count records and inspect team relationships and the student uniqueness index. | One professor/course/team, two students, zero evaluations; correct team members; unique index retained. |
| ENV-32-05 | Run `npm --prefix src/backend test`; exercise unsafe configuration and ownership-marker cases. | Guards reject unintended targets before database access; missing/foreign markers are rejected; matching ownership accepted. Unit tests need no services. |
| ENV-32-06 | Run the root command twice from a clean test state. | Both runs pass with different run IDs; each summary reports verified cleanup. |
| ENV-32-07 | Start two root commands concurrently, alongside any existing development services; compare results and remaining project resources. | Both pass independently; no duplicate fixture or inbox interference; no run-owned resources remain. Development resources remain unchanged. |
| ENV-32-08 | Run `npm run test:integration -- --testTimeout=1` as a deliberate timeout failure. | Required cases fail; root command exits nonzero; evidence remains; run-owned resources are removed. |
| ENV-32-09 | Send SIGINT or SIGTERM to the root Node orchestration process while its stack is running. | Command exits 130/143 respectively, retains evidence, and verifies cleanup. |

## 3. Test Results

Verified locally on October 22, 2026 on branch
`32-create-an-isolated-integration-test-environment`, based on main reference
`origin/main` at `1914638b7f2f9ab090b35f11b491bc096d807752` plus this issue's
uncommitted implementation. Git references were not refreshed. Host versions:
Node 24.21.0, npm 11.19.0, Docker Engine 29.4.0, Compose 5.1.1. The runner and
backend images use Node 24.22.0 and npm 11.19.1.

| Cases | Actual result | Status |
| --- | --- | --- |
| ENV-32-01 through ENV-32-04 | First live execution passed all 4 environment tests; run `ce80e7bddd25ab01` exited 0 and verified cleanup. | Passed |
| ENV-32-05 | Backend suite passed 58 tests in 10 files: the existing 45 plus 13 target/ownership safeguard cases. Integration files were excluded from this service-free command. | Passed |
| ENV-32-06 | First run and subsequent independent runs each started from disposable storage, passed all 4 checks, and verified cleanup. | Passed |
| ENV-32-07 | Runs `50c0c0266ed9a712` and `722dec7aaa60e3af` were simultaneously ready; both passed all 4 checks and removed their resources. A separate disposable stack retained a synthetic record in database `peer-eval` and one captured email throughout concurrency, failure, and interrupt checks. Existing non-test container IDs/names/states and volume names were unchanged. | Passed |
| ENV-32-08 | Run `1538c7e47fe0934a`, with `--testTimeout=1`, produced expected test timeouts, exited 1, retained logs, and verified cleanup. This was an intentional failure, not a defect in the normal suite. | Passed |
| ENV-32-09 | SIGINT run `a7170cd8aa4f0562` exited 130; SIGTERM run `5109aaebd5b1a856` exited 143. Signals arrived after backend readiness; both verified cleanup. | Passed |

The live commands used `node src/backend/scripts/runIntegrationTests.js`, which
is the root npm script's entry point. Concurrent invocations ran through a
temporary lifecycle-verification harness; that harness also sent signals directly
to the orchestration process and verified the separate database/inbox sentinel.
Each run retains its own logs and summary under `test-results/integration/`;
the additional harness evidence is in `lifecycle-verification/summary.json` and
the adjacent logs. These ignored local artifacts must be attached or uploaded
with the PR when portable evidence is required; they are not committed reports.

The synthetic preservation stack was removed after verification. No real
development database records, shared Atlas data, or staging inboxes were read
or changed. Passing unit tests and static quality checks are recorded alongside
the final documented-command verification below.

| Final command | Actual result |
| --- | --- |
| `npm run test:integration` | Run `c8e5a4e900fc1d2f`: 4 tests passed; exit 0; cleanup verified. This used the documented npm entry point after the final source review. |
| `npm --prefix src/backend test` | 58 tests passed in 10 files, including the 13 safeguards; no services required. |
| `npm test` | Existing frontend suite: 62 tests passed in 8 files. |
| `npm run lint` | Passed with zero errors or warnings. |
| `npm run format:check` | Passed. |
| `git diff --check` | Passed. |

### October 23 rebase verification

Rebased the integration-environment branch onto freshly fetched `origin/main`
at `4a731b03677ae327f402de881db3d66bd21cbef5`. Restoring the branch work required
resolving `.gitignore` and backend package-script conflicts; both main's coverage
configuration and this issue's integration configuration were retained. The
environment code and test cases are unchanged from the earlier verification.

- `npm run test:all:coverage`: 63 frontend tests and 62 backend tests passed;
  both coverage commands completed without starting integration services.
- `npm run test:integration`: all 4 environment checks passed in run
  `82616eb46f5a2e68`; exit 0 and cleanup verified.
- Repository lint, formatting, and whitespace checks passed.
- `npm run build` passed with the existing >500 kB bundle warning.

The earlier results above remain historical evidence from the original baseline.
Generated coverage reports and test-run artifacts are ignored and excluded from
the branch commit.

### Remaining verification and scope limits

- Hosted CI execution/artifact retention belongs to #46 and has not been run.
- Native Windows/macOS and the minimum supported Compose version have not been
  independently tested; local evidence uses Linux containers and Compose 5.1.1.
- SIGKILL/daemon failure recovery and interruption during an image build have
  not been exercised. Automatic cleanup requires a functioning Docker daemon.
- The four environment cases do not establish complete authentication, CSV,
  evaluation, reporting, or email-content correctness. #35 retains detailed
  email assertions; known reset-page/link defects remain separately tracked.

This repository record is an issue-specific Test Document addendum. The shared
course Test Document/template was not found in the checkout; incorporate the
affected strategy, cases, and results there if maintained separately, and link
both documents in the PR.
