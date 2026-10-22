# Compose Workflow Validation

[Back to containerization assessment](README.md)

Issue #27 documents the local four-service workflow supplied by issue #26.
This guide is for a clean developer checkout. It uses only local MongoDB and
Mailpit; it does not require Atlas or Mailtrap credentials.

## Prerequisites

- Docker Desktop or Docker Engine with Compose v2.24+
- Node.js and npm versions listed in the repository README
- Ports 3000, 5000, 27017, 1025, and 8025 available on localhost

Do not run the reset command against a shared or staging Docker project.

## Start and inspect

From the repository root:

```bash
npm run setup
npm run docker:up
npm run docker:ps
```

Expected healthy services are `frontend`, `backend`, `mongodb`, and
`mailpit`. Open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/api/health
- Mailpit inbox: http://localhost:8025

`docker:up` generates or preserves the local JWT secret, builds the
application images, waits for health checks, and configures the backend with
the Compose service hostnames `mongodb` and `mailpit`. Mail is captured
locally by Mailpit; forwarding and relay stay disabled.

## Verification

1. Confirm the health endpoint returns HTTP 200 after the Compose wait
   completes.
2. Use an existing supported application email flow with invented data.
   Check the recipient, message content, and link in Mailpit. Do not use real
   student data or external recipients.
3. Confirm application data is present in MongoDB.
4. Run `npm run docker:down`, then `npm run docker:up`, and confirm the
   same data remains. Normal shutdown preserves the named `mongodb_data`
   volume.
5. Save the actual command output and results in the pull request before
   marking this issue complete. A second teammate should repeat the steps from
   a clean checkout.

## Logs and cleanup

```bash
npm run docker:logs
npm run docker:down
```

`docker:down` removes containers and the network but retains development
data. To reset only this local project's database after explicit confirmation:

```bash
docker compose down --volumes
```

This permanently removes the named MongoDB volume for the current Compose
project. It must not be used for staging, shared environments, or another
developer's project.

## Troubleshooting

- If startup reports a used port, stop the conflicting native service or
  container, then rerun `npm run docker:up`.
- If a service is unhealthy, run `npm run docker:ps` and
  `npm run docker:logs`; backend health requires MongoDB connectivity.
- Source changes require a rebuild: rerun `npm run docker:up`.
- For CI, use an isolated runner, an ephemeral `JWT_SECRET`, a unique
  Compose project name, and `docker compose -p <name> down --volumes`
  during cleanup.
