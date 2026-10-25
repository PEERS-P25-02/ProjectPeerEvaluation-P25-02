<a id="01-milestone-1-objective"></a>

<a id="section-1"></a>

# Milestone 1 Objective

The purpose of the CI/CD Architecture Design deliverable is to define how the inherited PEERS application should move from a developer change to a validated staging deployment. Milestone 1 is the assessment and planning phase. The team is not expected to have the complete pipeline implemented yet; the goal is to leave Milestone 1 with an evidence-based current-state assessment, an agreed target architecture, defined quality gates, known risks and decisions, and a practical implementation plan for Milestones 2 and 3.

This section supports the Milestone 1 rubric by documenting the repository/environment baseline, architecture direction, technical gaps, risks, decisions needed, and measurable next actions.

<a id="02-current-repository-state"></a>

<a id="section-2"></a>

# Current Repository State

The current-state assessment below is based on a direct review of the repository at the time of the original assessment together with the PEERS SLA and Project 25 specification.

- The application is an inherited React frontend with a Node.js/Express backend.

- The backend uses Mongoose and connects to MongoDB through MONGODB\_URI or MONGO\_URI.

- The root package.json identifies version 1.0.0 and includes frontend start, build, test, setup, and combined development scripts.

- The backend package.json identifies version 1.0.0 but currently defines only a start script; it does not define an automated backend test command.

- No .github/workflows directory was identified in the assessed repository snapshot, so GitHub Actions CI/CD was not implemented at that time.

- The repository contains deployment documentation, Render-related configuration notes, Docker Compose configuration, application source code, and a backend health endpoint.

- A committed src/backend/.env file is present in the repository. The team should review its contents, remove real secrets from version control, rotate exposed values if necessary, and retain only safe example configuration.

<a id="03-confirmed-ci-cd-and-environment-gaps"></a>

<a id="section-3"></a>

# Confirmed CI/CD and Environment Gaps

| Current Finding | Why It Matters | Required Direction |
| --- | --- | --- |
| docker-compose.yml provisions PostgreSQL and sets a PostgreSQL DATABASE\_URL. | The backend application actually uses MongoDB/Mongoose, so the current Compose file does not represent the real database architecture. | Replace the PostgreSQL service/configuration with the approved MongoDB-based local/test architecture and validate the full stack. |
| No GitHub Actions workflow files were identified. | Build, testing, dependency/security validation, merge gates, and staging deployment are not automated. | Create GitHub Actions workflows during Milestones 2 and 3 based on the Milestone 1 architecture. |
| Backend package.json has no test script/framework. | Backend logic cannot currently participate in a repeatable CI test gate. | Add an agreed backend automated test framework and scripts. |
| A manual backend test\_api.js script exists. | It calls one local API endpoint with Axios and logs output, but it is not a repeatable automated unit/integration suite. | Replace or supplement diagnostic scripts with structured automated tests that produce reliable pass/fail results. |
| A real .env file is tracked under src/backend. | Committed environment values may expose secrets or cause inconsistent environment behavior. | Use .env.example for documented placeholders and approved secret stores for protected values. |
| The backend already provides GET /api/health. | A health endpoint gives the delivery pipeline an existing way to verify service availability after deployment. | Use or extend the endpoint as part of staging health validation. |

<a id="04-target-ci-cd-architecture"></a>

<a id="section-4"></a>

# Target CI/CD Architecture

The target architecture is a GitHub-based workflow where developers work on feature branches, open pull requests into main, and GitHub Actions automatically validates each proposed change. Only changes that satisfy the required checks and reviews should be merged. After an approved merge, the exact validated version should deploy automatically to staging, where health checks and smoke tests confirm that the release is usable.

| Stage | Target Behavior |
| --- | --- |
| Feature branch | Developer makes an isolated change without working directly on main. |
| Pull request | Change is reviewed before merge. The current team proposal uses two reviewer approvals. |
| CI validation | GitHub Actions runs build, lint/format checks, automated tests, dependency checks, and security checks. |
| Quality gate | Required failed checks prevent the pull request from merging. |
| Merge to main | Only approved, validated changes become part of the shared baseline. |
| Staging deployment | The approved merged version deploys automatically to the staging environment. |
| Staging validation | Health checks and smoke tests verify frontend/backend availability, database connectivity, and selected workflows. |
| Production | Production deployment automation is outside the current capstone scope and remains subject to sponsor approval. |

<a id="05-proposed-technology-and-platform-direction"></a>

<a id="section-5"></a>

# Proposed Technology and Platform Direction

| Technology / Platform | Purpose |
| --- | --- |
| GitHub Actions | CI/CD orchestration |
| Docker and Docker Compose | Repeatable local and test environments |
| Render (proposed) | Staging host for the frontend and backend |
| MongoDB Atlas (proposed) | Managed staging database |
| MongoDB and Mailpit containers | Disposable isolated CI database and email inbox; no Atlas/Mailtrap credentials |
| Mailtrap Email Testing | Separate authenticated staging email sandbox |
| ESLint and Prettier | Code-quality and formatting checks |
| Dependabot and/or an OWASP dependency scanning tool | Dependency and security visibility |

Render, MongoDB Atlas, Mailtrap, and security-scanning choices should remain identified as proposed until the team confirms access, funding, sponsor expectations, and implementation constraints.

<a id="06-continuous-integration-design"></a>

<a id="section-6"></a>

# Continuous Integration Design

Continuous Integration will validate proposed changes before they are merged into main. The pipeline should turn the current manual build/test process into a repeatable automated quality gate.

| Area | Requirement |
| --- | --- |
| Workflow triggers | Trigger the required CI workflow for each code commit pushed to the repository and each pull request targeting main, consistent with the approved requirements. |
| Node runtime | Use Node satisfying `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0`; include checks of the supported minimum versions as runtime validation is implemented. |
| Dependency installation | Run `npm ci` and `npm --prefix src/backend ci` from the repository root using the separate lockfiles; fail the workflow if either installation fails. |
| Application build | Build the React application with `npm run build` from the repository root. |
| Code quality | Run ESLint/formatting validation using the agreed project rules. |
| Unit testing | Run `npm test` and `npm --prefix src/backend test` in separate jobs or steps for independent reporting. These initial suites do not require MongoDB or SMTP services. |
| Integration testing | Add integration commands as coverage is implemented. Run those suites with disposable MongoDB/Mailpit services, explicit configuration, an ephemeral JWT_SECRET, and SMTP_AUTH_REQUIRED=false. Wait for readiness, isolate concurrent jobs, and clean up services/storage even after failure. |
| Dependency and security checks | Run dependency and security checks and expose results to maintainers. |
| Merge requirements | Require configured checks to pass before merge. |
| Branch protection | Protect main so normal changes are merged through pull requests rather than direct unvalidated changes. |
| Logs and reports | Retain logs/reports needed to demonstrate pipeline, test, security, and build results. |

Unit-test commands and initial local results are documented in [Unit Testing Implementation](../../implementation/testing/unit-testing.md). The CI workflow and integration-service jobs described above remain planned; no workflow execution is claimed.
