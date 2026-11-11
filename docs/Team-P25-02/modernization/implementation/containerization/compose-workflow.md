# Compose Workflow Validation

[Back to containerization assessment](../../plans/containerization/README.md)

This guide documents the local four-service workflow for a clean developer checkout. It uses only local MongoDB and
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
locally by Mailpit; forwarding and relay stay disabled. MongoDB runs as the
single-node `peers-rs` replica set required by submission transactions. Its
health check initializes the set when necessary and waits for a writable
primary before backend startup. Normal down/up preserves the named volume.
The integration and browser-test Compose stacks use the same replica-set
configuration with disposable storage. A native backend connecting through
this stack’s published MongoDB port needs `directConnection=true` because
the replica set advertises `mongodb:27017`; see the
[local development guide](../../../developer-guides/local-development.md).

## Verification procedure

The steps below are checks to perform; they are not a claim that a new
run occurred. See the [development-environment record](../development-environment.md#compose-verification)
for recorded results.

1. Confirm the health endpoint returns HTTP 200 after the Compose wait
   completes.
2. Use an existing supported application email flow with invented data.
   Check the recipient, message content, and link in Mailpit. Do not use real
   student data or external recipients.
3. Confirm application data is present in MongoDB.
4. Run `npm run docker:down`, then `npm run docker:up`, and confirm the
   same data remains. Normal shutdown preserves the named `mongodb_data`
   volume.
5. Retain the command output and results with the verification record. Have
   a second teammate repeat the steps from a clean checkout.

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
