const STAGING_DEFAULTS = {
  backendName: 'peers-staging-backend',
  frontendName: 'PEERS Staging Frontend',
  backendUrl: 'https://peers-staging-backend.onrender.com',
  frontendUrl: 'https://projectpeerevaluation-p25-02-frontend.onrender.com',
};

function readStagingServiceConfig(env = process.env) {
  const backendName = env.STAGING_BACKEND_NAME || STAGING_DEFAULTS.backendName;
  const frontendName =
    env.STAGING_FRONTEND_NAME || STAGING_DEFAULTS.frontendName;
  const backendUrl = requireRenderOrigin(
    env.STAGING_BACKEND_URL || STAGING_DEFAULTS.backendUrl,
    'STAGING_BACKEND_URL',
  );
  const frontendUrl = requireRenderOrigin(
    env.STAGING_FRONTEND_URL || STAGING_DEFAULTS.frontendUrl,
    'STAGING_FRONTEND_URL',
  );
  if (!backendName.trim()) {
    const error = new Error('STAGING_BACKEND_NAME is invalid.');
    error.field = 'backend_name';
    throw error;
  }
  if (!frontendName.trim()) {
    const error = new Error('STAGING_FRONTEND_NAME is invalid.');
    error.field = 'frontend_name';
    throw error;
  }
  return { backendName, frontendName, backendUrl, frontendUrl };
}

function requireRenderOrigin(value, name) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    const error = new Error(
      `${name} must be a bare HTTPS *.onrender.com origin.`,
    );
    error.field =
      name === 'STAGING_BACKEND_URL' ? 'backend_url' : 'frontend_url';
    throw error;
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.origin !== value ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.onrender\.com$/i.test(
      parsed.hostname,
    ) ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    const error = new Error(
      `${name} must be a bare HTTPS *.onrender.com origin.`,
    );
    error.field =
      name === 'STAGING_BACKEND_URL' ? 'backend_url' : 'frontend_url';
    throw error;
  }
  return parsed.origin;
}

function readStagingSmokeConfig(env) {
  const { frontendUrl, backendUrl } = readStagingServiceConfig(env);
  const evaluationToken = env.STAGING_EVALUATION_TOKEN;
  if (!evaluationToken || !/^[A-Za-z0-9_-]{12,256}$/.test(evaluationToken)) {
    throw new Error('STAGING_EVALUATION_TOKEN must be a protected token value');
  }
  return { frontendUrl, backendUrl, evaluationToken };
}

module.exports = {
  STAGING_DEFAULTS,
  readStagingServiceConfig,
  readStagingSmokeConfig,
  requireRenderOrigin,
};
