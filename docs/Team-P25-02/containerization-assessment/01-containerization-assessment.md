<a id="01-purpose-and-scope"></a>

<a id="section-1"></a>

## Purpose and Scope

PEERS needs a repeatable runtime that matches its React, Node.js Express, and MongoDB architecture. The PEERS project specification, Containerization requirement, calls for Dockerfiles, Compose configuration, environment settings, health checks, and startup documentation. A Docker Compose design gives each required service a clear startup role while keeping the inherited three tier structure. That shared structure leads into the current findings that shape the target design.

Container work must improve delivery, testability, and setup without becoming major feature work. The specification states that existing functionality should be preserved and that the technology stack should not be replaced without sponsor approval. The team should correct environment gaps without turning the backend into microservices or changing the database platform. Those limits guide the findings below.

<a id="02-current-findings"></a>

<a id="section-2"></a>

## Current Findings

The documented container setup does not match the inherited application. The architecture review identifies that the prior Docker Compose file refers to PostgreSQL even though PEERS uses MongoDB through Mongoose. A PostgreSQL service cannot prove that the PEERS backend connects to its expected database, so the configuration must be replaced or removed. This finding establishes the main correction for the container plan.

| Finding | Effect on PEERS | Required response |
| --- | --- | --- |
| Compose database does not match MongoDB | Local setup can fail or use a false database dependency. | Define a MongoDB service and use the backend connection variable. |
| Environment values are partly hard coded | Local and staging behavior can diverge. | Move host names, ports, secrets, and email settings to environment configuration. |
| Email can contact an external SMTP provider | Test activity can send messages outside the project. | Use Mailpit for local/CI capture with forwarding disabled and a separate Mailtrap Email Testing sandbox for staging. |
| Service readiness is not proven | The frontend or backend can start before dependencies are ready. | Add health checks and dependency conditions where supported. |
| Setup steps depend on developer knowledge | New developers can reach different results. | Provide one startup command and a short validation checklist. |

<a id="03-target-container-design"></a>

<a id="section-3"></a>

## Target Container Design

Each supported machine must run the same PEERS components. The architecture review, Target Architecture section, names a React frontend, Node.js Express backend, MongoDB service, and email test service as the planned local environment. Docker Compose should place these services on one internal network and expose only the ports needed by a developer browser or test runner. The diagram shows how that structure supports the remaining configuration rules.

![](assets/image3.png)

Figure 1. Proposed local container arrangement for PEERS. The agreed local/CI email service is Mailpit; any older provider labels in the diagram are superseded by this configuration.

The frontend needs to present the existing user interface from a service that is separate from the API. The PEERS architecture review identifies React as the frontend tier that calls the backend REST API. The frontend configuration should use an API base URL that points to the backend service or approved local host route rather than a hard coded staging address. That separation allows the backend service to use its own image and dependency plan.

The backend must preserve the modular monolith while using external configuration. The architecture review describes authentication, courses, rosters, teams, evaluations, reporting, and professor settings as modules inside one backend process. The Dockerfile should install locked dependencies, copy the application source, define a non-secret runtime command, and expose the API port. This service then connects to MongoDB and the email test service through configuration values.

Local test data must survive normal restarts without entering the repository. The project specification lists MongoDB as a suggested technology and asks teams to initialize required services and databases. A MongoDB container backed by a named volume keeps local data between normal restarts, while a documented reset command removes it only when a clean test state is needed. This controlled persistence supports repeatable validation.

<a id="04-configuration-and-security"></a>

<a id="section-4"></a>

## Configuration and Security

Local and staging environments need different values without exposing secrets. The architecture review identifies hard-coded settings and credential handling as high-priority concerns. A committed .env.example file should name every required variable without real values, while .env and staging secrets remain outside version control. This boundary keeps the Compose file readable. CI will use disposable MongoDB/Mailpit services without Atlas or Mailtrap credentials; staging credentials remain in protected settings. See the [configuration contract](../development-environment-validation/03-configuration-and-testing.md) for addresses and explicit backend environment injection.

| Configuration area | Local approach | Staging approach |
| --- | --- | --- |
| Database connection | Use the Compose service host, port, and a development database name. | Use the approved MongoDB Atlas connection string from protected secrets. |
| JWT and token secrets | Load placeholder-free values from an ignored local .env file. | Load protected values from the deployment platform or GitHub Actions secrets. |
| Email delivery | Use `mailpit:1025`, `SMTP_SECURE=false`, `SMTP_AUTH_REQUIRED=false`, and empty credentials. | Use the separate Mailtrap sandbox with `SMTP_AUTH_REQUIRED=true` and protected credentials. |
| Frontend API URL | Use the local backend route defined for the Compose network or browser proxy. | Use the deployed staging API address. |
| Logs and debug mode | Use readable console logs without student data. | Use deployment logs with debugging limited to approved settings. |

<a id="05-validation-plan"></a>

<a id="section-5"></a>

## Validation Plan

The container stack must prove that it can start and operate as one system. The project specification, Containerization requirement, explicitly asks for service health checks and startup documentation. Docker health checks should test MongoDB readiness and a backend health endpoint when one exists, while smoke checks should confirm that the frontend can reach the API. These checks create evidence that the containers are working as one system.

| Check | Expected result | Evidence to retain |
| --- | --- | --- |
| Build images | Frontend and backend images build from a clean checkout. | Build output and image tags. |
| Start Compose stack | All defined services remain running and healthy. | Compose status output and health status. |
| Database connection | Backend connects to MongoDB and completes a safe startup action. | Backend log line without secrets. |
| Email sandbox | A test invitation is captured by the local or staging test inbox. | Message view or test result with no student data. |
| Core smoke path | A user can load the application and reach a safe API endpoint. | Automated smoke test result. |
| Clean setup repeat | A second supported machine follows the guide without undocumented steps. | Reviewer checklist and issue record. |

<a id="06-operational-guidance"></a>

<a id="section-6"></a>

## Operational Guidance

A new developer needs a short setup path with few manual steps. The Development Environment requirement in the specification asks the team to install dependencies, initialize services, configure settings, and support local execution with minimal manual work. A new developer should copy the example environment file, enter local values, run the documented Compose command, and open the stated local address. This sequence makes the troubleshooting rules easier to apply.

Hidden environment failures can slow debugging and create inconsistent results. The architecture review ties portability and configurability to documented setup and external configuration. If the frontend fails, the developer should check its API setting; if the backend fails, the developer should check its database and SMTP settings; if the database fails, the developer should inspect the volume and health status. These steps keep corrective work tied to visible evidence instead of guesswork.

<br>

<a id="07-acceptance-evidence"></a>

<a id="section-7"></a>

## Acceptance Evidence

The project needs clear proof that containerization is complete. The project specification lists Dockerfiles, Docker Compose configuration, environment configuration, service health checks, and startup documentation as expected deliverables. The final repository should include those files, an ignored-secret policy, a successful clean-start record, and links from the requirements traceability matrix to relevant tests. Together, those items allow the sponsor to review both the design and its working proof.

| Artifact | Acceptance condition |
| --- | --- |
| Dockerfiles | Each application service builds from a documented, repeatable definition. |
| compose.yaml | Defines the React frontend, Node.js Express backend, MongoDB, and test email service. |
| .env.example and ignore rules | Names required variables, excludes secrets, and gives safe setup guidance. |
| Health and smoke checks | Show that services start and the application can complete a safe basic path. |
| README startup section | Lets a future developer start, stop, reset, and troubleshoot the local stack. |
| Validation record | Shows a clean setup was completed against the agreed checklist. |
