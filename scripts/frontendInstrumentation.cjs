const { createInstrumenter } = require('istanbul-lib-instrument');
const { createHash } = require('node:crypto');
const policy = require('./coverage/policy.json');

function isFrontendProduction(file) {
  return (
    (policy.productionEntries.includes(file) ||
      file.startsWith('src/frontend/')) &&
    /\.(js|jsx)$/.test(file) &&
    !file
      .split('/')
      .some((part) => policy.excludedDirectories.includes(part)) &&
    !/\.(test|spec)\./.test(file)
  );
}

// Both browser and unit transforms use these original-source counters. The
// engine calls the same helper for its zero baseline, keeping locations stable.
function instrumentSource(source, relativePath) {
  const instrumenter = createInstrumenter({
    esModules: true,
    parserPlugins: ['jsx'],
    produceSourceMap: true,
    compact: false,
  });
  const code = instrumenter.instrumentSync(source, relativePath);
  const hash = createHash('sha256').update(source).digest('hex');
  const marker = `globalThis.__peersCoverageSources__ ??= {}; globalThis.__peersCoverageSources__[${JSON.stringify(relativePath)}] = ${JSON.stringify(hash)};\n`;
  return {
    code: code + '\n' + marker,
    map: instrumenter.lastSourceMap(),
    coverage: instrumenter.lastFileCoverage(),
  };
}
module.exports = { instrumentSource, isFrontendProduction };
