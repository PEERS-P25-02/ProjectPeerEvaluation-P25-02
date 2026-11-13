function isEvaluationGetForToken(response, backendUrl, evaluationToken) {
  const url = new URL(response.url());
  return (
    url.origin === backendUrl &&
    url.pathname === `/api/evaluate/${encodeURIComponent(evaluationToken)}` &&
    response.request().method() === 'GET'
  );
}

module.exports = { isEvaluationGetForToken };
