const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { REQUIRED_SMOKE_CHECKS } = require('../tests/staging/safe-evidence.cjs');
const {
  buildManifest,
  buildRollbackManifest,
  imageRef,
  parseAnnotatedTag,
  validateManifest,
} = require('./stagingHistory.cjs');

const sha = 'a'.repeat(40);
const digest = (kind, letter) =>
  `ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-${kind}@sha256:${letter.repeat(64)}`;
const deployment = () => ({
  source_sha: sha,
  backend_image: digest('backend', 'b'),
  frontend_image: digest('frontend', 'c'),
  backend_service_id: 'srv-backend1',
  frontend_service_id: 'srv-frontend1',
  backend_deploy_id: 'dep-backend1',
  frontend_deploy_id: 'dep-frontend1',
  backend_status: 'live',
  frontend_status: 'live',
  backend_health: { http_status: 200, status: 'OK' },
  result: 'success',
});
const smoke = () => ({
  source_sha: sha,
  backend_image: digest('backend', 'b'),
  frontend_image: digest('frontend', 'c'),
  smoke_outcome: 'success',
  validation_result: 'success',
  checks: REQUIRED_SMOKE_CHECKS.map((name) => ({ name, status: 'passed' })),
});
const identity = {
  sourceSha: sha,
  backendImage: digest('backend', 'b'),
  frontendImage: digest('frontend', 'c'),
  backendServiceId: 'srv-backend1',
  frontendServiceId: 'srv-frontend1',
  runId: '123',
  runAttempt: '2',
};

test('validates and round-trips a complete versioned manifest', () => {
  const value = buildManifest(deployment(), smoke(), identity);
  assert.equal(validateManifest(value), value);
  const tag = `object ${sha}\ntype commit\ntag staging-success/cd-123-2\n\n${JSON.stringify(value)}\n`;
  assert.deepEqual(parseAnnotatedTag(tag), value);
});

test('builds and parses rollback manifests targeting either history kind', () => {
  const cdTarget = buildManifest(deployment(), smoke(), identity);
  const rollbackDeployment = {
    ...deployment(),
    backend_deploy_id: 'dep-backendnew',
    frontend_deploy_id: 'dep-frontendnew',
  };
  const rollbackIdentity = { ...identity, runId: '456', runAttempt: '1' };
  for (const [targetManifest, targetTag] of [
    [cdTarget, 'staging-success/cd-123-2'],
    [
      buildRollbackManifest(
        rollbackDeployment,
        smoke(),
        rollbackIdentity,
        cdTarget,
        'staging-success/cd-123-2',
      ),
      'staging-success/rollback-456-1',
    ],
  ]) {
    const value = buildRollbackManifest(
      rollbackDeployment,
      smoke(),
      rollbackIdentity,
      targetManifest,
      targetTag,
    );
    assert.equal(value.kind, 'rollback');
    assert.equal(value.target_tag, targetTag);
    assert.equal(
      value.target_backend_deploy_id,
      targetManifest.backend_deploy_id,
    );
    assert.equal(
      value.target_frontend_deploy_id,
      targetManifest.frontend_deploy_id,
    );
    assert.equal(validateManifest(value), value);
    const tag = `object ${sha}\ntype commit\ntag staging-success/rollback-456-1\n\n${JSON.stringify(value)}\n`;
    assert.deepEqual(parseAnnotatedTag(tag), value);
  }
  const wrongName = buildRollbackManifest(
    rollbackDeployment,
    smoke(),
    rollbackIdentity,
    cdTarget,
    'staging-success/cd-123-2',
  );
  wrongName.target_tag = 'bad-tag';
  assert.throws(() => validateManifest(wrongName));
});

test('rejects mismatched SHA, digest, IDs, deployment and smoke evidence', () => {
  for (const mutate of [
    (d) => {
      d.source_sha = 'd'.repeat(40);
    },
    (d) => {
      d.backend_image = digest('backend', 'd');
    },
    (d) => {
      d.backend_service_id = 'bad';
    },
    (d) => {
      d.backend_service_id = d.frontend_service_id;
    },
    (d) => {
      d.frontend_deploy_id = 'bad';
    },
    (d) => {
      d.frontend_status = 'building';
    },
  ]) {
    const value = deployment();
    mutate(value);
    assert.throws(() => buildManifest(value, smoke(), identity));
  }
  const badSmoke = smoke();
  badSmoke.checks[0].status = 'failed';
  assert.throws(() => buildManifest(deployment(), badSmoke, identity));
  const extra = smoke();
  extra.checks.push({ name: 'extra', status: 'passed' });
  assert.throws(() => buildManifest(deployment(), extra, identity));
  const duplicateServices = buildManifest(deployment(), smoke(), identity);
  duplicateServices.frontend_service_id = duplicateServices.backend_service_id;
  assert.throws(() => validateManifest(duplicateServices));
});

test('annotated tag parsing rejects lightweight or malformed tag objects', () => {
  assert.throws(() => parseAnnotatedTag(sha));
  assert.throws(() =>
    parseAnnotatedTag(`object ${sha}\ntype commit\ntag x\n\nnot-json`),
  );
});

