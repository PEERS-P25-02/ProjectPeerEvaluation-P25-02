<a id="07-continuous-delivery-design"></a>

<a id="section-7"></a>

# Continuous Delivery Design

Continuous Delivery begins after a change has passed CI and has been approved for merge. The automated delivery target for this project is staging only.

| Area | Requirement |
| --- | --- |
| Deployment source | Use the exact merged commit that passed the required validation as the deployment source. |
| Staging deployment | Deploy the frontend and backend to the approved staging environment. |
| Configuration and secrets | Supply staging-specific configuration and protected values through environment configuration/secret storage. |
| Database connection | Connect the backend to the staging MongoDB environment. |
| Health validation | Use the existing /api/health endpoint, plus any additional checks needed, to verify backend availability. |
| Smoke testing | Run the selected smoke tests after deployment. |
| Failure handling | Fail the applicable workflow when deployment, health validation, or required smoke testing fails. |
| Deployment evidence | Retain deployment and validation evidence for milestone review and final handoff. |

<a id="08-quality-gates"></a>

<a id="section-8"></a>

# Quality Gates

| Quality Gate | Passing Criteria |
| --- | --- |
| Application build | Application build succeeds. |
| Code quality | Linting and formatting checks pass. |
| Automated testing | Required unit, integration, regression, and applicable end-to-end tests pass. |
| Dependency and security checks | Dependency and security checks complete and meet the team's agreed blocking criteria. |
| Pull request reviews | Required pull request reviews are complete. |
| Merge protection | A deliberately failing required check prevents merge. |
| Staging validation | After staging deployment, required health checks and smoke tests pass before the staged release is considered validated. |

<a id="09-configuration-secrets-and-environment-separation"></a>

<a id="section-9"></a>

# Configuration, Secrets, and Environment Separation

| Area | Requirement |
| --- | --- |
| Tracked source files | Remove real secrets and environment-specific credentials from tracked source files. |
| Configuration example | Keep a safe .env.example or equivalent documentation showing required variable names without real values. |
| Secret storage | Store protected values in GitHub/hosting-platform secret stores. |
| Environment separation | Use separate local, staging, and any future production configuration, credentials, data, and email behavior. |
| Environment-specific settings | Move environment-specific URLs and service settings out of hard-coded application logic when required for repeatable deployment. |
| Configuration documentation | Document the minimum configuration needed to build, test, run, and deploy the system. |

<a id="10-milestone-1-decisions-and-open-questions"></a>

<a id="section-10"></a>

# Milestone 1 Decisions and Open Questions

| Decision / Question | Current Direction | Milestone 1 Action |
| --- | --- | --- |
| Priority workflows | Use the SLA workflow list as the initial regression/E2E scope. | Confirm final priority list with sponsor. |
| Pull request approval rule | Two reviewer approvals are currently proposed. | Confirm and configure branch protection later. |
| Staging host | Render is proposed and the repository already contains Render-related configuration notes. | Confirm access, service layout, and cost constraints. |
| Staging database | MongoDB Atlas is proposed and aligns with the actual MongoDB application architecture. | Confirm database ownership, access, and test-data approach. |
| Email sandbox | Mailtrap or approved equivalent is proposed. | Confirm acceptable tool and credentials. |
| Dependency/security scanner | Dependabot and/or OWASP tooling is proposed. | Select the exact tools and define blocking severity rules. |
| Production | Production hosting/release automation is outside the current project scope. | Keep staging and production scope clearly separated. |

<a id="11-current-risks"></a>

<a id="section-11"></a>

# Current Risks

| Risk | Impact | Planned Response |
| --- | --- | --- |
| Docker configuration does not match MongoDB architecture | Local/CI/staging environments may not reproduce the actual application. | Replace PostgreSQL references and validate the MongoDB-based service layout. |
| No CI workflow exists yet | Changes can be merged without automated build/test/security validation. | Implement the Milestone 1 design as GitHub Actions in Milestone 2. |
| Backend automated testing is not established | CI cannot reliably validate backend behavior. | Add test framework/scripts and prioritize critical backend workflows. |
| Tracked .env file / configuration issues | Potential secret exposure and environment inconsistency. | Review, remove sensitive values, rotate if required, and use secret stores. |
| Legacy defects block automation | Tests or deployments may fail for inherited reasons. | Classify findings using the agreed defect boundary and fix material blockers. |
| Proposed staging services are not fully confirmed | Milestone 3 delivery implementation could be delayed. | Resolve platform/access decisions before Milestone 3 implementation. |

<a id="12-milestone-1-completion-criteria"></a>

<a id="section-12"></a>

# Milestone 1 Completion Criteria

| Area | Completion Criteria |
| --- | --- |
| Repository assessment | Repository evidence clearly documents the current delivery, container, test, configuration, and automation gaps. |
| Target architecture | The target architecture from feature branch through staging validation is documented. |
| Continuous integration | CI triggers, build/test/security stages, branch protections, quality gates, and failure behavior are defined. |
| Staging delivery | The staging deployment path and post-deployment validation approach are defined. |
| Configuration and secrets | Configuration and secret-handling expectations are documented. |
| Decision status | Proposed versus approved decisions are clearly labeled. |
| Risks and open decisions | Risks and open decisions are documented with clear next actions. |
| Implementation planning | The remaining implementation is decomposed into Milestone 2 and Milestone 3 work. |

<a id="13-next-steps-after-milestone-1"></a>

<a id="section-13"></a>

# Next Steps After Milestone 1

| Milestone | Next Step |
| --- | --- |
| Milestone 2 | Correct and finalize the repeatable container/development environment. |
| Milestone 2 | Expand the initial unit tests and implement integration, regression, and end-to-end coverage. Unit-test runner setup and the first two tests are implemented; see [Unit Testing Implementation](../../implementation/testing/unit-testing.md). |
| Milestone 2 | Implement GitHub Actions CI workflows and required merge quality gates. |
| Milestone 2 | Establish branch protection and required-check enforcement. |
| Milestone 3 | Implement automated staging deployment. |
| Milestone 3 | Use health checks and smoke tests to validate the deployed version. |
| Milestone 3 | Retain automated reporting and complete deployment/release/handoff documentation. |

<a id="14-source-alignment"></a>

<a id="section-14"></a>

# Source Alignment

This document is based on the Project 25 specification, the PEERS Client Service Level Agreement v1.0, the Milestone 1 grading rubric, and a direct review of the repository at the time of the original assessment. Repository-derived statements are limited to artifacts actually observed during that review.
