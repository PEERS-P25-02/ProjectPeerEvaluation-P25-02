# PEERS Technical Assessment

for Dr. Geetika Vyas

By SWE 4724 Software Eng Capstone W01 (87351) Team P25-02

**Last Modified Date:** 9/23/26

**Document Owner:** Jonpaul Abohasen, Soufian Carson, Phoenix Kearse, Brandon Chafin, Eduardo Arellano-Pacheco

## Assessment Sections

- [Purpose and Scope](#1-purpose-and-scope)
- [Executive Assessment Summary](#2-executive-assessment-summary)
1. [Architecture and Stack](01-architecture-and-configuration.md#01-architecture-and-stack) — sections 3, 4
2. [Repository and Configuration](01-architecture-and-configuration.md#02-repository-and-configuration) — sections 5, 6
3. [External Dependencies](02-dependencies-database-and-deployment.md#03-dependencies) — sections 7
4. [Database Architecture](02-dependencies-database-and-deployment.md#04-database) — sections 8
5. [Deployment and Containerization](02-dependencies-database-and-deployment.md#05-deployment-and-containerization) — sections 9, 10
6. [Testing and Operational Readiness](03-testing-and-limitations.md#06-testing-and-operational-readiness) — sections 11, 12
7. [Defects and Limitations](03-testing-and-limitations.md#07-defects-and-limitations) — sections 13
- [Assessment Priorities and Planned Direction](#14-assessment-priorities-and-planned-direction)

## Version

| Version | Date | Description | Author |
| --- | --- | --- | --- |
| 1.0 | 09-28-2026 | PEERS Technical Assessment | Team P25-02 |

Project ID: P25    Team ID: P25-02

## 1. Purpose and Scope

This Technical Assessment Report establishes the current technical baseline of the inherited PEERS (Peer Evaluation System) application and identifies the principal gaps that must be addressed before modernization work proceeds. The assessment is structured around the technical-assessment areas required by the project specification: software architecture, technology stack, repository organization, deployment procedures, configuration management, external dependencies, database architecture, containerization status, existing testing capabilities, and known defects and limitations.

## 2. Executive Assessment Summary

PEERS already contains substantial application functionality and follows a recognizable React, Node.js/Express, and MongoDB architecture. The inherited system is suitable for continued development, but the repository is not yet supported by a repeatable automated delivery process. Current gaps are concentrated in configuration and secret handling, containerization, automated testing, CI/CD, deployment validation, data-integrity controls, and several authorization and evaluation-workflow defects.

The project will preserve the existing core technology stack and focus on productionizing the engineering workflow around it. Planned work includes repeatable environments, automated quality checks and tests, containerization aligned with MongoDB, automated staging deployment, health and smoke validation, and technical documentation. Production hosting and production-release automation remain outside the current project scope.

| Assessment Area | Current State | High-Level Planned Direction |
| --- | --- | --- |
| Software architecture | Established three-tier web application with a modular-monolith backend. | Preserve the core structure; detailed target architecture is documented separately. |
| Technology stack | React frontend, Node.js/Express backend, MongoDB/Mongoose data layer, SMTP email integration. | Retain the core stack and add supporting CI/CD, testing, container, staging, and security tooling. |
| Repository organization | Single repository with separate frontend/backend source and extensive documentation. | Preserve the monorepo while reducing duplicate/obsolete structures and clarifying ownership of files. |
| Configuration | dotenv and lockfiles are used, but configuration is partly hard-coded and secret handling is weak. | Standardize environment configuration and move real secrets out of version control. |
| Staged Deployment | Manual Render-oriented procedures are documented | Automate deployment to a separate staging environment only. |
| Containerization | Preliminary Docker Compose exists but does not match the implemented MongoDB architecture. | Complete and validate containerization in the dedicated Containerization Assessment/implementation work. |
| Testing | Mostly manual verification; testing dependencies exist but meaningful automated coverage is absent. | Introduce automated unit, integration, regression, end-to-end, health, and smoke validation. |
| CI/CD | No checked-in pipeline was identified in the inherited repository. | Implement version-controlled CI/CD with enforceable quality gates and automated staging deployment. |

## 14. Assessment Priorities and Planned Direction

Based on the agreed project scope and the technical findings above, the immediate technical priorities are to protect confidentiality and data integrity, confirm the supported functional baseline, establish repeatable automated regression coverage, repair configuration and containerization foundations, and implement the CI/CD workflow needed for validated staging deployment. Recovery, readiness, and operational evidence should be completed as the delivery workflow matures.

Detailed implementation decisions are intentionally deferred to the remaining Milestone 1 deliverables. This report should therefore be treated as the technical baseline and gap assessment rather than as the final container, testing, or CI/CD design.
