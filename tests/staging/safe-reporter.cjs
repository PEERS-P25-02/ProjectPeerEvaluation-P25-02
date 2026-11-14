const fs = require('node:fs');
const path = require('node:path');
const { readStagingSmokeConfig } = require('./config.cjs');
const { makeSafeCheckRecord } = require('./safe-evidence.cjs');

class SafeStagingReporter {
  constructor() {
    this.checks = [];
  }

  onTestEnd(test, result) {
    const { evaluationToken } = readStagingSmokeConfig(process.env);
    this.checks.push(makeSafeCheckRecord(test, result, evaluationToken));
  }

  onEnd() {
    const outputPath = path.resolve('test-results/staging/smoke-checks.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(
      outputPath,
      `${JSON.stringify({ checks: this.checks }, null, 2)}\n`,
    );
  }
}

module.exports = SafeStagingReporter;
