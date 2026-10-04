# Current deployment procedures and gaps

Reviewed: September 25, 2026.

This document describes the deployment supported by the checked-in application and gives developers concrete setup and release steps. Repository evidence confirms the application structure and configured URLs, but does **not** confirm the live Render settings, deployed commit, database provider, service plan, or account ownership. Procedures below correct stale repository instructions; they are not a claim that those corrections are already applied in Render. No deployment, database mutation, or email delivery was performed during this review.

## 1. Deployment architecture

| Component | Implementation and location | Deployment responsibility |
| --- | --- | --- |
| Frontend | React / Create React App; root `package.json`; entry `src/index.js`; application under `src/frontend/` | Build static assets and publish root `build/` on a Render Static Site. |
| Backend | Node.js / Express; separate package under `src/backend/`; entry `index.js` | Install backend dependencies and run the Node process on a Render Web Service. |
| Database | MongoDB via Mongoose; models under `src/backend/models/` | Provision MongoDB separately and give the backend its connection URI. Atlas is an option in the old guide, not a verified live provider. |
| Email | Nodemailer in `src/backend/utils/emailUtils.js` | Supply working SMTP credentials and sender configuration to the backend. |
| Source/release | Git repository connected to Render | Push or merge a reviewed commit to the configured deployment branch, then observe or manually trigger each service's deployment. |

The browser calls the backend over HTTPS; the backend connects to MongoDB and sends email. Deploying the frontend does not deploy the backend or migrate the database.

Configured production addresses:

- Frontend: `https://peer-evaluation-frontend.onrender.com`
- Backend: `https://peer-evaluation-backend.onrender.com`
- API prefix: `/api`

These addresses appear in source and documentation; availability was not tested. The backend does not serve the React build. PostgreSQL in `docker-compose.yml` does not match the running application's database code.

## 2. Developer setup and local execution

### Prerequisites

Install Git, Node.js, and npm, and have access to a development MongoDB instance. Both packages require Node.js >=20.9.0 and npm >=9.0.0, enforced by their `.npmrc` files. Follow the README's nvm installation instructions, record the version that successfully builds, and use the same version in Render. Use a development database and controlled test email addresses.

### Install and configure

From the repository root:

```bash
node --version
npm --version
npm run setup
```

`setup` installs the root and backend packages. The root `postinstall` also installs the backend, so this currently repeats that installation. The Windows `start.bat` and `start.ps1` scripts run setup again before starting both applications.

Create or edit `src/backend/.env`, using `.env.example` as the template only if the local file does not already exist. Do not overwrite an existing configuration blindly. The current repository tracks this `.env` file, and `.gitignore` only excludes `node_modules`; handle the secret-management gap in section 7 before committing configuration changes.

Example values, with placeholders rather than credentials:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/peer-eval
JWT_SECRET=<unique-development-secret>
PORT=5000
FRONTEND_URL=http://localhost:3000
SMTP_HOST=<development-smtp-host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<development-smtp-user>
SMTP_PASS=<development-smtp-password>
SMTP_FROM=<approved-test-sender>
```

The database must already be reachable. The Node process does not start MongoDB. The example environment uses `peer-eval`, while the server's no-variable fallback uses `peer-evaluation`; explicitly set `MONGODB_URI` to avoid connecting to an unintended database.

### Run frontend and backend

From the repository root, start both:

```bash
npm run dev
```

Or run these in separate terminals, both starting at the repository root:

```bash
# Terminal 1: backend
npm run start:backend
```

```bash
# Terminal 2: frontend
npm run start:frontend
```

The backend command changes directory to `src/backend` and runs `node index.js`, allowing dotenv to load that directory's `.env`. The frontend command runs Create React App on port 3000, binding to `0.0.0.0`. There is no backend watch/restart script; restart the backend after changing its code.

Open `http://localhost:3000` and verify:

```bash
curl --fail http://localhost:5000/api/health
```

Check backend logs for `MongoDB connected`, then log in and load a database-backed page. The health response only proves Express is responding, not that MongoDB or email works.

Use `localhost` for local browser testing. The shared API client treats any hostname other than `localhost`, including `127.0.0.1` and LAN addresses, as production and can send requests to the production backend. Other frontend pages use different environment checks, creating mixed behavior.

### Build before release

From the repository root:

```bash
npm run build
git diff --check
git status --short
```

The output is root `build/`. There is no frontend package in `src/frontend/`. `npm start` and `npm run dev` are development commands, not the Render Static Site deployment process. A production build currently embeds the production API address, so testing that build can contact production even on a developer machine.

There is a root `npm test` command, but no dedicated test files were found in the reviewed source, and the backend has no test script. Do not treat the existence of that command as a passing release suite.

