<a id="04-planned-configuration-and-services"></a>

# Environment Configuration and Supporting Services

> Historical context: the verification observations in section 5.8 describe limited configuration and manual email checks from the original assessment. They do not verify the later integrated Compose stack or current CI workflow. See the [development-environment implementation record](../../implementation/development-environment.md) for those separate results.

[Back to validation overview](../../../inherited-application/development-environment/README.md)

Local development and CI use MongoDB and Mailpit containers.
The staging design uses MongoDB Atlas and a separate Mailtrap Email Testing sandbox; provisioning and hosted validation remain separate work.

### 5.2 Environment Configuration and Secret Management

The native-local backend loads the repository-root `.env` independently of
the working directory. Run `npm run setup:env` from the root to prepare it
from the root `.env.example`; existing configured values are preserved.

Local `.env` and `.env.*` files are ignored at every directory level.
Examples remain tracked and must contain no real credentials.

| Variable | Local value and behavior |
| --- | --- |
| MONGODB_URI | `mongodb://localhost:27017/peer-eval?directConnection=true`; a replica set must be running. The option supports the supplied Compose member advertised as `mongodb:27017`. |
| MONGO_URI | Legacy fallback; prefer MONGODB_URI. |
| JWT_SECRET | Required configuration policy: replace the template placeholder with a random secret. The inherited code still has a hardcoded fallback. |
| PORT | Backend defaults to `5000`. |
| FRONTEND_URL | `http://localhost:3000`; used for email links. |
| SMTP_HOST | `localhost` for a native-local backend. |
| SMTP_PORT | `1025` for Mailpit. |
| SMTP_SECURE | `false` for default Mailpit; controls immediate TLS, not authentication. Other servers may use STARTTLS with false. |
| SMTP_AUTH_REQUIRED | Defaults to `true`. Set `false` explicitly for default local/CI Mailpit. |
| SMTP_USER / SMTP_PASS | Leave both empty for default Mailpit. Supply both when authentication is required. |
| SMTP_FROM | `peers-test@example.com`; displayed sender, separate from SMTP login. |
| SMTP_SERVICE | Optional provider preset overriding host/port; leave unset for Mailpit and explicit staging settings. |

The utility omits authentication when credentials are absent and the
explicit opt-out is enabled. Supplied credential pairs are still used
when authentication is optional. Missing required credentials, partial
pairs, or invalid authentication flags stop startup with an error.
Authenticated configuration also requires host/port or a service preset.

The template does not create services. Restart the backend after changes.
Setup automation creates missing local configuration, generates
a cryptographically random JWT_SECRET, fills a missing/placeholder secret,
and preserves configured values without printing secrets.

### 5.3 Compose Configuration Contract

The implemented four-service stack contains frontend, backend, mongodb, and mailpit.
See the [development-environment implementation record](../../implementation/development-environment.md) for configuration and recorded validation.

| Backend location | MongoDB URI | SMTP destination |
| --- | --- | --- |
| Developer computer | `mongodb://localhost:27017/peer-eval?directConnection=true` | `localhost:1025` |
| Shared Compose network | `mongodb://mongodb:27017/peer-eval` | `mailpit:1025` |

Inside a backend container, localhost refers to that container.
The Compose backend imports the optional root `.env` through `env_file`
and overrides the MongoDB/SMTP addresses through `environment`.
Environment entries take precedence over env_file.
The Compose interpolation .env file alone does not inject backend settings.

Preserve PORT=5000 for the backend port mapping.
Keep FRONTEND_URL browser-reachable; it should not use the frontend's
internal service hostname. Publish development ports on localhost,
use a named MongoDB development volume, and leave Mailpit relay disabled.

### 5.4 CI Configuration Contract

CI jobs and service-backed integration assertions are implemented; see the
[CI record](../../implementation/continuous-integration.md) and
[email integration record](../../implementation/testing/email-integration.md).
Unit suites run without MongoDB, SMTP, or application startup. Local one-shot
commands remain `npm test` and `npm --prefix src/backend test`.

