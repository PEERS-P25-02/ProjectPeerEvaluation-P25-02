# Isolated Integration Test Environment

This record describes the isolated Docker environment used by the API/database integration suites. It does not establish complete application integration, email delivery, or browser end-to-end coverage.
This implementation supports FR-11/FR-12 and NFR-02/NFR-05/NFR-07 from the
[validated requirements](../../../requirements/validation/01-requirements-and-constraints.md).

## 1. Testing Strategy

Use Node/npm satisfying the [repository requirements](../../../../../README.md) and
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

The [standalone Compose file](../../../../../compose.test.yml) defines MongoDB 8.0,
Mailpit 1.27.4, the actual Express backend, and the Vitest runner. The service
versions match the development stack. MongoDB runs with `--replSet peers-rs`;
its health check initializes the single-node set when necessary and requires
`db.hello().isWritablePrimary` before reporting healthy. Submission transactions
require a replica set or sharded deployment. The development and browser-test
Compose stacks use the same replica-set readiness check. MongoDB and Mailpit
health checks gate backend startup; the backend health check includes MongoDB connectivity.
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

This record covers environment configuration, fixtures, destination guards, and lifecycle verification. Detailed email assertions and hosted CI execution/artifact upload are separate verification concerns. Record observed defects and suspected issues in [Known Bugs](../../../known-bugs.md). The cases below establish environment adequacy;
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

## 3. Recorded Results

The environment checks were recorded on October 22, 2026 using Linux containers,
Node 24.21.0, npm 11.19.0, Docker Engine 29.4.0, and Compose 5.1.1. The test
images used Node 24.22.0 and npm 11.19.1. These dated results describe lifecycle
checks from that snapshot.

| Cases | Recorded actual result | Status |
| --- | --- | --- |
| ENV-32-01 through ENV-32-04 | All four environment tests passed; the API and SMTP checks used real services in the disposable stack, and cleanup was verified. | Passed |
| ENV-32-05 | Backend suite passed 58 tests in 10 files, including 13 target and ownership safeguard cases. Integration files were excluded from this service-free command. | Passed |
| ENV-32-06 | Independent runs used disposable storage, passed all four checks, and verified cleanup. | Passed |
| ENV-32-07 | Two simultaneous isolated runs passed all four checks and removed their resources. A separate synthetic database/inbox sentinel remained unchanged during concurrency, failure, and interrupt checks. | Passed |
| ENV-32-08 | A deliberately short timeout produced expected test timeouts, a nonzero exit, retained logs, and verified cleanup. This was an intentional failure case. | Passed |
| ENV-32-09 | SIGINT exited 130 and SIGTERM exited 143 after backend readiness; both retained evidence and verified cleanup. | Passed |

Additional recorded documented-command checks passed: root integration command,
backend unit suite (58 tests), frontend suite (62 tests), repository lint,
formatting, and whitespace checks. A later October 23 snapshot after environment
changes recorded 63 frontend and 62 backend tests passing, four environment
checks passing, lint/format/whitespace checks passing, and a successful frontend
build with an existing bundle-size warning. These are historical results; they
do not establish a current hosted CI result or a fresh test run after subsequent
changes. Replica-set stack execution is separately recorded in
[submission integrity](api-database-integration.md#5-submission-integrity);
the October 22/23 environment results above remain historical.

### Remaining verification and scope limits

- Hosted CI execution and artifact retention are not demonstrated by these local results.
- Native Windows/macOS and the minimum supported Compose version have not been
  independently tested; local evidence uses Linux containers and Compose 5.1.1.
- SIGKILL/daemon failure recovery and interruption during an image build have
  not been exercised. Automatic cleanup requires a functioning Docker daemon.
- The four environment cases do not establish complete authentication, CSV,
  evaluation, reporting, or email-content correctness. The later invitation
  suite checks message content/link shape and deterministic SMTP rejection and
  retry; it does not establish browser navigation or external delivery. Account
  recovery remains separately tested, with known recovery defects still open.

This is a repository Test Document record. The separate shared SWE4724
Test Document/template was not present in the reviewed checkout, so this record
does not claim that the course submission document was updated.
