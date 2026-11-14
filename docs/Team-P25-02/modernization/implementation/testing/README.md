# Testing Implementation

This folder records implemented automated tests, how to run them, dated
verification results, and remaining gaps. Test source and CI configuration
are authoritative for what is implemented and configured. The
[regression matrix](../../../requirements/regression-test-matrix.md) defines
the 74 expected critical-workflow outcomes.

## Testing layers and navigation

| Layer or reference | Document |
| --- | --- |
| Frontend unit and component tests | [Frontend unit testing](frontend-unit-testing.md) |
| Backend unit tests | [Backend unit testing](backend-unit-testing.md) |
| Shared isolated integration services | [Integration test environment](integration-test-environment.md) |
| API and database integration | [API and database integration](api-database-integration.md) |
| Authentication and authorization integration | [Authentication and authorization integration](authentication-authorization-integration.md) |
| Email integration: invitations, reminders, reset links | [Email integration](email-integration.md) |
| Browser journeys and smoke checks | [End-to-end testing](end-to-end-testing.md) |
| Deployed staging smoke checks | [Staging smoke tests](staging-smoke-tests.md) |
| API operation traceability reference | [API/database operation inventory](api-database-operation-inventory.md) |

The operation inventory's `OP-33` identifiers name API operations, not
individual test cases. The [email limitations](email-integration.md#7-limitations-and-remaining-coverage)
retain the outstanding REG-CW05-09 mixed-acceptance gap.

## Evidence terms

- **Implemented:** Test source and assertions exist.
- **Verified:** A test was executed and its result recorded with a date
  and revision.
- **CI-enforced:** The corresponding check is confirmed to be required
  before merging. A local pass or a configured CI job alone does not
  establish this status.

## Run the suites

Use Node.js `^22.22.2 || ^24.15.0 || >=26.0.0` and npm 9 or newer.
Both packages use Vitest `^5.0.5`. Frontend tests use jsdom `^30.1.3`
and React Testing Library; backend unit tests use Vitest's Node
environment and exclude the separate integration suite.
Run commands from the repository root:

```bash
npm test
npm --prefix src/backend test
npm run test:all
npm run test:integration
npm run test:e2e
```

For unit-test watch mode, use:

- Frontend: `npm run test:watch`
- Backend: `npm --prefix src/backend run test:watch`

The unit suites use isolated mocks. Integration and E2E execution require
Docker and Compose; see the shared environment and E2E records for their
specific prerequisites. The commands can also be run independently.

## Latest recorded local verification

At revision `d0088f7` on October 31, 2026, the existing records report:

| Suite | Recorded result | Detailed record |
| --- | --- | --- |
| Frontend unit/component | 85 passed in 10 files | [Frontend unit testing](frontend-unit-testing.md#6-test-results) |
| Backend unit | 143 passed in 16 files | [Backend unit testing](backend-unit-testing.md#6-test-results) |
| Integration | 200 passed in 15 files; cleanup verified | [API/database integration](api-database-integration.md#6-test-results) |
| Browser E2E | 13 passed; cleanup verified; teardown log recorded a container-stopping error | [End-to-end testing](end-to-end-testing.md#6-test-results) |

These are dated local results, not a new run at this branch's revision.

## Command verification cases

These retained IDs describe historical command-level verification checks,
not individual automated Vitest tests. Their earlier observations remain
preserved in Git history. This reorganization does not claim that the checks
were rerun.

| ID | Check and expected outcome | Relevant implementation |
| --- | --- | --- |
| UNIT-CI-001 | A deliberately incorrect frontend assertion makes `npm test` exit nonzero; restoring it makes the command pass. | [LoginPage.test.jsx](../../../../../src/frontend/tests/LoginPage.test.jsx) |
| UNIT-CI-002 | `npm run test:all` runs both package suites once and returns success when both pass. | [Root package scripts](../../../../../package.json) |

## Category document structure

The frontend unit, backend unit, API/database integration, authentication
integration, email integration, and E2E records use these sections in order:

1. Overview
2. Testing Strategy
3. Test Organization
4. Test Cases
5. Execution Instructions
6. Test Results
7. Limitations and Remaining Coverage

Keep stable case IDs, source links, expected outcomes, and dated results
when reorganizing a record. Place tests under the behavior they cover
and execution evidence under Test Results.

## Related records

The [requirements traceability matrix](../../../requirements/traceability/README.md)
links requirements to test evidence. The
[CI implementation record](../continuous-integration.md) describes
configured jobs and dated hosted results; required-check settings need
their own confirmation.
