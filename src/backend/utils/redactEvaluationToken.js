// Evaluation links contain bearer-like tokens; never write those path segments to app logs.
function redactEvaluationToken(url) {
  return String(url).replace(/(\/api\/evaluate\/)[^/?]+/g, '$1[REDACTED]');
}

module.exports = redactEvaluationToken;
