# Unit Testing — Legacy Link

The maintained overview of tooling, commands, and latest recorded results
is the [Testing Implementation index](README.md). Frontend and backend
cases are maintained in their respective category documents.

## Runtime Compatibility

The supported Node.js and npm versions, test tools, and commands are in
[Run the suites](README.md#run-the-suites). Both package manifests specify
the runtime range; their `.npmrc` files enable strict engine checks.

## Test Cases

- [Frontend unit cases](frontend-unit-testing.md#test-cases) include
  UNIT-FE-001. The RTM's UNIT-FE-002 through UNIT-FE-004 references
  remain undefined in the existing testing records.
- [Backend unit cases](backend-unit-testing.md#test-cases) retain
  UNIT-BE-001 through UNIT-BE-016.
- [Command verification cases](README.md#command-verification-cases)
  retain UNIT-CI-001 and UNIT-CI-002.

## Test Results

The [latest recorded local verification](README.md#latest-recorded-local-verification)
summarizes the October 31, 2026 results at revision `d0088f7`. The
[frontend](frontend-unit-testing.md#verification-results) and
[backend](backend-unit-testing.md#verification-results) records describe
their suite results and limits.
