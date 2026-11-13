function sanitizeFailureDiagnostic(value, token) {
  let diagnostic = String(value || 'Check failed without an error message.');
  diagnostic = diagnostic.replace(/https?:\/\/[^\s"'<>]+/gi, '[URL REDACTED]');
  diagnostic = diagnostic.replace(
    /(\/api\/evaluate\/)[^/?\s"'<>]+/g,
    '$1[TOKEN REDACTED]',
  );
  if (token) {
    const variants = new Set([token, encodeURIComponent(token)]);
    for (const secret of variants) {
      diagnostic = diagnostic.replaceAll(secret, '[TOKEN REDACTED]');
    }
  }
  diagnostic = diagnostic.replace(/\s+/g, ' ').trim();
  return diagnostic.slice(0, 320);
}

function makeSafeCheckRecord(test, result, token) {
  const status = [
    'passed',
    'failed',
    'timedOut',
    'skipped',
    'interrupted',
  ].includes(result.status)
    ? result.status
    : 'unknown';
  const check = {
    name: sanitizeFailureDiagnostic(test.title, token).slice(0, 120),
    status,
    duration_ms: Number.isFinite(result.duration)
      ? Math.max(0, Math.round(result.duration))
      : null,
  };

  if (status === 'failed' || status === 'timedOut') {
    const rawError = result.error?.message || result.errors?.[0]?.message;
    check.failure_category =
      status === 'timedOut' ? 'timeout' : 'assertion-or-request-failure';
    check.diagnostic = sanitizeFailureDiagnostic(
      rawError || (status === 'timedOut' ? 'Check timed out.' : undefined),
      token,
    );
  }
  return check;
}

module.exports = { makeSafeCheckRecord, sanitizeFailureDiagnostic };
