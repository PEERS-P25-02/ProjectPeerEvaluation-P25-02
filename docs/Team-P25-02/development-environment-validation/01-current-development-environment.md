# Current Development Environment

[Back to validation overview](README.md)

## 2. Current Development Environment

### 2.1 Required Software and Application Structure

PEERS is an inherited React application with a Node.js/Express backend. The frontend package is located at the repository root, while the backend has a separate package under src/backend/. The backend uses Mongoose to access MongoDB and Nodemailer to communicate with an external SMTP provider.

The current development requires the following tools:

| Tool | Purpose | Consideration |
| --- | --- | --- |
| Git | Retrieve and manage project source code. | The main branch and commit SHA  d28aca52e372e7d3aa8d1018b7e7308c685159c was used for this assessment. |
| Node.js | Run the backend and frontend development tools. | No supported version is currently pinned. |
| npm | Install frontend and backend dependencies and run project scripts. | Existing installation scripts require reproducibility review. |
| Code Editor | Develop and maintain application code. | VS Code is documented, but other editors may be used. |
| MongoDB | Store application data during development. | A reachable database must be configured separately. |
| Web Browser | Access and inspect the React frontend. | Browser requests must target the intended development backend. |
| SMTP Service | Support invitation, reminder and password-reset functionality. | Safe development email configuration requires validation. |

Docker and Docker Compose are planned for repeatable local and testing environments. However, the current Docker configuration does not provide an operational environment.

### 2.2 Repository Setup and Dependency Installation

The documented local setup process begins with cloning the repository and installing the frontend and backend dependencies.

```bash
git clone https://github.com/jonpauljah/ProjectPeerEvaluation-P25-02.git
cd ProjectPeerEvaluation-P25-02
npm run setup
```

The setup command installs both frontend and backend dependencies. However, the root package also includes a postinstall command that installs backend dependencies, potentially causing the backend installation to run more than once.

The current setup does not consistently enforce separate lockfile-based dependency installation for the two packages. Although both packages have dependency-locking files, the documented setup relies on npm install.

The team's initial development-environment report records a successful dependency installation, accompanied by warnings about outdated packages and possible security vulnerabilities.

### 2.3 Dependency Installation Report

During development environment validation, the team installed the frontend and backend dependencies using npm run setup. Although the installation completed successfully, npm reported several security vulnerabilities and deprecated packages, primarily affecting the frontend. The following table summarizes these findings and identifies dependency issues that require further review.

| Category | Result |
| --- | --- |
| Command | “npm run setup” |
| Node.js requirement | Node: >=v20.0.0 |
| Frontend Dependencies | 28 affected packages, 14 high, 5 moderate, 9 low |
| Frontend Deprecations | 25 deprecated package entries + Webpack middleware deprecation warnings |
| Backend Dependencies | 8 affected packages, 6 high, 2 moderate |
| Backend Deprecations | None |

### 2.4 Local Application Execution

The existing development process starts the frontend and backend together from the repository root:

```bash
npm run dev
```

The frontend is expected to be accessible at http://localhost:3000, while the backend normally listens at http://localhost:5000.

The Frontend and Backend can be started separately:

| Component | Command | Purpose |
| --- | --- | --- |
| Backend | “npm run start:backend” | Starts the Express Application |
| Frontend | “npm run start:frontend” | Starts the React Development server |

The team's earlier setup test successfully started the React frontend and displayed the Professor Login page. However, this result does not independently validate backend availability, MongoDB connectivity, email delivery or complete professor and student workflows.

### 2.5 Environment Configuration

The backend uses dotenv to load environment-specific configuration. This includes MongoDB connection information, authentication secrets, frontend addresses, SMTP settings and the backend server port.

| Configuration | Purpose |
| --- | --- |
| MONGO_URI | Identifies the MongoDB database used by the backend. |
| JWT_SECRET | Provides the secret required for authentication-token signing. |
| PORT | Configures the backend server port. |
| FRONTEND_URL | Supplies the frontend origin used by supported backend operations. |
| SMTP variables | Configure the email provider, authentication and sender details. |

The inherited configuration has several limitations. The backend .env file is tracked in version control, .env.example is incomplete, and the authentication implementation permits a hard-coded development secret when JWT_SECRET is absent.

### 2.6 Database and Email

The PEERS backend uses Mongoose to connect to MongoDB. The database must be provisioned or started independently because launching the Node.js application does not initialize MongoDB.

### 2.7 Automated Testing Setup

The inherited repository has some testing infrastructure but does not currently demonstrate a complete automated testing environment.

The frontend includes a react-scripts test command and React Testing Library dependencies. The backend has no established automated test command or framework in its package configuration. Its existing test_api.js is a manual diagnostic script rather than an automated suite with reliable assertions and pass/fail results.

The detailed test cases, fixtures, coverage decisions and execution rules will remain in the Automated Testing Strategy.

## Related Documents

- [Dependency Risks](../dependency-risks.md)
