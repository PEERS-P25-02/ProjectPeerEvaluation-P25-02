const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { REQUIRED_SMOKE_CHECKS } = require('../tests/staging/safe-evidence.cjs');
const {
  buildManifest,
  currentImageFromDeploys,
  driftDecision,
  imageRef,
  listCurrentImage,
  parseAnnotatedMarker,
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
  const tag = `object ${sha}\ntype commit\ntag staging-last-success\n\n${JSON.stringify(value)}\n`;
  assert.deepEqual(parseAnnotatedMarker(tag), value);
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

test('marker parsing rejects lightweight or malformed tag objects', () => {
  assert.throws(() => parseAnnotatedMarker(sha));
  assert.throws(() =>
    parseAnnotatedMarker(`object ${sha}\ntype commit\ntag x\n\nnot-json`),
  );
});

test('drift check skips only exact current digest pair and deploys on drift or invalid manifest', () => {
  const manifest = buildManifest(deployment(), smoke(), identity);
  assert.deepEqual(
    driftDecision(
      manifest,
      manifest.backend_image,
      manifest.frontend_image,
      manifest.backend_service_id,
      manifest.frontend_service_id,
    ),
    { deploy: false, reason: 'baseline-images-current' },
  );
  assert.equal(
    driftDecision(manifest, digest('backend', 'd'), manifest.frontend_image)
      .deploy,
    true,
  );
  assert.equal(
    driftDecision(
      manifest,
      manifest.backend_image,
      manifest.frontend_image,
      'srv-other',
      manifest.frontend_service_id,
    ).deploy,
    true,
  );
  assert.equal(
    driftDecision(
      manifest,
      manifest.backend_image,
      manifest.frontend_image,
      manifest.backend_service_id,
      manifest.backend_service_id,
    ).deploy,
    true,
  );
  assert.equal(
    driftDecision({}, manifest.backend_image, manifest.frontend_image).deploy,
    true,
  );
  assert.equal(
    imageRef(digest('backend', 'b').replace('.io/', 'xio/'), 'backend'),
    false,
  );
});

test('Render state requires one unambiguous live image and no active deploy', () => {
  const current = {
    cursor: 'cursor-1',
    deploy: {
      id: 'dep-1',
      status: 'live',
      image: { ref: digest('backend', 'b') },
    },
  };
  assert.equal(
    currentImageFromDeploys([current.deploy]),
    digest('backend', 'b'),
  );
  assert.throws(() =>
    currentImageFromDeploys([
      { ...current.deploy, status: 'update_in_progress' },
      current.deploy,
    ]),
  );
  assert.throws(() =>
    currentImageFromDeploys([
      current.deploy,
      { ...current.deploy, id: 'dep-2' },
    ]),
  );
  assert.throws(() => currentImageFromDeploys([]));
});

test('Render lookup follows cursors and fails closed on API or pagination uncertainty', async () => {
  const seen = [];
  const response = (rows) => ({ ok: true, json: async () => rows });
  const fetcher = async (url) => {
    seen.push(url.searchParams.get('cursor'));
    return response(
      seen.length === 1
        ? Array.from({ length: 100 }, (_, index) => ({
            cursor: `c${index}`,
            deploy: { id: `dep-${index}`, status: 'deactivated' },
          }))
        : [
            {
              cursor: 'end',
              deploy: {
                id: 'dep-last',
                status: 'live',
                image: { ref: digest('backend', 'b') },
              },
            },
          ],
    );
  };
  assert.equal(
    await listCurrentImage('srv-backend1', 'synthetic-key', fetcher),
    digest('backend', 'b'),
  );
  assert.deepEqual(seen, [null, 'c99']);
  await assert.rejects(() =>
    listCurrentImage('srv-backend1', 'synthetic-key', async () => ({
      ok: false,
    })),
  );
  await assert.rejects(() =>
    listCurrentImage('srv-backend1', 'synthetic-key', async () =>
      response(
        Array(100).fill({ cursor: 'same', deploy: { status: 'deactivated' } }),
      ),
    ),
  );
});

test('CD workflow wires same-run artifacts, drift guard, final decision and atomic refs', () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, '../.github/workflows/cd.yml'),
    'utf8',
  );
  for (const expected of [
    'actions/download-artifact@v7.0.0',
    'staging-deployment-$' +
      '{{ env.SOURCE_SHA }}-$' +
      '{{ github.run_id }}-$' +
      '{{ github.run_attempt }}',
    'staging-smoke-$' +
      '{{ env.SOURCE_SHA }}-$' +
      '{{ github.run_id }}-$' +
      '{{ github.run_attempt }}',
    'node scripts/stagingHistory.cjs drift',
    'steps.final-decision.outputs.deploy',
    'git push --atomic',
    '--force-with-lease=refs/tags/staging-last-success:$old_marker',
    'refs/tags/$HISTORY_TAG',
    'Verified staging success history',
  ])
    assert.ok(workflow.includes(expected), expected);
  assert.ok(!workflow.includes('refs/tags/staging-last-success" --force'));
});

