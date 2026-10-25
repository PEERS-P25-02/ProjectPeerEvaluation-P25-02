<a id="03-planned-development-environment"></a>

# Planned Development Environment

[Back to validation overview](../../../inherited-application/development-environment/README.md)

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

- [Containerization Assessment](../containerization/README.md)
