# Integration Testing

## Testing Strategy

Run `npm run test:integration` from the repository root with Docker and
Compose available. The runner uses an isolated backend, transaction-capable
MongoDB, and Mailpit with synthetic data. It saves results under
`test-results/integration/` and verifies cleanup.

## Test Cases

| Case group | Detailed record |
| --- | --- |
| Isolated environment and cleanup | [Integration environment](integration-test-environment.md) |
| API and database operations | [API/database integration](api-database-integration.md) |
| Authentication and authorization | [Authentication and authorization](authentication-authorization-integration.md) |
| Invitation email and failure handling | [Email integration](email-integration.md) |

## Test Results

On October 31, 2026, `npm run test:integration` passed 200 tests across
15 files at revision `d0088f7`. The runner exited successfully and verified
cleanup. The local result and logs are under
`test-results/integration/555f8a8978c6d439/`; this directory is ignored
by Git and is not shared with the repository.

The suite checks API and database behavior, authorization, and captured
email. It does not establish complete browser journeys, external email
delivery, or every functional regression outcome.
