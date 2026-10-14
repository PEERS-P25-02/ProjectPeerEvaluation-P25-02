<a id="06-testing-and-operational-readiness"></a>

# Testing and Operational Readiness

[Back to assessment overview](README.md)

## 11. Existing Testing Capabilities

### 11.1 Current State

Current verification relies primarily on manual testing, diagnostic scripts, database inspection utilities, sample-data tools, and ESLint. The frontend includes a Jest-based test command and React Testing Library dependencies, but no meaningful implemented frontend test cases were identified. The backend does not currently define a comprehensive automated test command or suite.

| Capability | Current Assessment |
| --- | --- |
| Unit testing | No meaningful automated suite was identified for core business logic such as grading, token handling, or validation. |
| Integration testing | Authentication, API/database interactions, CSV imports, and email integration are not automatically verified end-to-end between components. |
| Regression testing | Critical professor and student workflows rely mainly on manual verification. |
| Failure-path testing | Database outages, email failures, invalid tokens, retries, partial writes, and concurrent submissions are not systematically tested. |
| Isolation/repeatability | Existing API scripts depend on a running local backend and specific data rather than a controlled disposable test environment. |
| CI execution/reporting | No repository-managed pipeline currently runs tests automatically, enforces required quality gates, or retains standardized test-result evidence. |

### 11.2 Planned Direction

The SLA requires automated unit, integration, regression, and end-to-end testing, followed by health and smoke validation in staging. Jest and React Testing Library are specified for appropriate frontend tests, and Playwright is specified for agreed end-to-end and regression workflows. The detailed test layering, scope, data strategy, and test-case design will be defined in the Automated Testing Strategy.

## 12. CI/CD and Operational Readiness

### 12.1 Current State

| Area | Current Assessment |
| --- | --- |
| CI/CD pipeline | No checked-in CI/CD pipeline was identified for automated build verification, testing, artifact creation, or deployment. |
| Health/readiness | The backend process can report healthy while the database connection is unavailable; current health behavior does not fully represent application readiness. |
| Email processing | Invitation and reminder messages are sent sequentially inside HTTP requests, increasing timeout and retry risk. |
| Rollback/recovery | No verified repeatable rollback process or database backup/restore procedure was found. |
| Operational logging | Console logging includes debugging and potentially sensitive context; structured logging, severity conventions, and a clear redaction policy are not established. |

### 12.2 Planned Direction

The project will establish version-controlled CI/CD that runs required build, quality, test, dependency, and security validation before changes progress. Approved changes will deploy automatically to staging, where health checks and selected smoke tests will validate service availability, database connectivity, and critical workflows. Detailed pipeline stages, triggers, gates, and deployment mechanics remain within the CI/CD Architecture Design.

## Related Documents

- [Automated Testing Strategy](../automated-testing-strategy/README.md)
- [CI/CD Architecture Design](../ci-cd-architecture-design/README.md)

<a id="07-defects-and-limitations"></a>

# Defects and Limitations

[Back to assessment overview](README.md)

## 13. Known Defects and Limitations

Defect Boundary Definition: Defects that materially affect agreed PEERS workflows, testing, security, reliability, containerization, or staging deployment are considered within the planned project scope. Issues involving unsupported functionality, unrelated enhancements, or behavior outside the approved baseline are documented as out of scope for future maintenance unless separately approved.

### 13.1 Out-of-Scope Defects and Limitations

These findings are recorded here as part of the inherited technical baseline. This table includes identified defects and limitations that are currently outside the approved implementation scope. These items are documented for visibility and future maintenance unless they are separately approved for inclusion in the project.

| Finding | Current Impact | High-Level Direction |
| --- | --- | --- |
| Evaluation deadlines are not enforced | Deadlines may appear in invitations without being persisted or enforced when evaluations are submitted. | Deadline enforcement is not currently part of the approved PEERS functional baseline. |
| MFA verification is incomplete | The application contains MFA-related fields and endpoints, but the verification workflow is incomplete. | MFA has been explicitly rejected from the current project scope. |
| Automatic team assignment is incomplete | Related endpoints exist but do not provide complete functionality. | Automatic team assignments have been explicitly rejected from the current project scope. |
| AI functionality is incomplete | AI-related endpoints or placeholder functionality exist but are not complete. | AI functionality has been explicitly rejected from the current project scope. |
| Token refresh functionality is incomplete | An exposed token-refresh path does not provide complete supported behavior. | Token refresh is not identified as part of the approved functional baseline or CI/CD project requirements. |
| Multiple evaluation campaign / historical lifecycle support is unclear | The current data model does not clearly separate multiple evaluation campaigns within the same course or preserve historical campaigns during resets. | Expanding PEERS to support a new multi-campaign lifecycle would represent additional application functionality beyond the current modernization scope. |
| Email delivery occurs inside HTTP requests | Long-running sends can time out or partially complete, creating retry and duplicate-message risks. | Define reliable delivery tracking/retry behavior; background processing may be considered if required by expected usage. |
| Operational logging needs refinement | Current logging is largely console-based and can expose sensitive context or lack consistent severity/redaction. | Establish logging conventions that support troubleshooting while protecting confidential data. |
| Maintainability / data lifecycle inconsistencies | Duplicate routes, placeholder code, stale configuration, and unclear multi-campaign evaluation lifecycle increase maintenance risk. | Remove redundant code, reconcile documentation, and confirm intended supported lifecycle before extending behavior. |

