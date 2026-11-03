const { execFileSync } = require('node:child_process');
function changedFiles(base, head, git = execFileSync) {
  for (const sha of [base, head]) {
    if (!/^[a-f0-9]{40,64}$/i.test(sha || ''))
      throw new Error('Invalid event SHA');
  }
  const uncertain = () => ({
    base,
    head,
    mergeBase: null,
    files: [],
    uncertain: true,
    reason: 'Change evidence unavailable, empty, or inconsistent',
  });
  let mergeBase;
  let fields;
  try {
    mergeBase = git('git', ['merge-base', base, head], {
      encoding: 'utf8',
    }).trim();
    if (!/^[a-f0-9]{40,64}$/i.test(mergeBase)) return uncertain();
    fields = git(
      'git',
      ['diff', '--name-status', '-z', '--find-renames', mergeBase, head],
      { encoding: 'utf8' },
    ).split('\0');
  } catch (error) {
    console.error(`Change discovery failed: ${error.message}`);
    return uncertain();
  }
  const files = [];
  while (fields[0]) {
    const status = fields.shift();
    const first = fields.shift();
    if (!/^(A|M|D|T|R\d{1,3}|C\d{1,3})$/.test(status)) return uncertain();
    const renamed = /^[RC]/.test(status);
    const file = renamed ? fields.shift() : first;
    if (!file) return uncertain();
    files.push({
      path: file,
      status,
      ...(renamed ? { previousPath: first } : {}),
    });
  }
  if (!files.length || fields.length !== 1 || fields[0] !== '')
    return uncertain();
  return { base, head, mergeBase, files };
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
