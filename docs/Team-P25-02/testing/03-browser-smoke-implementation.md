# Issue #40 — Browser Smoke Test Setup

**Status:** Superseded initial implementation checkpoint.
**Issue:** https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02/issues/40

This record originally described the initial, unexecuted Playwright smoke setup. At that checkpoint, dependency installation, automated orchestration, execution evidence, and cleanup verification were pending. Those statements describe that historical checkpoint, not the current repository.

Use the maintained [End-to-End Browser Testing implementation record](../modernization/implementation/testing/end-to-end-testing.md) for current commands, isolated-environment behavior, test cases, results, and limitations. The [CI implementation record](../modernization/implementation/continuous-integration.md#2-verification-evidence-and-handoff) records hosted execution evidence. The current runner owns a disposable Compose stack and its cleanup; the original development-stack startup and shutdown instructions are superseded.

## Historical case identifiers

The initial plan used these identifiers; they are retained for historical traceability, not as a current execution procedure or a claim that every original controlled check was verified.

| ID | Original planned check |
| --- | --- |
| E2E-40-01 | Application-stack readiness and same-origin backend health. |
| E2E-40-02 | Login page rendering in Chromium. |
| E2E-40-03 | Invalid synthetic login reaching the backend and returning an authentication error. |
| E2E-40-04 | Deliberate assertion failure producing a nonzero runner exit. |
| E2E-40-05 | Guaranteed application-stack cleanup. |

The maintained E2E record consolidates the smoke interaction under E2E-40-01 and separately documents fixture and critical-workflow journeys. Consult its dated results and the CI record before making execution or failure-gate claims.
