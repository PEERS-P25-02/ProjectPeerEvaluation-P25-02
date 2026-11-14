const ALLOWED_FRONTEND =
  'https://projectpeerevaluation-p25-02-frontend.onrender.com';
const ALLOWED_BACKEND = 'https://peers-staging-backend.onrender.com';

function requireExactOrigin(value, expected, name) {
  if (value !== expected) {
    throw new Error(`${name} must exactly equal the approved staging origin`);
  }
  const parsed = new URL(value);
  if (
    parsed.protocol !== 'https:' ||
    parsed.origin !== value ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(`${name} must be an HTTPS origin without a path`);
  }
  return parsed.origin;
}

function readStagingSmokeConfig(env) {
  const frontendUrl = requireExactOrigin(
    env.STAGING_FRONTEND_URL,
    ALLOWED_FRONTEND,
    'STAGING_FRONTEND_URL',
  );
  const backendUrl = requireExactOrigin(
    env.STAGING_BACKEND_URL,
    ALLOWED_BACKEND,
    'STAGING_BACKEND_URL',
  );
  const evaluationToken = env.STAGING_EVALUATION_TOKEN;
  if (!evaluationToken || !/^[A-Za-z0-9_-]{12,256}$/.test(evaluationToken)) {
    throw new Error('STAGING_EVALUATION_TOKEN must be a protected token value');
  }
  return { frontendUrl, backendUrl, evaluationToken };
}

module.exports = { readStagingSmokeConfig };