The incomplete functionality will be documented as an out-of-scope limitation so that future developers are aware of its current state. No implementation work will be performed unless the functionality is later approved for inclusion in the project scope.

### 13.2 Planned Direction

| Finding | Priority | Current Impact | High-Level Direction |
| --- | --- | --- | --- |
| Authorization / ownership checks are inconsistent | Critical | Some authenticated professor operations do not consistently verify ownership of the requested course or related data. | Apply consistent resource-ownership checks and verify them through automated integration tests. |
| Evaluation submission can partially save | High | Earlier peer evaluations can remain stored if a later item fails, leaving a submission incomplete and difficult to retry. | Make submission handling atomic or otherwise ensure failed submissions do not leave partial state. |
| Evaluation recipients are insufficiently validated server-side | High | The backend does not fully verify allowed recipients, self-evaluation, duplicates, or completeness. | Derive and validate the permitted recipient set on the server before saving. |
| Duplicate submissions can occur under concurrency | High | Application-level pre-checks are separate from writes and database uniqueness is not enforced for the full submission relationship. | Combine atomic handling with appropriate uniqueness safeguards and concurrency tests. |
| Course updates accept unrestricted request fields | High | Request data can update fields that should be system-controlled; update validators are not consistently enforced. | Allow only approved editable fields, validate them, and enforce course ownership. |
| Invitation status can disagree with email delivery | Medium | Token creation can make an invitation appear sent even when SMTP delivery fails. | Track delivery outcome separately from token creation and completion state. |
| Predictable JWT secret fallback | High | A hard-coded development fallback may be used if JWT_SECRET is missing. | Require approved secret configuration and fail startup when mandatory security values are absent. |
| Evaluation token generation/logging is weak | High | Evaluation links are bearer credentials; current generation is not cryptographically strong and token-bearing URLs can appear in logs. | Use secure token generation and redact sensitive token values from logs. |
| SMTP certificate verification disabled | Medium | TLS certificate verification is disabled for SMTP. | Enable certificate verification and correct provider/configuration issues directly. |
| Environment file tracked in version control | High if active credentials are present | The backend .env file can retain secrets or environment-specific values in repository history. | Sanitize tracked configuration, move real secrets outside the repository, and rotate confirmed exposed credentials. |
| No established automated regression suite | High | Changes can regress critical workflows without automated detection. | Implement repeatable automated coverage for approved critical workflows. |
| Failure-path coverage is absent | High | Invalid inputs, dependency failures, retries, and partial-write behavior are not systematically verified. | Add negative and recovery-path testing in the automated strategy. |
| Test execution is not isolated/repeatable | High | Existing scripts depend on local services and specific data rather than controlled setup/cleanup. | Use isolated test data, disposable databases, and safe email behavior. |
| Docker Compose does not match the application | High | The provided container configuration uses PostgreSQL, mismatched variables, and missing Dockerfiles. | Align the container environment with the real MongoDB-based architecture. |
| Frontend API address is hard-coded | High | Environment separation can fail and local instances can unintentionally target a shared hosted backend. | Use explicit environment-specific API configuration. |
| Deployment instructions do not match repository layout | Medium | Documented frontend working directories and artifact paths can cause failed or incorrect deployment steps. | Validate deployment from a clean checkout and update instructions. |
| Dependency installation is not fully reproducible | High | Root installation does not guarantee strict lockfile-based installation for the backend. | Define explicit reproducible install steps and supported Node/npm versions. |
| No checked-in CI/CD pipeline | High | The repository does not demonstrate a repeatable automated path from change to validation and staging deployment. | Implement version-controlled CI followed by approved staging CD. |
| Health checks do not verify database readiness | Medium | A deployment can appear healthy while essential database operations are unavailable. | Separate liveness from readiness and include dependency checks. |
| Recovery and rollback procedures are not established | Medium | Recovery from failed releases or database problems is not repeatably documented or verified. | Document and validate rollback/recovery procedures consistent with the selected staging platform. |

The prioritized workflows directly influence how defects and limitations are classified for this project. Issues that do not affect an approved workflow or another defined project area, such as testing, security, reliability, containerization, or staging deployment may instead be documented as out-of-scope limitations or future maintenance items.

The Critical Workflow Identification document will define which professor and student workflows are considered priority workflows. Those decisions will therefore provide part of the basis for determining whether a newly identified defect should be treated as an in-scope project issue or documented for future maintenance.

## Related Documents

- [Critical Workflow Identification](../critical-workflow-identification/README.md)
