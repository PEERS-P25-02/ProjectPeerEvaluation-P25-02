const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const BACKEND_REPOSITORY =
  'ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-backend';
const FRONTEND_REPOSITORY =
  'ghcr.io/peers-p25-02/projectpeerevaluation-p25-02-frontend';
const API_BASE = 'https://api.render.com/v1';
const HEALTH_URL = 'https://peers-staging-backend.onrender.com/api/health';

function validateInput(input) {
  if (!/^[0-9a-f]{40}$/.test(input.sourceSha || ''))
    throw new Error('Invalid source SHA.');
  for (const [name, ref, repository] of [
    ['backend', input.backendImage, BACKEND_REPOSITORY],
    ['frontend', input.frontendImage, FRONTEND_REPOSITORY],
  ]) {
    if (
      typeof ref !== 'string' ||
      !new RegExp(
        `^${repository.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@sha256:[0-9a-f]{64}$`,
      ).test(ref)
    ) {
      throw new Error(`Invalid ${name} digest reference.`);
    }
  }
  for (const [name, id] of [
    ['backend', input.backendServiceId],
    ['frontend', input.frontendServiceId],
  ]) {
    if (!/^srv-[a-z0-9]+$/.test(id || ''))
      throw new Error(`Invalid ${name} service ID.`);
  }
  if (!input.apiKey) throw new Error('RENDER_API_KEY is missing.');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runDeployment(input, options = {}) {
  const now = options.now || (() => new Date().toISOString());
  const record = {
    source_sha: input.sourceSha,
    backend_image: input.backendImage,
    frontend_image: input.frontendImage,
    backend_service_id: input.backendServiceId,
    frontend_service_id: input.frontendServiceId,
    backend_deploy_id: null,
    frontend_deploy_id: null,
    backend_status: null,
    frontend_status: null,
    backend_health: null,
    result: 'pending',
    phase: 'validation',
    failure_reason: null,
    updated_at: now(),
  };
  const persist = () => {
    record.updated_at = now();
    if (options.save) options.save(record);
  };
  const fetcher = options.fetch || fetch;
  const wait = options.sleep || sleep;
  const clock = options.clock || Date.now;
  const timeout = options.timeout || 600000;
  const pollInterval = options.pollInterval || 10000;
  const requestTimeout = options.requestTimeout || 30000;
  const safeMessage = (message) =>
    input.apiKey
      ? String(message).replaceAll(input.apiKey, '[REDACTED]')
      : String(message);

  try {
    validateInput(input);
    const checkMain =
      options.checkMain ||
      (() => {
        const tip = execFileSync(
          'git',
          ['ls-remote', 'origin', 'refs/heads/main'],
          { encoding: 'utf8', timeout: options.gitTimeout || 30000 },
        )
          .trim()
          .split(/\s+/)[0];
        return tip === input.sourceSha;
      });
    const request = async (url, init = {}) => {
      const response = await fetcher(url, {
        ...init,
        signal: AbortSignal.timeout(requestTimeout),
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
      let body;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      return { response, body };
    };
    const deployService = async (kind, serviceId, image) => {
      record.phase = `${kind}_main_check`;
      persist();
      if (!(await checkMain()))
        throw new Error(`Current main tip changed before ${kind} deploy.`);
      record.phase = `${kind}_request`;
      persist();
      const { response, body } = await request(
        `${API_BASE}/services/${serviceId}/deploys`,
        {
          method: 'POST',
          body: JSON.stringify({ imageUrl: image }),
        },
      );
      if (response.status === 202)
        throw new Error(
          `${kind} deploy returned HTTP 202; inspect Render for a queued deploy.`,
        );
      if (
        response.status !== 201 ||
        !body ||
        typeof body.id !== 'string' ||
        !/^dep-[a-z0-9]+$/.test(body.id)
      ) {
        throw new Error(
          `${kind} deploy request was rejected or returned an invalid deploy ID (HTTP ${response.status}).`,
        );
      }
      const idField = `${kind}_deploy_id`;
      const statusField = `${kind}_status`;
      record[idField] = body.id;
      persist();
      const deadline = clock() + timeout;
      while (clock() <= deadline) {
        const result = await request(
          `${API_BASE}/services/${serviceId}/deploys/${body.id}`,
        );
        if (
          result.response.status !== 200 ||
          !result.body ||
          typeof result.body.status !== 'string'
        ) {
          throw new Error(
            `${kind} deploy status request failed (HTTP ${result.response.status}).`,
          );
        }
        record[statusField] = result.body.status;
        persist();
        if (
          [
            'failed',
            'build_failed',
            'update_failed',
            'pre_deploy_failed',
            'canceled',
            'deactivated',
          ].includes(result.body.status.toLowerCase())
        ) {
          throw new Error(
            `${kind} deploy reached terminal status ${result.body.status}.`,
          );
        }
        if (result.body.status.toLowerCase() === 'live') {
          if (result.body.image?.ref !== image)
            throw new Error(
              `${kind} live deploy image does not match the published digest.`,
            );
          return;
        }
        await wait(Math.min(pollInterval, Math.max(0, deadline - clock())));
      }
      throw new Error(`${kind} deploy timed out before reaching live.`);
    };

    await deployService('backend', input.backendServiceId, input.backendImage);
    record.phase = 'backend_health';
    persist();
    const healthDeadline = clock() + (options.healthTimeout || 300000);
    let healthy = false;
    while (clock() <= healthDeadline) {
      try {
        const response = await fetcher(options.healthUrl || HEALTH_URL, {
          signal: AbortSignal.timeout(requestTimeout),
        });
        let body;
        try {
          body = await response.json();
        } catch {
          body = null;
        }
        record.backend_health = {
          http_status: response.status,
          status: body?.status || null,
        };
        persist();
        if (response.status === 200 && body?.status === 'OK') {
          healthy = true;
          break;
        }
      } catch {
        record.backend_health = { http_status: null, status: null };
        persist();
      }
      await wait(
        Math.min(
          options.healthPollInterval || pollInterval,
          Math.max(0, healthDeadline - clock()),
        ),
      );
    }
    if (!healthy)
      throw new Error(
        'Backend health check did not return HTTP 200 with status OK within five minutes.',
      );
    await deployService(
      'frontend',
      input.frontendServiceId,
      input.frontendImage,
    );
    record.phase = 'complete';
    record.result = 'success';
    persist();
    return record;
  } catch (error) {
    record.result = 'failure';
    record.failure_reason = safeMessage(error.message);
    record.phase =
      record.phase === 'validation' ? 'validation' : `${record.phase}_failed`;
    persist();
    throw Object.assign(new Error(record.failure_reason), { record });
  }
}

async function main() {
  let latest;
  const input = {
    sourceSha: process.env.SOURCE_SHA,
    backendImage: process.env.BACKEND_IMAGE,
    frontendImage: process.env.FRONTEND_IMAGE,
    backendServiceId: process.env.BACKEND_SERVICE_ID,
    frontendServiceId: process.env.FRONTEND_SERVICE_ID,
    apiKey: process.env.RENDER_API_KEY,
  };
  const save = (record) => {
    latest = { ...record };
    fs.writeFileSync(
      process.env.RESULT_PATH || 'staging-deployment.json',
      `${JSON.stringify(latest, null, 2)}\n`,
    );
  };
  try {
    await runDeployment(input, { save });
  } catch (error) {
    latest ||= error.record;
    const summary = formatSummary(latest, false);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY || '/dev/null', summary);
    console.error(
      `::error::${latest?.failure_reason || 'Staging deployment failed.'}`,
    );
    process.exitCode = 1;
    return;
  }
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY || '/dev/null',
    formatSummary(latest, true),
  );
}

function formatSummary(record, succeeded) {
  return `### Staging deployment ${succeeded ? 'complete' : 'failed'}\n- Result: \`${record?.result || 'failure'}\`\n- Source SHA: \`${record?.source_sha || 'invalid'}\`\n- Backend image: \`${record?.backend_image || 'invalid'}\`\n- Frontend image: \`${record?.frontend_image || 'invalid'}\`\n- Backend service: \`${record?.backend_service_id || 'unset'}\`; deploy: \`${record?.backend_deploy_id || 'not requested'}\`; status: \`${record?.backend_status || 'not observed'}\`\n- Frontend service: \`${record?.frontend_service_id || 'unset'}\`; deploy: \`${record?.frontend_deploy_id || 'not requested'}\`; status: \`${record?.frontend_status || 'not observed'}\`\n- Backend health: HTTP ${record?.backend_health?.http_status ?? 'not observed'}, status \`${record?.backend_health?.status || 'not observed'}\`\n- Phase: \`${record?.phase || 'validation'}\`\n- Failure: ${record?.failure_reason || 'none'}\n`;
}

if (require.main === module) main();
module.exports = { formatSummary, runDeployment, validateInput };
