const { execFileSync } = require('node:child_process');
function changedFiles(base, head, git = execFileSync) {
  for (const sha of [base, head]) {
    if (!/^[a-f0-9]{40,64}$/i.test(sha || ''))
      throw new Error('Invalid event SHA');
  }
  const mergeBase = git('git', ['merge-base', base, head], {
    encoding: 'utf8',
  }).trim();
  const fields = git(
    'git',
    ['diff', '--name-status', '-z', '--find-renames', mergeBase, head],
    { encoding: 'utf8' },
  ).split('\0');
  const files = [];
  while (fields[0]) {
    const status = fields.shift();
    const first = fields.shift();
    const renamed = /^[RC]/.test(status);
    const file = renamed ? fields.shift() : first;
    if (!file) throw new Error('Incomplete git diff record');
    files.push({
      path: file,
      status,
      ...(renamed ? { previousPath: first } : {}),
    });
  }
  return { mergeBase, files };
}
if (require.main === module) {
  try {
    console.log(
      JSON.stringify(
        changedFiles(process.env.PR_BASE_SHA, process.env.PR_HEAD_SHA),
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { changedFiles };
