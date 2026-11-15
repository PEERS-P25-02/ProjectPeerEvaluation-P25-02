# Manual staging rollback — implementation record

## Approved scope

Issue [#169](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/issues/169) covers staging-only restoration to a selected verified-success image pair. The requester approved the local Stage 01 requirements and Stage 02 plan after [PR #187](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/pull/187) removed selective CD. This branch adds a manual dispatch workflow and coordinates it with the automatic CD workflow. Automatic CD remains enabled; there is no deployment hold or automatic reversal.

The workflow reads an annotated `staging-success/cd-*` or `staging-success/rollback-*` tag as data. It validates the versioned manifest, exact GHCR digests, configured staging service identity, and busy state before any Render mutation. It redeploys backend then frontend by digest, requires new Render deploy IDs to become `live` on those digests, checks backend health, and runs the three current staging smoke tests. Only a fully verified rollback appends one non-force `staging-success/rollback-*` tag. It does not read or move the retired `staging-last-success` marker.

## Coordination and limits

CD and rollback share the `cd-staging-images` Actions group with `cancel-in-progress: false` and `queue: max`. Read-only preflight rejects invalid dispatch/tag data; the rollback mutation job may wait behind a running CD. Once admitted, it checks configured Render service identity and active/queued deploy status before mutation. A CD queued during rollback may deploy immediately after it and replace the restored images; the requester explicitly accepted that another rollback may then be necessary. `queue: max` permits at most 100 pending runs and orders by time waiting, so dispatch order is not guaranteed. An external Render deployment is outside the Actions group.

Tag writes are non-force and verified against the remote object ID, but GitHub currently has no tag ruleset preventing a privileged writer from editing or deleting a history tag. A selected tag's earlier smoke success does not guarantee that its images remain available or that current MongoDB Atlas data and external settings are compatible. A partial failure leaves any already restored images in place for investigation; no success tag is written.

## Validation and hosted status

On the 2026-11-15 simplification revision, the ten-file CI policy test command, staging guard tests, ESLint, JavaScript/CJS Prettier check, YAML parsing, local documentation-link check, and `git diff --check` passed. Focused mocks cover tag validation and append-only writing, ordered Render restoration and retry limits, filtered active-deploy checks, shared workflow-group contract, and evidence redaction. These local checks do not prove live Render or GHCR behavior.

This branch has not been merged, dispatched, or rehearsed against hosted staging. A post-merge rehearsal with synthetic data is required to close the hosted acceptance cases.