## 3. Database preparation and maintenance

For the existing deployment, first identify the provider, project/cluster, database name, owner, and backup policy from the backend's configured URI and the database dashboard. Do not create a replacement database simply because these details are missing from the repository.

For a new environment:

1. Provision a MongoDB database, separate from production for development or staging.
2. Create an application database user with access limited to the intended database.
3. Configure database network access so the backend service and authorized developer connections can reach it. Obtain the service's outbound connection details from Render; verify the provider's access rules.
4. Obtain the MongoDB connection string with an explicit database name. Store it as backend `MONGODB_URI`, not in frontend configuration or Git.
5. Deploy/start the backend, confirm the MongoDB connection log, and verify a database-backed application operation using a controlled account.
6. Confirm backup availability, retention, restore ownership, and a tested restoration procedure before relying on the environment for real evaluations.

The application uses Mongoose models, not SQL schema deployment. Installing packages or deploying JavaScript does not migrate existing documents. The connection priority in `src/backend/index.js` is `MONGODB_URI`, then `MONGO_URI`, then a localhost fallback.

**Existing migration is not ready to run:** `src/backend/migrations/migrateCourses.js` attempts to call `connectDB()` imported from `config/db.js`, but that file contains only a placeholder comment. Running `node migrations/migrateCourses.js` from the backend directory will therefore fail at that call. It also lacks a complete migration history/rollback mechanism. Repair and test the connection, environment loading, migration results, and error exit handling against a restored database copy before defining a production migration command.

Do not run the scripts under `src/backend/scripts/` as a deployment step. They use inconsistent URI variables/database names; some hardcode localhost. `generateTestData.js` deletes existing course/student/team data for its target, and `createITManagementTeams.js` deletes students and teams for its target course. These are data utilities, not a safe release migration system.

## 4. Backend deployment on Render

