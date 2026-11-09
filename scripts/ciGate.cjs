// Missing and unexpectedly skipped jobs must never turn an incomplete run green.
function evaluate(needs, eventName) {
  if (!['pull_request', 'merge_group'].includes(eventName))
    return [`Unsupported CI event: ${eventName || 'missing'}`];
  const failures = [];
  const requireResult = (name, expected = 'success') => {
    if (needs[name]?.result !== expected)
      failures.push(
        `${name}: expected ${expected}, received ${needs[name]?.result || 'missing'}`,
      );
  };
  for (const name of [
    'frontend-build',
    'code-quality',
    'dependency-vulnerability-scan',
    'secret-scan',
    'policy-tests',
    'unit-tests',
    'integration-tests',
  ])
    requireResult(name);
  requireResult(
    'e2e-tests',
    eventName === 'merge_group' ? 'success' : 'skipped',
  );
  requireResult(
    'patch-coverage',
    eventName === 'pull_request' ? 'success' : 'skipped',
  );
  requireResult(
    'overall-coverage',
    eventName === 'merge_group' ? 'success' : 'skipped',
  );
  return failures;
}
if (require.main === module) {
  try {
    const failures = evaluate(
      JSON.parse(process.env.CI_NEEDS),
      process.env.CI_CANDIDATE_KIND,
    );
    if (failures.length) throw new Error(failures.join('\n'));
    console.log('All required CI outcomes passed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { evaluate };
