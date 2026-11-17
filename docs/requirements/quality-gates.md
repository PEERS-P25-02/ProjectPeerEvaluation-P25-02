# Quality Gate Policy

This policy defines the approved CI verification requirements and their current
enforcement. [Requirements](requirements.md) FR-13–FR-20 and AC-02/AC-04 and
the [traceability map](traceability.md) connect these checks to the project's
requirements. The [CI guide](../ci-cd.md) describes execution and the
[testing guide](../testing.md) describes local testing. The [original detailed
policy](../archive/plans/requirements/quality-gate-policy.md) preserves the
decisions, planned gate-verification cases QG-01–QG-10, and historical status.

## CI verification requirements

CI validates pull requests targeting `main` (including head updates), merge
groups targeting `main`, and pushes to `main`. All three events require the
following, including for documentation-only changes:

- Successful locked dependency installations, frontend production build,
  configured frontend and backend lint and formatting checks, and CI policy tests.
- Both complete unit suites with coverage and the complete API integration
  suite, including successful service setup, readiness, and cleanup.
- OWASP Dependency-Check and Gitleaks secret scanning.
- The applicable coverage decision and a successful final `CI Gate`.

Full Playwright browser E2E testing is required for merge groups and `main`
pushes; it is inapplicable to pull requests. Coverage jobs depend on successful
unit and integration jobs. The final gate waits for all required jobs and
requires their expected outcomes: applicable jobs must succeed and only the
checks inapplicable to the event may be skipped. Failed, missing, cancelled,
unexpectedly skipped, or inconclusive required checks and missing required
evidence are not passes. The workflow defines the stable `CI Gate` check;
repository rulesets and merge-queue settings must separately require it to
enforce FR-19 and FR-20. A failed post-merge check cannot undo a merge.
Image publication and staging deployment require a successful `main` push CI
run; their delivery and smoke checks are described in the [CI guide](../ci-cd.md#continuous-delivery).

The functional preservation target remains CW-01–CW-09, including evaluation
reset within CW-05. The targeted API operations are OP-33-01–OP-33-23 and
OP-33-25–OP-33-33; OP-33-24 and OP-33-34–OP-33-36 are outside that targeted
scope, but all existing tests must still pass. Security checks apply across the
repository. See the [regression matrix](../archive/plans/requirements/regression-test-matrix.md)
and [operation inventory](../archive/implementation-records/api-database-operation-inventory.md).
Test plans record stable IDs, requirement or risk links, preconditions,
synthetic fixtures, actions, expected outcomes, test levels, owners, and evidence.
Map all nine workflows to appropriate test layers, use isolated services, and
do not send test email to real recipients. Unclear expected behavior remains
an open question or defect rather than a passing expectation.

## Code coverage

| Event | Required line coverage |
| --- | --- |
| Pull request | At least **80% of changed executable lines**, compared with the merge-base of the recorded base and tested head. If there are no changed executable lines, the valid decision is not applicable, not 100%. |
| Merge group or `main` push | At least **70% overall**, independently for frontend and backend. Each package must have a nonzero line denominator. |

Changed-line coverage is event-inapplicable for merge groups and pushes;
overall coverage is event-inapplicable for PRs. A PR with no executable changes
still runs and validates its required suites and coverage evidence. Overall
threshold comparisons use integer counts without rounding. Statements,
functions, and branches are reported but have no numerical floors.

The reviewed [coverage manifest](../../scripts/coverage/policy.json) scopes
production JavaScript/JSX, including unvisited files as zero-hit; CSS, HTML,
assets, tests, tooling, generated output, and specified non-runtime helpers are
outside that scope. New production files enter the denominator automatically.
Exclusion or instrumentation changes require review and must not evade a floor.
Frontend and backend unit coverage is combined by original source identity
with backend API integration runtime coverage; browser E2E does not contribute.
Source hashes, compatible instrumentation, artifact provenance, and report
completeness are validated before a decision. Missing, malformed, incompatible,
or stale evidence and below-threshold results fail the applicable job. Reports
and available diagnostics are retained for investigation, including failures;
an artifact alone does not make a failed job pass.

The historical sponsor target of 70–80% coverage of code mapped to critical
workflows remains separate from these whole-package floors. Line hits alone do
not prove a workflow or requirement outcome.

## Security and exceptions

OWASP Dependency-Check scans both npm lockfiles, including development
dependencies, and blocks at CVSS 7.0 or above. Scanner errors, missing or
invalid HTML/JSON reports, failed report upload, or a missing, invalid, future,
or over-48-hour-old vulnerability database cache fail the job. A separate
default-branch scheduled or manually dispatched updater supplies the cache;
see the [CI guide](../ci-cd.md#security-checks) for operation. Dependabot is
separate from this required scan.

Gitleaks scans the relevant PR, merge-group, or push commit range; the
merge-group range includes earlier queued changes. Findings or scanner errors
fail the job. Range scans do not certify all repository history. Confirmed
exposed credentials block and must be revoked or rotated; active credentials
cannot receive an exception.

The approved policy blocks unapproved High/Critical findings and requires
Medium/Low findings to have an owner and disposition. Any non-secret exception
must identify the finding and scope, reason, linked issue, owner, compensating
controls, approver, expiry/review date, and audit record; it must be specific and
time-limited. Expiry blocks until remediation or approved renewal. The current
workflow does not implement an exception approval or expiry mechanism: it
enforces the scanner's CVSS threshold rather than evaluating approval records.
Do not treat the policy's exception requirements as an implemented bypass.

## Verification and evidence

Retain the tested candidate SHA, commands, tool and configuration versions,
required suite outcomes, coverage provenance and decisions, report locations,
cleanup status, and any exception disposition. CI retains unit and integration
results, applicable E2E results, coverage reports and inputs, and Dependency-Check
HTML/JSON reports when produced. Inspect job outcomes and artifacts together;
missing evidence cannot establish a pass. The [CI implementation record](../archive/implementation-records/continuous-integration.md)
contains dated verification and limitations; historical results do not prove a
later candidate passed. [Traceability](traceability.md) maps requirements to
verification without treating coverage percentages as acceptance evidence.
Coverage evidence includes the source manifest, normalized inputs, merge plan,
per-package four-metric reports, and the applicable decision alongside raw captures.

## Known enforcement limits

The original policy lists zero-warning lint as planned while QG-01 expects it;
QG-02 similarly expects warning-free formatting. The configured commands do
not establish those stricter warning rules. CodeQL
static analysis remains planned, with no required job in this workflow. The
planned controlled cases QG-01–QG-10 are expected outcomes, not a claim that
all have been executed. Repository protection and the exception process must
be verified separately from the checked-in workflow. These limits do not change
the approved requirements.
