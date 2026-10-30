// Missing and unexpectedly skipped jobs must never turn an incomplete run green.
function evaluate(needs) {
  const failures = [];
  const requireResult = (name, expected = 'success') => {
    if (needs[name]?.result !== expected)
      failures.push(
        `${name}: expected ${expected}, received ${needs[name]?.result || 'missing'}`,
      );
  };
  for (const name of [
    'select-tests',
    'frontend-build',
    'code-quality',
    'dependency-vulnerability-scan',
    'secret-scan',
  ])
    requireResult(name);
  const outputs = needs['select-tests']?.outputs || {};
  const mode = outputs.mode;
  if (!['none', 'selected', 'full'].includes(mode))
    failures.push('Invalid or missing selector decision');
  const code = mode === 'selected' || mode === 'full';
  for (const key of ['integration', 'e2e']) {
    if (
      (mode === 'none' && outputs[key] !== 'false') ||
      (mode === 'full' && outputs[key] !== 'true')
    )
      failures.push(`Inconsistent ${mode} ${key} selection`);
  }
  requireResult('unit-tests', code ? 'success' : 'skipped');
  for (const [job, key] of [
    ['integration-tests', 'integration'],
    ['e2e-tests', 'e2e'],
  ]) {
    if (!['true', 'false'].includes(outputs[key]))
      failures.push(`Invalid ${key} selection`);
    requireResult(job, outputs[key] === 'true' ? 'success' : 'skipped');
  }
  requireResult('patch-coverage', code ? 'success' : 'skipped');
  const decision = needs['patch-coverage']?.outputs.decision;
  if (code && !['pass', 'na', 'broaden', 'below'].includes(decision))
    failures.push('Invalid coverage decision');
  if ((!code || mode === 'full') && decision === 'broaden')
    failures.push('Unexpected coverage broadening');
  if (decision === 'below') failures.push('Patch coverage below threshold');
  requireResult(
    'broaden-regression',
    decision === 'broaden' ? 'success' : 'skipped',
  );
  requireResult('final-coverage', code ? 'success' : 'skipped');
  return failures;
}
if (require.main === module) {
  try {
    const failures = evaluate(JSON.parse(process.env.CI_NEEDS));
    if (failures.length) throw new Error(failures.join('\n'));
    console.log('All required CI outcomes passed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { evaluate };