test('atomic Git push updates history and leased marker together or updates neither', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'staging-history-'));
  const bare = path.join(root, 'remote.git');
  const work = path.join(root, 'work');
  const run = (cwd, args, options = {}) =>
    execFileSync('git', args, { cwd, ...options });
  try {
    run(root, ['init', '--bare', '--quiet', bare]);
    run(root, ['init', '--quiet', work]);
    run(work, ['config', 'user.name', 'Synthetic Test']);
    run(work, ['config', 'user.email', 'test@example.invalid']);
    fs.writeFileSync(path.join(work, 'file'), 'one');
    run(work, ['add', 'file']);
    run(work, ['commit', '--quiet', '-m', 'one']);
    const first = run(work, ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    run(work, ['tag', '-a', 'staging-last-success', first, '-m', 'old marker']);
    const old = run(work, ['rev-parse', 'refs/tags/staging-last-success'], {
      encoding: 'utf8',
    }).trim();
    run(work, ['push', '--atomic', bare, 'refs/tags/staging-last-success']);
    run(work, ['tag', '-a', 'staging-success/cd-1-1', first, '-m', '{}']);
    run(work, [
      'tag',
      '-f',
      '-a',
      'staging-last-success',
      first,
      '-m',
      '{"schema_version":1}',
    ]);
    run(work, [
      'push',
      '--atomic',
      `--force-with-lease=refs/tags/staging-last-success:${old}`,
      bare,
      'refs/tags/staging-success/cd-1-1',
      'refs/tags/staging-last-success',
    ]);
    assert.ok(
      run(bare, ['show-ref', '--verify', 'refs/tags/staging-success/cd-1-1'], {
        encoding: 'utf8',
      }),
    );
    const stableHistory = run(
      bare,
      ['rev-parse', 'refs/tags/staging-success/cd-1-1'],
      { encoding: 'utf8' },
    ).trim();
    const stableMarker = run(
      bare,
      ['rev-parse', 'refs/tags/staging-last-success'],
      { encoding: 'utf8' },
    ).trim();
    fs.writeFileSync(path.join(work, 'file'), 'two');
    run(work, ['add', 'file']);
    run(work, ['commit', '--quiet', '-m', 'two']);
    const second = run(work, ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    run(work, [
      'tag',
      '-f',
      '-a',
      'staging-success/cd-1-1',
      second,
      '-m',
      'duplicate',
    ]);
    run(work, [
      'tag',
      '-f',
      '-a',
      'staging-last-success',
      second,
      '-m',
      'new marker',
    ]);
    assert.throws(() =>
      run(work, [
        'push',
        '--atomic',
        `--force-with-lease=refs/tags/staging-last-success:${stableMarker}`,
        bare,
        'refs/tags/staging-success/cd-1-1',
        'refs/tags/staging-last-success',
      ]),
    );
    assert.equal(
      run(bare, ['rev-parse', 'refs/tags/staging-last-success'], {
        encoding: 'utf8',
      }).trim(),
      stableMarker,
    );
    run(work, [
      'tag',
      '-f',
      '-a',
      'staging-last-success',
      first,
      '-m',
      'new marker',
    ]);
    assert.throws(() =>
      run(work, [
        'push',
        '--atomic',
        '--force-with-lease=refs/tags/staging-last-success:wrong',
        bare,
        'refs/tags/staging-success/cd-2-1',
        'refs/tags/staging-last-success',
      ]),
    );
    assert.equal(
      run(bare, ['rev-parse', 'refs/tags/staging-success/cd-1-1'], {
        encoding: 'utf8',
      }).trim(),
      stableHistory,
    );
    assert.throws(() =>
      run(bare, ['show-ref', '--verify', 'refs/tags/staging-success/cd-2-1']),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
