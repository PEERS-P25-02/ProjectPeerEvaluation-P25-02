// Only the opt-in test overlay loads this hook in the actual API process.
const v8 = require('node:v8');
const fs = require('node:fs');
process.on('SIGUSR2', () => {
  v8.takeCoverage();
  fs.writeFileSync(
    '/coverage/flushed.json',
    JSON.stringify({ pid: process.pid, complete: true }),
  );
});
