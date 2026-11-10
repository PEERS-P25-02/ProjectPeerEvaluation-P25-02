const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const script = path.join(__dirname, 'deployStaging.sh');
const sha = 'a'.repeat(40);
const backendRef = `ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-backend@sha256:${'b'.repeat(64)}`;
const frontendRef = `ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-frontend@sha256:${'c'.repeat(64)}`;

function runScenario({
  hookStatus = 200,
  backendStatus = 'live',
  frontendStatus = 'live',
  backendImage = backendRef,
  frontendImage = frontendRef,
  staleBeforeFrontend = false,
  returnedDeployId = 'dep-hook',
  requestedFrontendRef = frontendRef,
  frontendServiceId = 'srv-frontend',
  backendServiceId = 'srv-backend',
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-staging-test-'));
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  const calls = path.join(root, 'calls');
  fs.writeFileSync(
    path.join(bin, 'git'),
    `#!/usr/bin/env bash
printf 'tip\\n' >> '${calls}.git'
count=$(wc -l < '${calls}.git')
if [[ '${staleBeforeFrontend}' == true && $count -ge 2 ]]; then printf '%040d refs/heads/main\\n' 9; else printf '${sha} refs/heads/main\\n'; fi
`,
  );
  fs.writeFileSync(
    path.join(bin, 'curl'),
    `#!/usr/bin/env bash
out=''; url=''; image=''
while (($#)); do
  case "$1" in
    --output) out="$2"; shift 2 ;;
    --connect-timeout|--max-time) shift 2 ;;
    --write-out) shift 2 ;;
    --data-urlencode) image="$2"; shift 2 ;;
    --get|--silent|--show-error) shift ;;
    --header) shift 2 ;;
    *) url="$1"; shift ;;
  esac
done
printf '%s\\n%s\\n%s\\n' "$url" "$image" "$out" >> '${calls}.curl'
if [[ "$url" == *"secret-hook"* ]]; then
  printf '{"deploy":{"id":"%s"}}' '${returnedDeployId}' > "$out"
  printf '%s' '${hookStatus}'
elif [[ "$url" == *"dep-hook"* ]]; then
  if [[ "$url" == *"srv-backend"* ]]; then status='${backendStatus}'; ref='${backendImage}'; else status='${frontendStatus}'; ref='${frontendImage}'; fi
  printf '{"status":"%s","image":{"ref":"%s"}}' "$status" "$ref" > "$out"
  printf '200'
else
  exit 9
fi
`,
  );
  for (const name of ['git', 'curl']) fs.chmodSync(path.join(bin, name), 0o755);

  const summary = path.join(root, 'summary.md');
  fs.writeFileSync(summary, '');
  const result = spawnSync('bash', [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      SOURCE_SHA: sha,
      FRONTEND_IMAGE_REF: requestedFrontendRef,
      BACKEND_IMAGE_REF: backendRef,
      RENDER_FRONTEND_DEPLOY_HOOK: 'https://secret-hook/frontend',
      RENDER_BACKEND_DEPLOY_HOOK: 'https://secret-hook/backend',
      RENDER_API_KEY: 'test-api-key',
      RENDER_FRONTEND_SERVICE_ID: frontendServiceId,
      RENDER_BACKEND_SERVICE_ID: backendServiceId,
      GITHUB_STEP_SUMMARY: summary,
      RENDER_POLL_TIMEOUT_SECONDS: '1',
      RENDER_POLL_INTERVAL_SECONDS: '0.01',
    },
  });
  const output = `${result.stdout}${result.stderr}`;
  const summaryText = fs.readFileSync(summary, 'utf8');
  const curlLog = fs.existsSync(`${calls}.curl`)
    ? fs.readFileSync(`${calls}.curl`, 'utf8')
    : '';
  fs.rmSync(root, { recursive: true, force: true });
  return { result, output, summaryText, curlLog };
}

test('deploys backend then frontend and records both verified live results', () => {
  const run = runScenario();
  assert.equal(run.result.status, 0, run.output);
  assert.match(run.summaryText, /Source SHA/);
  assert.match(run.summaryText, /dep-hook.*live/);
  assert.match(run.summaryText, /Backend image:.*backend@sha256/);
  assert.match(run.summaryText, /Frontend image:.*frontend@sha256/);
  assert.doesNotMatch(run.output, /secret-hook|test-api-key/);
  assert.match(run.curlLog, /imgURL=/);
  assert.ok(run.curlLog.indexOf('backend') < run.curlLog.indexOf('frontend'));
});

test('treats a queued HTTP 202 hook response as failure with visible status', () => {
  const run = runScenario({ hookStatus: 202 });
  assert.notEqual(run.result.status, 0);
  assert.match(run.output, /returned 202/);
  assert.match(run.output, /queued/);
  assert.match(
    run.summaryText,
    /Backend service\/deploy\/status: `srv-backend` \/ `not created` \/ `queued \(HTTP 202; inspect\)`/,
  );
  assert.equal((run.curlLog.match(/secret-hook/g) || []).length, 1);
});

test('fails visibly when Render reports a terminal deploy failure', () => {
  const run = runScenario({ backendStatus: 'build_failed' });
  assert.notEqual(run.result.status, 0);
  assert.match(run.output, /terminal status build_failed/);
  assert.match(run.summaryText, /dep-hook.*build_failed/);
  assert.doesNotMatch(run.curlLog, /secret-hook\/frontend/);
});

test('rejects a live deployment whose image digest differs from the requested digest', () => {
  const run = runScenario({
    backendImage: `ghcr.io/peers/backend@sha256:${'d'.repeat(64)}`,
  });
  assert.notEqual(run.result.status, 0);
  assert.match(run.output, /unexpected image reference/);
  assert.match(run.summaryText, /live \(image mismatch\)/);
});

test('rechecks main and stops before the frontend hook when source becomes stale', () => {
  const run = runScenario({ staleBeforeFrontend: true });
  assert.notEqual(run.result.status, 0);
  assert.match(run.output, /no longer the current main tip/);
  assert.match(
    run.summaryText,
    /Backend service\/deploy\/status: `srv-backend` \/ `dep-hook` \/ `live`/,
  );
  assert.doesNotMatch(run.curlLog, /secret-hook\/frontend/);
});

test('rejects image references outside the exact expected frontend repository', () => {
  const run = runScenario({
    requestedFrontendRef: `ghcr.io/other/frontend@sha256:${'c'.repeat(64)}`,
  });
  assert.notEqual(run.result.status, 0);
  assert.match(run.output, /expected immutable GHCR image/);
  assert.equal(run.curlLog, '');
});

test('rejects malformed Render service and deploy IDs before making API requests', () => {
  const serviceRun = runScenario({ backendServiceId: 'bad/service' });
  assert.notEqual(serviceRun.result.status, 0);
  assert.match(serviceRun.output, /service ID must use/);
  assert.equal(serviceRun.curlLog, '');

  const deployRun = runScenario({ returnedDeployId: 'dep-../bad' });
  assert.notEqual(deployRun.result.status, 0);
  assert.match(deployRun.output, /invalid deploy ID/);
  assert.doesNotMatch(deployRun.curlLog, /api\.render\.com/);
});