Integration test jobs must provision isolated MongoDB and Mailpit services,
wait for readiness, seed synthetic data, and clean up even after failure.
Do not use Atlas or Mailtrap credentials for these jobs.

For integration jobs, supply configuration explicitly through the job environment or Compose.
Use the address appropriate to where the backend runs, a disposable
test database, an ephemeral random JWT_SECRET, SMTP_SECURE=false,
SMTP_AUTH_REQUIRED=false, and empty SMTP credentials.
Leave SMTP_SERVICE unset and forwarding/relay disabled.

Inspect messages through Mailpit's API to assert recipients, content,
and links. Isolate service resources, storage, inboxes, and ports between
concurrent jobs; cleanup must not affect developer or staging data.

### 5.5 Staging Configuration

Configure the deployed backend through protected hosting settings.
Use a separate Atlas MONGODB_URI, a staging JWT_SECRET, FRONTEND_URL,
SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_AUTH_REQUIRED=true,
SMTP_USER, SMTP_PASS, and SMTP_FROM from the staging sandbox configuration.
Use the port/TLS mode specified by the provider; authentication and TLS
are separate settings. PORT follows the hosting platform's configuration.

Render settings configure the running backend. Protected GitHub environment
secrets supply only credentials needed by deployment/validation jobs;
job variables do not automatically configure a deployed application.
Do not commit staging credential values. Staging provisioning is separate work.

<a id="05-testing-and-validation-criteria"></a>

# Planned Testing Support and Validation Criteria

[Back to validation overview](../../../inherited-application/development-environment/README.md)

### 5.6 Automated Testing Support

Frontend/backend unit suites, isolated integration support, and GitHub Actions
execution are implemented; see [Unit Testing Implementation](../../implementation/testing/unit-testing.md),
[Integration Testing](../../implementation/testing/integration-testing.md), and
[Continuous Integration](../../implementation/continuous-integration.md) for evidence and limits.

Database tests will use reproducible seeding and reset procedures. Unit tests
may mock email sending. SMTP integration tests will use isolated Mailpit services
and inspect captured messages through its API. Staging validation uses the
separate Mailtrap Email Testing sandbox.

### 5.7 Validation Criteria for Implementation

| Validation Area | Expected Result |
| --- | --- |
| Setup and execution | A developer can start frontend, backend, MongoDB, and Mailpit through the planned Compose stack. |
| Application connectivity | The frontend communicates with the local backend, which connects to MongoDB. |
| Email functionality | Local/CI email is captured in isolated Mailpit inboxes with forwarding disabled. |
| JWT authentication | Protected functions work with valid JWTs using a configured random signing secret. |
| Environment configuration | Required settings and explicit SMTP authentication policy are documented without committing secrets. |
| Unit testing | Frontend and backend one-shot suites run locally without external services; initial results are linked in the implementation document. |
| Integration and CI testing | Planned suites run with synthetic data, readiness checks, isolation, cleanup, and retained CI evidence. |

### 5.8 Verification and Limitations

These observations describe the original configuration assessment only.

- Thirteen controlled configuration checks passed, inspecting transporter
  options without connecting to an SMTP server.
- JavaScript syntax, tracked-diff whitespace, and local environment ignore
  checks passed.
- The developer observed a PEERS password-reset email captured by local
  unauthenticated Mailpit.
- The developer reported the manual authenticated Mailpit checks passed.
  These used synthetic credentials and a separate local test container;
  no retained automated integration report is available.
- Authenticated local testing did not verify staging TLS or hosted services.
- Password-reset routing and response-contract defects are tracked in
  [Known Bugs](../../../known-bugs.md); full password-reset completion is not claimed.
- At that assessment, setup automation, the integrated Compose stack, email
  test suites, and CI jobs remained separate implementation work. Their later
  results are linked in the implementation records above.

## Related Documents

- [CI/CD Architecture Design](../ci-cd-architecture-design/README.md)
- [Automated Testing Strategy](../automated-testing-strategy/README.md)
