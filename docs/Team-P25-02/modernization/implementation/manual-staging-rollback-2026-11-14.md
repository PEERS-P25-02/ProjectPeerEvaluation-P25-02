# Manual staging rollback — implementation record

## Approved scope

Issue [#169](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/issues/169) covers staging-only restoration to a selected verified-success image pair. The requester approved the local Stage 01 requirements and Stage 02 plan after [PR #187](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/pull/187) removed selective CD. This branch adds a manual dispatch workflow and coordinates it with the automatic CD workflow. Automatic CD remains enabled; there is no deployment hold or automatic reversal.

The workflow reads an annotated `staging-success/cd-*` or `staging-success/rollback-*` tag as data. It validates the versioned manifest, exact GHCR digests, configured staging service identity, and busy state before any Render mutation. It redeploys backend then frontend by digest, requires new Render deploy IDs to become `live` on those digests, checks backend health, and runs the three current staging smoke tests. Only a fully verified rollback appends one non-force `staging-success/rollback-*` tag. It does not read or move the retired `staging-last-success` marker.

## Coordination and limits

CD and rollback share the `cd-staging-images` Actions group with `cancel-in-progress: false` and `queue: max`. A read-only rollback preflight and a locked recheck reject observed CD/Render activity; the locked check also rejects a CD run completed since rollback dispatch. CD skips a run that overlaps a completed rollback mutation job before its first Render request. Actions still has a preflight-to-queue gap and does not guarantee immediate API visibility. `queue: max` permits at most 100 pending runs. An external Render deployment is outside the Actions group. A later eligible CD run can replace restored images.

Tag writes are non-force and verified against the remote object ID, but GitHub currently has no tag ruleset preventing a privileged writer from editing or deleting a history tag. A selected tag's earlier smoke success does not guarantee that its images remain available or that current MongoDB Atlas data and external settings are compatible. A partial failure leaves any already restored images in place for investigation; no success tag is written.

## Validation and hosted status

The CI policy test command, staging guard tests, ESLint, JavaScript/CJS Prettier check, and `git diff --check` passed locally. Prettier parsed the edited workflow YAML; the existing CD and CI YAML do not match its formatting convention, so no unrelated workflow reformat was applied. Focused mocks cover tag validation and append-only writing, Render request ordering and retries, busy-state/overlap decisions, and evidence redaction. These are local checks and do not prove live Render or GHCR behavior.

This branch has not been merged, dispatched, or rehearsed against hosted staging. A post-merge rehearsal with synthetic data is required to close the hosted acceptance cases.
