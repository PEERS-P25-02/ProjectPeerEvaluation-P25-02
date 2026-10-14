<a id="01-architecture-and-stack"></a>

# Architecture and Stack

[Back to assessment overview](README.md)

## 3. Software Architecture Summary

The current PEERS application uses a three-tier web architecture. A React single-page frontend communicates with a Node.js/Express REST API, and the backend uses Mongoose to access MongoDB. Email operations are performed through Nodemailer and an external SMTP provider. The backend is implemented as a modular monolith, with authentication, courses, rosters, teams, evaluations, reporting, and professor settings separated by responsibility but deployed as one application.

This structure is appropriate for the current project size and is not planned for replacement. The primary technical objective is to strengthen the delivery, configuration, testing, and staging infrastructure around the inherited application. Detailed current-state and target-state diagrams, architecture issues, quality attributes, and architecture goals are maintained in the separate Application Architecture Review.

## 4. Technology Stack

### 4.1 Current Technology Stack

| Area | Current Technology | Current Role |
| --- | --- | --- |
| Frontend | JavaScript, HTML, CSS, React, Material UI (MUI), React Router DOM, Axios | Provides the browser UI, navigation, reusable interface components, and REST API communication. |
| Backend | Node.js, Express.js 4 | Defines REST API endpoints and server-side application logic. |
| File processing | Multer, csv-parser | Handles CSV roster upload and parsing. |
| Database | MongoDB, Mongoose 8 | Provides persistent application storage, schemas, validation, and database queries. |
| Authentication | bcryptjs, jsonwebtoken | Hashes professor passwords and supports JWT-based professor API authentication. |
| Communication | Nodemailer, external SMTP provider | Sends evaluation invitations, reminders, and password-reset email. |
| Configuration | dotenv | Loads environment-dependent backend configuration. |
| Code quality/build support | ESLint, React tooling, Babel/react-scripts | Supports linting, frontend build operations, and JavaScript transformation. |

### 4.2 Planned Supporting Technologies

The core application stack will be preserved. The following technologies are identified in the SLA and project specification as the proposed supporting stack for testing, CI/CD, containerization, staging, and quality automation. Exact configuration and implementation details are documented in the corresponding Milestone 1 design and strategy documents.

| Technology | Planned Role |
| --- | --- |
| Jest / React Testing Library | Unit, integration, and frontend behavior testing. |
| Playwright | End-to-end and regression workflow validation. |
| ESLint / Prettier | Automated code-quality and formatting checks. |
| GitHub Actions | CI/CD orchestration and automated validation. |
| Docker / Docker Compose | Repeatable local and test environments. |
| Render | Proposed staging hosting for the React frontend and Node.js/Express backend. |
| MongoDB Atlas | Proposed managed staging database. |
| Mailtrap | Staging email sandbox that captures test messages without contacting real students |
| Dependabot / OWASP Dependency Check | Proposed dependency and security scanning support; detailed configuration remains part of CI/CD planning. |

## Related Documents

- [Application Architecture Review](../application-architecture-review/README.md)

<a id="02-repository-and-configuration"></a>

# Repository and Configuration

[Back to assessment overview](README.md)

## 5. Repository Organization

### 5.1 Current State

The inherited application is maintained in a single repository containing both the React frontend and Node.js/Express backend. Application source is primarily divided under src/frontend/ and src/backend/. The frontend separates pages, reusable components, contexts, services, and styling. The backend separates routes, controllers, models, middleware, configuration, migrations, scripts, and utility functions. This organization provides a reasonable separation of concerns while retaining the simplicity of a monorepo.

| Type | Observation |
| --- | --- |
| Strength | Frontend and backend source are physically separated and backend responsibilities are organized into conventional directories. |
| Strength | A single repository allows application code, deployment material, and supporting documentation to evolve together. |
| Finding | Multiple route files appear to overlap in purpose, including auth.js/authRoutes.js and courses.js/courseRoutes.js. |
| Finding | More than one apparent frontend entry file exists; the current build uses src/index.js while src/frontend/index.js is additional. |
| Finding | Development/debugging utilities and migration or inspection scripts are mixed near production source. |
| Finding | Generated or historical artifacts and multiple deployment/integration files make the repository root harder to navigate. |

### 5.2 Planned Direction

The monolith repository structure should be preserved unless a specific technical need is required. Planned repository cleanup should focus on clarifying authoritative entry points and route files, separating automated tests and developer/debugging utilities from production code, reducing obsolete or duplicate artifacts, and using consistent naming and organization. Detailed test, container, and CI/CD file layouts will be defined in their respective deliverables.

## 6. Configuration Management

### 6.1 Current State

Git provides source and configuration version control, while npm package.json and package-lock.json files manage frontend and backend dependencies. The backend loads environment-dependent settings through dotenv, including MongoDB connection information, JWT settings, SMTP configuration, frontend URL, and server port.

| Finding | Assessment |
| --- | --- |
| Incomplete environment template | .env.example does not document every supported setting, including JWT_SECRET. |
| Hard-coded frontend API selection | The frontend selects local or hosted backend addresses in source code instead of relying exclusively on environment configuration. |
| Multiple configuration sources | Some behavior is defined in code while similar professor-specific settings are stored in MongoDB. |
| Tracked environment file | The backend .env file is present in version control while .gitignore is minimal, creating a risk of retaining credentials or environment-specific values in repository history. |
| No centralized secret/config validation | The inherited project does not currently establish approved secret storage, automated required-variable validation, or infrastructure-as-code configuration. |

### 6.2 Planned Direction

Environment-specific URLs, credentials, connection strings, and service settings will be removed from hard-coded or committed configuration where appropriate and supplied through environment-specific configuration.

| Planned Change | Approach | Purpose |
| --- | --- | --- |
| Local environment configuration | Use local .env files excluded from version control and maintain a complete .env.example containing required variable names only. | Prevent local credentials from entering repository history while keeping setup reproducible. |
| CI/CD secrets | Store credentials required by automated workflows in GitHub Actions Secrets. | Keep deployment tokens and other CI/CD credentials out of workflow files and source code. |
| Staging runtime secrets | Store runtime secrets such as MONGODB_URI, JWT_SECRET, and SMTP credentials in Render environment configuration. | Provide required staging configuration without committing sensitive values. |
| Frontend environment configuration | Move environment-specific API addresses out of application logic and into configuration. | Support clean separation between local and staging environments. |
| Configuration Validation | Validate required environment variables before application startup or deployment. | Prevent deployments from proceeding with missing required configuration. |
| Environment template completion | Update .env.example to document all required configuration variables without real values. | Improve developer setup and reduce undocumented configuration requirements. |

This approach separates local, CI/CD, and staging configuration while satisfying the project's security and configurability requirements. The detailed integration of GitHub Actions Secrets with the delivery pipeline will be defined in the CI/CD Architecture Design rather than in this assessment.

## Related Documents

- [CI/CD Architecture Design](../ci-cd-architecture-design/README.md)
- [Development Environment Validation](../development-environment-validation/README.md)
