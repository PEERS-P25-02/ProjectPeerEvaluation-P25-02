# Staging CD simplification — 2026-11-14

This is a dated implementation record. The current workflow checks the
two-parent condition before publication; the deployment helper repeats the
current-main check before each service request, not the parent-count check.
See the [current CI/CD guide](../../ci-cd.md).

## Decision and scope

The approved change replaces selective staging deployment with unconditional deployment for every eligible, successful CI push run for this repository's current two-parent `main` merge commit. Both staging images are published and both services are deployed for every such run, including documentation-only and test-only changes. Unsuccessful, foreign, non-push, non-main, stale, or non-merge evidence must not initiate deployment. Current-main and two-parent checks remain before image publication and in the deployment helper.

The change removes the path classifier, exclusion list, baseline comparison, Render drift check, and decision job. It does not introduce a deployment hold. A later eligible automatic CD run may replace a manually restored version. Rollback coordination and restoration remain separate work under [issue #169](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/issues/169).

## Preserved deployment and success-history contract

The publication job retains exact image digest outputs and the source-SHA image tags. Deployment uses those digests, deploys the backend first, waits for its exact digest to reach `live`, and requires backend health HTTP 200 with `status: OK` before starting the frontend deployment. The frontend must then reach `live` on its exact digest. Existing timeouts, artifacts, staging secrets, and error reporting remain in force.

After both deployments, the same-run deployment and smoke artifacts must validate, and the existing three smoke checks must each pass: backend health/MongoDB connectivity, rendered frontend login rejection, and loading the unsubmitted synthetic evaluation. Only then does CD append one annotated `staging-success/cd-<run-id>-<attempt>` tag with the version-1 manifest: source SHA, exact image digests, service and deploy IDs, run identity, and the three passed check names. The verified remote tag is surfaced prominently in the Actions summary. Failed or incomplete runs create no tag, and an existing history tag is never overwritten.

`staging-last-success` is retired from active CD. It remains on the remote and is neither read, moved, nor deleted by this change. Preserve the manual backfill procedure in the [continuous-delivery guide](../../staging-operations.md#one-time-historical-backfill): verify the deployment and smoke artifacts from the same historical run and attempt, validate their matching SHA, digests, IDs, and checks, then append only the matching annotated history tag without force. Do not infer a success from the old baseline SHA or update the retired baseline during backfill.

## Changed paths and local verification

The cleanup changes `.github/workflows/cd.yml`, removes the deleted helper's filename from `.github/workflows/ci.yml`, deletes `scripts/decideStaging.cjs` and its test, removes the drift-only code from `scripts/stagingHistory.cjs`, updates its manifest/Git/workflow tests, and corrects the staging configuration test's job dependency. It updates the active continuous-delivery guide, FR-21, AC-05, MW-04, the RTM, and the staging-smoke record. Dated historical implementation records remain evidence of their earlier workflow versions.

On the isolated cleanup worktree, `npm run lint`, `npm run format:check`, and `npm run test:staging:guard` passed. The CI policy command in `.github/workflows/ci.yml` passed all seven test files, and `node --test scripts/deployStaging.test.cjs` passed. The history suite passed six focused tests, including manifest rejection, workflow gates, and a disposable bare-Git non-force duplicate-tag rejection. Prettier parsed and checked both edited workflow YAML files; PyYAML also parsed both and found the four expected CD jobs. `git diff --check` passed. These are local source, synthetic Git, and contract checks; they do not exercise GHCR, Render, GitHub-hosted workflow execution, or a live tag write.

The code/workflow/test diff removes 857 lines and adds 164, a net reduction of 693 lines. The new dated record and documentation edits are excluded from that code count.

## Hosted evidence status

The prior [CD run 43533681946](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43533681946) and its [deployment artifact](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43533681946/artifacts/14089056179) and [smoke artifact](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/actions/runs/43533681946/artifacts/14088562649) document a successful deployment and all three smoke checks under the earlier workflow. They do not verify unconditional deployment, the new history-only tag write, or revised failure handling. Hosted confirmation of the revised behavior requires a later eligible successful CD run.

Workflow-created tags are append-only by workflow convention, not protected against deletion or modification by privileged writers unless a repository tag ruleset is configured.