The repository's existing backend commands are compatible with a service whose root is the repository root. Render supports connecting a Git repository to a Node Web Service and configuring its build and start commands. See [Render's Express deployment instructions](https://render.com/docs/deploy-node-express-app).

### Service configuration

1. Open the existing backend service in Render, or create **New → Web Service** for a new environment and connect the repository.
2. Confirm the intended deployment branch; the repository does not establish its name or the dashboard's auto-deploy setting.
3. Use this configuration consistently:

| Setting | Value |
| --- | --- |
| Service type/runtime | Web Service / Node |
| Root directory | Repository root; leave the field blank |
| Build command | `cd src/backend && npm install` |
| Start command | `cd src/backend && node index.js` |
| Health check path | `/api/health` — HTTP liveness only |

If an existing service instead sets Root Directory to `src/backend`, use `npm install` and `node index.js` without the directory prefix. Do not combine the subdirectory root with `cd src/backend`.

### Backend environment variables

Set these in the backend service's Environment settings, using the actual deployment values:

| Variable | Purpose / required handling |
| --- | --- |
| `MONGODB_URI` | Production MongoDB connection string, including the intended database. Required operationally even though code has a local fallback. |
| `JWT_SECRET` | Strong, environment-specific signing secret. Required operationally; otherwise code uses the fixed `dev_secret_key`. Changing it invalidates tokens signed with the previous secret. |
| `FRONTEND_URL` | Public frontend origin, normally `https://peer-evaluation-frontend.onrender.com`; used in email links. It does not configure CORS. |
| `SMTP_HOST` | SMTP provider hostname when not using `SMTP_SERVICE`. |
| `SMTP_PORT` | Provider's supported SMTP port. The code defaults to 587. |
| `SMTP_SECURE` | `true` for an implicit TLS connection; code also treats port 465 as secure. Match provider configuration. |
| `SMTP_USER`, `SMTP_PASS` | SMTP authentication credentials. |
| `SMTP_FROM` | Sender accepted by the provider. |
| `SMTP_SERVICE` | Optional Nodemailer service preset; when set, code omits the explicit host and port. |
| `NODE_ENV` | Set to `production` for the backend runtime. |
| `PORT` | Use Render's assigned port; `index.js` reads it and falls back to 5000 locally. |

Do not use Compose's `DATABASE_URL`, `JWT_SECRET_KEY`, or `SMTP_SERVER` as substitutes: the active backend does not read them.

**Email plan constraint:** Render currently blocks outbound ports 25, 465, and 587 on Free web services. The old guide's Free Render plus Gmail SMTP procedure therefore cannot be assumed to work. Confirm the actual service plan and network support. Supporting an email provider's HTTPS API would require application changes; adding API credentials alone will not change this SMTP implementation. See [Render Free service limitations](https://render.com/docs/free).

### Execute and verify

1. Push/merge the reviewed code to the service's linked branch. If automatic deployment is enabled, watch the resulting deployment; otherwise use **Manual Deploy → Deploy latest commit**. Record the deployed commit for each service. See [Render deployment controls](https://render.com/docs/deploys).
2. Watch build logs for successful dependency installation and runtime logs for both server startup and MongoDB connection.
3. Check `https://peer-evaluation-backend.onrender.com/api/health` and test authenticated database access through the frontend.
4. Test email with a controlled mailbox, including opening the delivered link. A successful HTTP deployment does not establish SMTP delivery.

The backend starts listening before MongoDB connects and only logs connection failure. A green deployment/health check can therefore coexist with a broken database connection.

## 5. Frontend deployment on Render

1. Open the existing frontend Static Site, or create **New → Static Site** and connect the repository for a new environment.
2. Confirm the deployment branch and use the following settings, derived from the actual root package:

| Setting | Value |
| --- | --- |
| Service type | Static Site |
| Root directory | Repository root; leave the field blank |
| Build command | `npm install && npm run build` |
| Publish directory | `build` |
| Start command | None; Render serves the generated static files |

These correct the `src/frontend` build/publish paths in `DEPLOYMENT_GUIDE.md` and `render-build-info.txt`. Render documents publishing Create React App's `build` directory in its [static deployment guide](https://render.com/docs/deploy-create-react-app).

3. Confirm the backend URL in `src/frontend/services/api.js`, `pages/LoginPage.js`, and `pages/ResetPassword.js`. `CourseManagement.js` also contains fixed frontend/backend addresses. The current code does not read `REACT_APP_API_URL`; setting that variable in Render alone does not redirect API traffic. A different backend hostname requires source changes and a new build.
4. Keep database, SMTP, and JWT secrets exclusively on the backend. Frontend build values can be exposed to browsers.
5. Push/merge to the linked branch and observe automatic deployment, or manually deploy the intended commit. Check logs and verify the resulting frontend with browser developer tools: API requests must reach the intended backend.
6. Verify login, course loading, evaluation entry, and password reset links, including opening links in a fresh browser tab.

### Routing requires specific verification

The active application uses `HashRouter`, so its direct routes have forms such as `/#/evaluate/<token>` and `/#/reset-password/<token>`. Email utilities currently generate `/evaluate/<token>` and `/reset-password/<token>` without the hash.

`public/404.html` attempts to convert path URLs into hash URLs, and `public/_redirects` contains a catch-all rule. Their presence does not establish the live Render routing settings. Render's documented `/*` → `/index.html` rewrite serves the app, but by itself does not convert the pathname into a hash route. If it bypasses the 404 conversion, an email link may open the wrong application page.

Verify delivered links end to end before release. Resolve the mismatch by consistently generating hash-based links or deliberately switching to pathname routing with the corresponding Render rewrite. Treat this as an application/routing change, not just a build setting.

## 6. Release, verification, and recovery procedure

This is a proposed operational checklist based on the current code; no automated release pipeline enforcing it was found.

1. Record the intended commit, Render service branches/settings, database target, environment changes, and previous working deployment for both services. Keep credentials out of release notes.
2. Install dependencies, build locally, and exercise affected flows against a development database. Review any changed data models separately from application code.
3. If data changes are required, first back up and rehearse the migration and restoration. There is currently no ready production migration command.
4. Deploy a backward-compatible backend first, then the frontend. Coordinate a maintenance window if the API or data changes cannot support the previous frontend during rollout.
5. Verify the release using controlled accounts/data:
   - API health responds and database connection succeeds.
   - Professor login and course listing work.
   - A controlled course/roster/team flow can write and read data.
   - An invitation reaches a test mailbox; its link opens the intended evaluation.
   - A test evaluation can be submitted and reflected in reports.
   - Password reset email and its delivered link work.
   - Browser requests show the correct API origin and no CORS errors.
6. Record outcomes and deployed commits separately for frontend and backend; observe runtime errors and email failures after deployment.
7. If verification fails, stop further rollout and restore the recorded working application version using available Render rollback controls or a reviewed Git revert and redeploy. Recheck environment settings as a separate recovery step. Application rollback does not undo MongoDB document changes; database recovery needs the separately tested restore/forward-fix procedure.

## 7. Gaps and required follow-up

Priorities below are review recommendations, not already implemented fixes.

| Priority | Observed gap and evidence | Impact and follow-up |
| --- | --- | --- |
| High | Frontend deployment paths in `DEPLOYMENT_GUIDE.md` and `render-build-info.txt` disagree with root `package.json`. | Can publish the wrong/missing output. Apply the root build settings in section 5 and reconcile older instructions. |
| High | `src/backend/.env` and `render-env-variables.txt` are tracked; `.gitignore` only contains `node_modules`. Values were not audited or reproduced here. | Configuration can enter repository history. Audit for real credentials, rotate any exposed values, remove secret files from tracking, and keep sanitized examples. |
| High | Auth controller and middleware fall back to `dev_secret_key`; `.env.example` omits `JWT_SECRET`. | A deployment can start with a predictable signing secret. Require the variable at startup and document it in the template. |
| High | Existing documentation proposes Free Render with SMTP; email code uses SMTP. | Free-service port restrictions can prevent invitations and resets. Verify the actual plan and choose supported transport/hosting. |
| High | `HashRouter` and emailed pathname URLs disagree. | Delivered invitation/reset links can open the wrong page. Align routing and link generation and test fresh-tab navigation. |
| High | Migration imports an unimplemented `config/db.js`; utilities target inconsistent databases and some delete data. | No dependable production schema/data upgrade process. Implement and rehearse a migration runner, explicit database selection, error handling, and recovery. |
| High | No repository-backed backup schedule, retention, restore exercise, or recovery owner was found. | Database recovery capability is unknown. Verify provider settings and record/test the procedure. This does not prove backups are absent in the provider. |
| High | `emailUtils.js` sets TLS `rejectUnauthorized: false`. | SMTP certificate verification is disabled. Restore certificate validation and resolve provider trust/configuration problems. |
| Medium | API origins are hardcoded across frontend files; non-`localhost` development hosts can select production. | Staging/custom domains and safe local testing are unreliable. Centralize API configuration and test environment selection. |
| Medium | CORS in `index.js` permits any matching `.onrender.com` origin; `FRONTEND_URL` does not control it. | Origin policy is broader than the named frontend and custom domains require code edits. Use an explicit environment-specific allowlist. |
| Medium | Health endpoint ignores MongoDB/SMTP; startup continues after a DB connection failure. | Deployment success can hide an unusable service. Add database readiness and required-configuration checks. |
| Medium | No tracked Render Blueprint or CI workflow was found. Branch, plan, Node version, auto-deploy, and ownership are not established in repository configuration. | Releases depend on dashboard knowledge. Record actual settings and owners, pin the runtime, and add reproducible service configuration. |
| Medium | Both lockfiles exist, but setup still uses `npm install`. The redundant backend `postinstall` was removed; `npm run setup` installs both packages once. | Validate lockfiles with `npm ci` for each package before changing release commands. |
| Medium | Focused backend email tests are available through `npm test --prefix src/backend`; broader smoke/integration coverage is not established. `test_api.js` targets localhost with a fixed evaluation token. | Add tests using isolated fixtures and release gates for the critical flows above. Email tests do not verify live SMTP delivery. |
| Medium | `docker-compose.yml` specifies PostgreSQL, mismatched variable names, and build directories with no checked-in Dockerfiles. | Compose is not a runnable deployment path for this application. Replace it with a tested MongoDB/Node/React setup or mark it obsolete. |
| Medium | Request logging includes full URLs; frontend logging includes token previews. | Evaluation/reset identifiers or token fragments can appear in logs. Redact sensitive paths and remove token logging before production use. |
| Medium | Monitoring, alert ownership, rollback rehearsal, and staging isolation are not established by repository evidence. | Failures and recovery depend on manual discovery. Record dashboard/provider controls and rehearse the release checklist. |

## 8. Information still needed from deployment owners

Record these without including secret values:

- Actual Render frontend/backend service IDs, owners, regions, plans, deployment branches, build filters, auto-deploy policies, runtime version, and last working commits.
- Actual MongoDB provider, cluster/database name, network access policy, credential owner, backup/restore settings, and separation between development and production.
- SMTP provider, verified sender, service-plan network compatibility, credential owner, and evidence of invitation/reset delivery from the deployed backend.
- Current Render redirect/rewrite settings and the observed behavior of emailed evaluation/reset URLs.
- Release approver/operator, incident contact, monitoring destinations, and tested application/database recovery steps.

## Repository references

- [Root scripts and dependencies](../package.json)
- [Backend package](../src/backend/package.json) and [server startup/CORS/health](../src/backend/index.js)
- [Frontend API selection](../src/frontend/services/api.js) and [router](../src/frontend/App.js)
- [Email transport and links](../src/backend/utils/emailUtils.js)
- [Environment template](../src/backend/.env.example)
- [Course migration](../src/backend/migrations/migrateCourses.js) and [placeholder database helper](../src/backend/config/db.js)
- [Existing deployment guide](../DEPLOYMENT_GUIDE.md), [Render build notes](../render-build-info.txt), and [Compose configuration](../docker-compose.yml)

Provider documentation was checked on the review date. Dashboard-specific settings and real deployment outcomes remain unverified.
