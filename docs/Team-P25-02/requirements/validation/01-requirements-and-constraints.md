<a id="01-purpose-and-scope"></a>

<a id="section-1"></a>

## 1. Purpose and Scope

This document establishes the requirements for the PEERS modernization project and provides a basis for validating them with the project sponsor. It outlines the functional and non-functional requirements, project constraints, acceptance criteria, and scope exclusions that define what the team is expected to accomplish. The document also serves as a reference for other project deliverables, helping ensure that implementation and verification activities remain aligned with the agreed requirements.

<a id="section-2"></a>

### 1.1 Project Goal and Users

The goal of this project is to modernize the existing PEERS application by introducing automated testing, containerization, CI/CD, and automated staging deployment while preserving its existing functionality. The primary users are professors, course instructors, and students who use PEERS to manage and complete peer evaluations. Secondary users include system administrators and future developers responsible for maintaining and supporting the application.

<br>

<a id="02-functional-requirements"></a>

<a id="section-3"></a>

## 2. Functional Requirements

| ID | Type | Requirement |
| --- | --- | --- |
| FR-01 | Authentication | The system shall allow an authorized professor to authenticate and access professor functions. |
| FR-02 | Course Management | The system shall allow a professor to create and manage courses. |
| FR-03 | Roster Management | The system shall allow a professor to upload and process a student roster from a CSV file. |
| FR-04 | Team Management | The system shall allow students to be organized into course teams. |
| FR-05 | Evaluation Management | The system shall allow a professor to create and distribute a peer-evaluation activity. |
| FR-06 | Evaluation Management | The system shall generate individualized evaluation access links or tokens for eligible students. |
| FR-07 | Evaluation Management | The system shall support evaluation invitations and reminders through the configured email service. |
| FR-08 | Evaluation Management | The system shall allow a student to submit a peer evaluation through the assigned link. |
| FR-09 | Data Management | The system shall store course, roster, team, evaluation, and response data in MongoDB. |
| FR-10 | Report Management | The system shall allow a professor to review and export supported evaluation results and reports. |
| FR-11 | Development Environment | The project shall provide documented, repeatable setup procedures for the frontend, backend, database connection, and required external services. |
| FR-12 | Development Environment | The project shall provide Dockerfiles and Docker Compose configuration that reflect the application's MongoDB architecture. |
| FR-13 | Continuous Integration | Each code commit pushed to the repository and each pull request targeting main shall automatically trigger the required CI workflow. |
| FR-14 | Continuous Integration | The CI workflow shall build the application and run configured linting and formatting checks. |
| FR-15 | Continuous Integration | The CI workflow shall run automated unit and integration tests. |
| FR-16 | Continuous Integration | The project shall use Jest and React Testing Library for appropriate frontend automated tests. |
| FR-17 | Continuous Integration | The project shall use Playwright for agreed end-to-end and regression workflows. |
| FR-18 | Continuous Integration | The CI workflow shall perform dependency and security checks and make the results available to maintainers. |
| FR-19 | Continuous Integration | Required failed checks shall prevent a pull request from being merged into main. |
| FR-20 | Continuous Integration | The main branch shall be protected so that application changes are merged through pull requests and required validation checks must pass before merging. |
| FR-21 | Continuous Delivery | A successful approved change shall automatically deploy to the staging environment after required checks pass. |
| FR-22 | Continuous Delivery | After each staging deployment, the pipeline shall execute health checks and the selected smoke tests to validate application availability, database connectivity, and critical workflows. |
| FR-23 | Continuous Delivery | The project shall retain logs or reports sufficient to demonstrate pipeline, test, security, and deployment results. |
| FR-24 | Continuous Integration / Continuous Delivery | The project shall automate deployment to a staging environment only. Production hosting, production deployment, and production-release automation shall remain outside the project's scope. |
| FR-25 | Documentation | The project shall document setup, configuration, testing, pipeline behavior, deployment, rollback, release, and troubleshooting procedures. |

<br>

<a id="03-non-functional-requirements"></a>

<a id="section-4"></a>

## 3. Non-Functional Requirements

| ID | Quality Attribute | Requirement |
| --- | --- | --- |
| NFR-01 | Maintainability | New CI/CD code, tests, configuration, and documentation shall use clear organization, consistent naming, and documented responsibilities. |
| NFR-02 | Repeatability | The same source version and configuration shall produce a consistent build and test result in supported environments. |
| NFR-03 | Reliability | Failed required checks or failed deployment validation shall stop the applicable workflow and report the failure. |
| NFR-04 | Security | Credentials, tokens, connection strings, and environment values shall not be committed to the repository and shall use approved secret storage. |
| NFR-05 | Privacy | Automated and staging tests shall use synthetic, de-identified, or sponsor-approved data and shall not email real students unintentionally. |
| NFR-06 | Traceability | Requirements, tests, defects, pull requests, pipeline results, and milestone evidence shall be traceable through the repository and project documentation. |
| NFR-07 | Portability | The documented containerized environment shall run consistently on supported developer systems and CI runners. |
| NFR-08 | Configurability | Environment-specific URLs, credentials, and service settings shall be supplied through configuration rather than hard-coded production values. |
| NFR-09 | Usability | Setup, pipeline, deployment, and troubleshooting documentation shall be understandable to a future maintainer with relevant software-development skills. |
| NFR-10 | Recoverability | Deployment and release documentation shall identify how to return to the last known working version when supported by the selected platform. |
| NFR-11 | Functional Preservation | Existing PEERS functionality shall be preserved whenever practical, and changes introduced by the project shall not cause validated workflows to regress. |

<br>

<a id="04-constraints"></a>

<a id="section-5"></a>

## 4. Constraints

| ID | Type | Constraint |
| --- | --- | --- |
| C-01 | Schedule | The project shall be completed within the capstone semester and the milestone dates stated in this agreement. |
| C-02 | Technology | The project shall build on the inherited React, Node.js, Express, and MongoDB application rather than replace it with a new product. |
| C-03 | Scope | Significant new user-facing features are not part of the primary CI/CD objective. |
| C-04 | Security | The team shall not include passwords, API keys, database credentials, or real environment values in project documents or committed files. |
| C-05 | Deployment | The production hosting platform, production access, and release authorization remain subject to sponsor confirmation. |

<br>