test('CD publishes both images for every eligible current main merge', () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, '../.github/workflows/cd.yml'),
    'utf8',
  );
  assert.match(workflow, /jobs:\n {2}publish-staging-images:/);
  for (const guard of [
    "conclusion == 'success'",
    "event == 'push'",
    "head_branch == 'main'",
    'repository.full_name == github.repository',
    'main_tip" != "$CI_CANDIDATE_SHA',
    'parent_count" != 2',
    'cancel-in-progress: false',
  ])
    assert.ok(workflow.includes(guard), guard);
  const publication = workflow.indexOf('docker/login-action');
  assert.ok(workflow.indexOf('parent_count" != 2') < publication);
  assert.equal(
    (workflow.match(/uses: docker\/build-push-action@/g) || []).length,
    2,
  );
  for (const expected of [
    'steps.frontend.outputs.digest',
    'steps.backend.outputs.digest',
    'node scripts/deployStaging.cjs',
    'playwright.staging.config.cjs',
    'node scripts/writeStagingSmokeEvidence.cjs',
    'if-no-files-found: error',
  ])
    assert.ok(workflow.includes(expected), expected);
  for (const obsolete of [
    'decide-staging',
    'decideStaging',
    'staging-last-success',
    'baseline',
    'drift',
    '--atomic',
    '--force',
    'git diff',
  ])
    assert.ok(!workflow.includes(obsolete), obsolete);
  const deploy = workflow
    .split('  deploy-staging:')[1]
    .split('  validate-staging-smoke:')[0];
  assert.match(deploy, /needs: publish-staging-images/);
  assert.ok(
    deploy.includes("needs.publish-staging-images.result == 'success'"),
  );
  const smokeJob = workflow
    .split('  validate-staging-smoke:')[1]
    .split('  record-staging-success:')[0];
  assert.ok(smokeJob.includes("needs.deploy-staging.result == 'success'"));
  const record = workflow.split('  record-staging-success:')[1];
  for (const job of [
    'publish-staging-images',
    'deploy-staging',
    'validate-staging-smoke',
  ])
    assert.ok(record.includes(`needs.${job}.result == 'success'`));
  for (const artifact of ['staging-deployment', 'staging-smoke'])
    assert.ok(
      record.includes(
        `${artifact}-` +
          '$' +
          '{{ env.SOURCE_SHA }}-$' +
          '{{ github.run_id }}-$' +
          '{{ github.run_attempt }}',
      ),
    );
  assert.ok(
    record.indexOf('node scripts/stagingHistory.cjs manifest') <
      record.indexOf('git tag -a'),
  );
  assert.ok(
    record.indexOf('git ls-remote --refs origin') <
      record.indexOf('git tag -a'),
  );
  assert.match(record, /git push origin "refs\/tags\/\$HISTORY_TAG"/);
  assert.ok(
    record.indexOf('test "$history_object" = "$(git rev-parse') <
      record.indexOf('### Verified staging success history'),
  );
  assert.ok(
    !fs
      .readFileSync(path.join(__dirname, '../.github/workflows/ci.yml'), 'utf8')
      .includes('decideStaging'),
  );
});

test('missing, duplicate or unsuccessful smoke checks cannot create a manifest', () => {
  for (const checks of [
    [],
    smoke().checks.slice(1),
    [smoke().checks[0], smoke().checks[0], smoke().checks[2]],
  ])
    assert.throws(() =>
      buildManifest(deployment(), { ...smoke(), checks }, identity),
    );
  for (const changes of [
    { validation_result: 'failed' },
    { smoke_outcome: 'failure' },
    { source_sha: 'f'.repeat(40) },
    { frontend_image: digest('frontend', 'f') },
  ])
    assert.throws(() =>
      buildManifest(deployment(), { ...smoke(), ...changes }, identity),
    );
  assert.throws(() =>
    buildManifest(
      { ...deployment(), backend_health: { http_status: 503, status: 'OK' } },
      smoke(),
      identity,
    ),
  );
  assert.equal(
    imageRef(digest('backend', 'b').replace('.io/', 'xio/'), 'backend'),
    false,
  );
});

test('single annotated history push verifies its exact object and rejects duplicate writers', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'staging-history-'));
  const bare = path.join(root, 'remote.git');
  const work = path.join(root, 'work');
  const run = (cwd, args) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const tag = 'staging-success/cd-123-2';
  const ref = `refs/tags/${tag}`;
  try {
    run(root, ['init', '--bare', '--quiet', bare]);
    run(root, ['init', '--quiet', work]);
    run(work, ['config', 'user.name', 'Synthetic Test']);
    run(work, ['config', 'user.email', 'test@example.invalid']);
    fs.writeFileSync(path.join(work, 'file'), 'synthetic');
    run(work, ['add', 'file']);
    run(work, ['commit', '--quiet', '-m', 'synthetic']);
    assert.equal(run(work, ['ls-remote', '--refs', bare, ref]), '');
    const sourceSha = run(work, ['rev-parse', 'HEAD']);
    const manifest = buildManifest(
      { ...deployment(), source_sha: sourceSha },
      { ...smoke(), source_sha: sourceSha },
      { ...identity, sourceSha },
    );
    run(work, ['tag', '-a', tag, '-m', JSON.stringify(manifest)]);
    run(work, ['push', bare, ref]);
    const object = run(work, ['rev-parse', ref]);
    assert.equal(
      run(work, ['ls-remote', '--refs', bare, ref]).split(/\s+/)[0],
      object,
    );
    assert.deepEqual(
      parseAnnotatedTag(run(bare, ['cat-file', '-p', object])),
      manifest,
    );
    // Simulate another writer winning after the remote absence check.
    run(work, ['tag', '-f', '-a', tag, '-m', 'duplicate writer']);
    assert.throws(() => run(work, ['push', bare, ref]));
    assert.equal(run(bare, ['rev-parse', ref]), object);
    assert.equal(
      run(bare, ['for-each-ref', '--format=%(refname)', 'refs/tags']),
      ref,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
