const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  manifest: productionManifest,
  sourceHashes,
} = require('./coverage/coverage.cjs');

async function captureRuntimeCoverage({
  docker,
  composeArguments,
  resultsDirectory,
  suite,
  testContainer,
}) {
  const directory = path.join(resultsDirectory, 'coverage');
  fs.mkdirSync(directory, { recursive: true });
  const manifest = {
    suite,
    sha:
      process.env.PR_HEAD_SHA ||
      execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    runId: process.env.GITHUB_RUN_ID || null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
    sourceHashes: sourceHashes(),
    backend: false,
    frontend: suite !== 'e2e',
    complete: false,
    errors: [],
  };
  async function run(args) {
    const result = await docker(args, { quiet: true });
    if (result.code !== 0)
      throw new Error(`Coverage command failed: ${args.join(' ')}`);
    return result.stdout.trim();
  }
  try {
    const backend = await run([
      ...composeArguments,
      'ps',
      '--all',
      '--quiet',
      'backend',
    ]);
    if (!backend) throw new Error('Missing API container');
    // Hash the files inside the running API image before trusting local source provenance.
    const backendFiles = productionManifest().filter((file) =>
      file.startsWith('src/backend/'),
    );
    const actualHashes = JSON.parse(
      await run([
        'exec',
        backend,
        'node',
        '-e',
        "const fs=require('fs'),crypto=require('crypto');const files=JSON.parse(process.argv[1]);console.log(JSON.stringify(Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync('/app/'+file.slice('src/backend/'.length))).digest('hex')]))))",
        JSON.stringify(backendFiles),
      ]),
    );
    for (const file of backendFiles) {
      if (actualHashes[file] !== manifest.sourceHashes[file])
        throw new Error(`API source mismatch: ${file}`);
    }
    // SIGUSR2 invokes v8.takeCoverage in the API itself, without measuring the test client.
    await run(['exec', backend, 'sh', '-c', 'kill -USR2 1']);
    await run([
      'exec',
      backend,
      'node',
      '-e',
      "const fs=require('fs');let n=0;const t=setInterval(()=>{if(fs.existsSync('/coverage/flushed.json')){clearInterval(t);}else if(++n===100){clearInterval(t);process.exitCode=1;}},50)",
    ]);
    await run([
      'cp',
      `${backend}:/coverage/backend`,
      path.join(directory, 'backend'),
    ]);
    const files = fs
      .readdirSync(path.join(directory, 'backend'))
      .filter((name) => name.startsWith('coverage-') && name.endsWith('.json'));
    if (!files.length) throw new Error('API coverage is empty');
    manifest.backend = true;
    if (suite === 'e2e') {
      await run([
        'cp',
        `${testContainer}:/app/coverage/frontend`,
        path.join(directory, 'frontend'),
      ]);
      const captures = fs
        .readdirSync(path.join(directory, 'frontend'))
        .filter((name) => name.endsWith('.json'));
      if (!captures.length) throw new Error('Browser coverage is empty');
      for (const name of captures) {
        const capture = JSON.parse(
          fs.readFileSync(path.join(directory, 'frontend', name)),
        );
        if (
          !capture.complete ||
          capture.format !== 'istanbul' ||
          !capture.coverage ||
          !Object.keys(capture.coverage).length ||
          !capture.sourceHashes ||
          !Object.keys(capture.sourceHashes).length
        )
          throw new Error(`Incomplete browser coverage: ${name}`);
      }
      manifest.frontend = true;
    }
    manifest.complete = true;
  } catch (error) {
    manifest.errors.push(error.message);
  }
  fs.writeFileSync(
    path.join(directory, 'capture.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  return manifest.complete;
}
module.exports = { captureRuntimeCoverage };
