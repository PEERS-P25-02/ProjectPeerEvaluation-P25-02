<a id="02-validation-results"></a>

# Current Validation Results and Assessment

[Back to validation overview](README.md)

## 3. Current Validation Results

The following table summarizes the results of the team's local development environment testing. While the repository setup and application startup procedures work successfully, MongoDB and SMTP required additional manual configuration because the repository does not provide a complete, containerized development environment.

| Validation Item | Status | Notes |
| --- | --- | --- |
| Repository Retrieval | Passed | Successfully clones the team repository. |
| Dependency Installation | Passed | Successfully installed both frontend and backend dependencies, though npm reported vulnerabilites for packages. |
| Frontend Startup | Passed | Successfully started the React frontend and accessed the login/setup page. |
| Backend Startup | Passed | Successfully started the Express backend. |
| Database Connectivity | Passed – Manual Setup | Created a separate MongoDB container and configured environment variables to establish a successful database connection. |
| JWT Authentication | Passed- Manual Setup | Protected functions worked with a valid JWT. Changing the secret and restarting backend invalidated the existing token;restoring the original secret and restarting restored access. |
| SMTP Integration | Passed – Manual Setup | Created a separate Mailpit container and configured environment variables to establish functionality. |
| Environment Configuration | Partially provided – Manual setup | Repository includes examples for environment variables but developers must configure their own database, SMTP, and JWT and supply the appropriate environment variables. |
| Automated Test execution | None | No established automated test suite is available in the current repository. |
| Containerized local execution | None | No working, integrated containerized development environment exists. MongoDB and Mailpit containers were created manually for testing. |
| Setup Repeatability | Partially Passed | Setup for repository retrieval and frontend/backend setup was repeatable amongst the team. All other setups had no documentation and was done manually. |

### 3.1 Current Validation Summary

The initial validation confirmed that the PEERS repository can be retrieved, its dependencies installed, and both the frontend and backend started successfully. MongoDB connectivity and SMTP functionality were also successfully tested, but both required manually creating and configuring separate Docker containers. MongoDB was used for database connectivity, while Mailpit was used to capture and test outgoing emails. The agreed local and CI environments will also use Mailpit; Mailtrap is reserved for shared staging.

JWT authentication was also successfully validated. Protected functions were accessible with a valid JWT. Changing the signing secret and restarting the backend invalidated the existing token, while restoring the original secret and restarting the backend restored access.

The current development environment is functional but not fully repeatable. Developers must provide their own environment variables and manually configure supporting services. There is also no established automated test suite or working integrated containerized setup.

These findings support the planned introduction of Docker Compose to coordinate PEERS, MongoDB, and Mailpit, along with improved environment configuration, JWT secret management, and automated testing support.

## 4. Current Environment Assessment

The current PEERS development environment supports repository retrieval, dependency installation, frontend and backend startup, MongoDB connectivity, SMTP functionality, and JWT authentication. However, database and email testing required manually creating separate MongoDB and Mailpit containers and supplying the appropriate environment variables.

Although the tested components function correctly, the current setup is not fully repeatable. The repository does not provide an integrated containerized development environment or an established automated test suite. Environment configuration also requires additional manual steps.

These findings establish the basis for the planned development environment described in Section 5, which will focus on Docker Compose, standardized configuration, integrated supporting services, and automated testing support.

<a id="03-planned-development-environment"></a>

# Planned Development Environment

[Back to validation overview](README.md)

## 5. Planned Development Environment

The planned PEERS development environment will use Docker Compose to provide a repeatable local setup for Windows, macOS, and Linux. Docker Compose will run the React frontend, Express backend, MongoDB database, and Mailpit email service. Each developer will have independent local data and an inbox; CI will use disposable isolated services. MongoDB Atlas and a separate Mailtrap Email Testing sandbox are reserved for shared staging.

Native npm commands will remain available as an alternative to Docker Compose. These improvements will reduce manual configuration and establish a consistent environment for development and automated testing.

### 5.1 Environment Architecture and Local Setup

The planned development environment will include the following components:

| Component | Implementation | Purpose |
| --- | --- | --- |
| Frontend | React Docker container | Runs the PEERS user interface locally. |
| Backend | Express Docker container | Runs the API and handles JWT authentication. |
| Database | MongoDB Docker container | Stores development data. |
| Email | Mailpit Docker container | Captures outgoing local test emails with forwarding disabled. |
| Docker Compose | Container orchestration | Coordinates the four containers and passes the required configuration to them. |

## Related Documents

- [Containerization Assessment](../containerization-assessment/README.md)
