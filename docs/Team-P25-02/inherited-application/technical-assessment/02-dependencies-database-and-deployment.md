<a id="03-dependencies"></a>

# External Dependencies

[Back to assessment overview](README.md)

## 7. External Dependencies

### 7.1 Current State

The inherited system relies on external packages and services for frontend build operations, linting, authentication, email, file processing, database access, and deployment. Several packages are declared, but no active use was identified in the Technical Overview, indicating that dependency cleanup should be considered as part of maintainability work.

| Dependency / Group | Role or Finding | Status |
| --- | --- | --- |
| react-scripts | Frontend development server, build process, and test commands. | Active |
| concurrently / cross-env | Local development startup and environment handling. | Active |
| @babel/core | JavaScript transformation for the React build. | Active |
| ESLint + React plugins | Static code-quality checking. | Active |
| uuid | Used by tooling/database setup; not declared as a direct active-application dependency. | Tooling / review |
| Render | Referenced by deployment documentation as the intended hosting approach; current live deployment was not independently verified. | Documented staging deployment dependency |
| Charting/form/upload/date libraries | Several packages such as chart.js/recharts, formik/yup, react-dropzone, and date-fns are declared but no active usage was identified. | Unused |
| Testing-library packages | Declared in the frontend but no implemented automated frontend tests were found. | Present, unused |

### 7.2 Planned Direction

The planned CRA-to-Vite migration has been implemented while retaining React; see the [migration record](../../modernization/implementation/tooling/vite-migration.md). Vitest was subsequently added to both packages and jsdom to the frontend. Dependency additions, removals, and runtime alignment are recorded in [Dependency Updates](../../modernization/implementation/tooling/dependency-updates.md), with testing evidence in [Unit Testing Implementation](../../modernization/implementation/testing/unit-testing.md).

Dependency management should be simplified by removing or justifying unused declarations, ensuring both frontend and backend installations are reproducible from lockfiles, and adding automated dependency/security checking as part of the CI process. The specific scanning configuration will be defined in the CI/CD Architecture Design.

## Related Documents

- Dependency Risks (historical supporting document; the referenced file is unavailable in this repository).

<a id="04-database"></a>

# Database Architecture

[Back to assessment overview](README.md)

## 8. Database Architecture

### 8.1 Current State

PEERS uses MongoDB as its persistent database and Mongoose as the backend modeling, validation, and query layer. The frontend does not access MongoDB directly. The backend uses one configured MongoDB connection, supplied through MONGODB_URI or MONGO_URI with a local development fallback.

The active data model centers on Professor, Course, Student, Team, and Evaluation collections. A Report schema exists, but the current reporting flow calculates results in backend memory and returns JSON or CSV rather than persisting reports as an active collection. Relationships are represented through MongoDB ObjectId references and are maintained by application logic rather than database-enforced foreign keys.

| Finding | Technical Impact |
| --- | --- |
| Duplicated state | Team membership is represented in both Student.team_id and Team.students; course counters and evaluation completion are also stored state that must remain synchronized. |
| No multi-document transactions | Operations that update multiple related documents occur as separate writes and can leave partial state if processing stops mid-operation. |
| Deletion consistency | Some delete/reset operations do not remove or reset every related record consistently, creating the possibility of stale references or state. |
| Application-level validation | MongoDB collection-level validation is not established and Mongoose update validation is not enabled consistently. |
| Index/uniqueness gaps | Duplicate evaluation prevention depends primarily on application checks; several common lookup fields do not have explicitly declared indexes. |
| Unconfirmed production topology | The inherited repository does not establish a confirmed production database provider, replication topology, or backup strategy. |

### 8.2 Planned Direction

MongoDB and Mongoose will remain the project database technologies; migrating to another database platform is outside scope. Technical work should focus on correcting material data-integrity defects, aligning local and container configuration with MongoDB, and maintaining separate staging configuration and data. MongoDB Atlas will be the staging database used in this project.

## Related Documents

- [Application Architecture Review](../../modernization/plans/application-architecture-review/README.md)

<a id="05-deployment-and-containerization"></a>

# Deployment and Containerization

[Back to assessment overview](README.md)

## 9. Deployment Procedures

### 9.1 Current State

The repository contains manual deployment documentation centered on Render. The documented model deploys the React frontend as a Render static site and the Node.js/Express backend as a Render web service, with external MongoDB and SMTP services configured through environment variables. The SLA records no confirmed live production site for the inherited baseline.

| Finding | Assessment |
| --- | --- |
| Manual procedure | Deployment steps are documented, but a repository-managed automated deployment workflow is not established. |
| Frontend build-path mismatch | Existing documentation refers to src/frontend as the build location even though the frontend package configuration and active build run from the repository root. |
| Missing documented variable | JWT_SECRET is required by the backend but is missing from the primary deployment guide. |
| Dashboard-managed infrastructure | No checked-in Render infrastructure configuration was identified, so manually configured hosting settings cannot be verified from source control. |
| Alternative platforms | Vercel, Railway, and Docker/cloud hosting are discussed as possibilities but are not established as implemented deployment environments. |

### 9.2 Planned Direction

The project will automate deployment to a separate staging environment after required validation succeeds. The staging approach will useRender for the frontend and backend, MongoDB Atlas for the database, and Mailtrap  for email capture. Production hosting, production deployment, and production-release automation are outside the agreed scope. Detailed deployment workflow behavior belongs in the CI/CD Architecture Design.

## 10. Containerization Status

### 10.1 Current State

Containerization is not currently operational. The repository contains a docker-compose.yml file and sample Docker-related documentation, but the Compose configuration does not accurately represent the implemented application.

| Finding | Assessment |
| --- | --- |
| Database mismatch | Docker Compose provisions PostgreSQL even though PEERS uses MongoDB through Mongoose. |
| Missing Dockerfiles | Compose references frontend and backend build contexts without corresponding implemented Dockerfiles. |
| Configuration mismatch | Compose uses configuration names that do not match the environment variables read by the application. |
| Documentation-only example | A sample Dockerfile appears in deployment documentation, but this is not an implemented container build in the repository. |

### 10.2 Planned Direction

The team will complete a MongoDB-aligned containerized environment and validate that the frontend, backend, database connection, environment configuration, and required supporting services operate reliably. Detailed Dockerfile, Compose, service-health, and startup decisions will be defined in the separate Containerization Assessment.

## Related Documents

- Current Deployment Procedures and Gaps (historical supporting document; the referenced file is unavailable in this repository).
- [Containerization Assessment](../../modernization/plans/containerization/README.md)
- [CI/CD Architecture Design](../../modernization/plans/ci-cd-architecture-design/README.md)
