// Read existing Istanbul/V8 counters for an explicit, reviewable function scope.
// This is a backend business-logic diagnostic, not combined workflow coverage.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'src/backend');
const scope = require('./priority-backend-scope.json');
const input =
  process.argv[2] || path.join(backend, 'coverage/coverage-final.json');
const report = JSON.parse(fs.readFileSync(input, 'utf8'));
const normalize = (file) => path.resolve(file).replaceAll('\\', '/');
const entries = new Map(
  Object.entries(report).map(([file, value]) => [normalize(file), value]),
);
const zero = () => ({
  statements: [0, 0],
  lines: [0, 0],
  functions: [0, 0],
  branches: [0, 0],
});
const sum = zero();
const rows = [];
try {
  const classified = new Set([
    ...scope.modules
      .filter((item) => item.file.startsWith('controllers/'))
      .map((item) => path.basename(item.file)),
    ...scope.excludedControllers,
  ]);
  for (const file of fs.readdirSync(path.join(backend, 'controllers'))) {
    if (file.endsWith('.js') && !classified.has(file))
      throw new Error(`Unmapped controller: ${file}`);
  }
  for (const module of scope.modules) {
    const absolute = path.join(backend, module.file);
    const coverage = entries.get(normalize(absolute));
    if (!coverage) throw new Error(`Missing coverage: ${module.file}`);
    const source = fs.readFileSync(absolute, 'utf8');
    const lines = source.split(/\r?\n/);
    const actualExports = [...source.matchAll(/^exports\.(\w+)\s*=/gm)]
      .map((match) => match[1])
      .sort();
    if (module.exports) {
      const declared = [...module.exports, ...module.excludedExports].sort();
      if (JSON.stringify(actualExports) !== JSON.stringify(declared))
        throw new Error(`Export scope changed: ${module.file}`);
    }
    const names = [
      ...(module.exports || []).map((name) => ({
        name,
        pattern: new RegExp(`^exports\\.${name}\\s*=`),
      })),
      ...(module.helpers || []).map((name) => ({
        name,
        pattern: new RegExp(
          `^(?:async )?function ${name}\\b|^const ${name}\\s*=`,
        ),
      })),
    ];
    const ranges = names.map(({ name, pattern }) => {
      const line = lines.findIndex((text) => pattern.test(text)) + 1;
      const candidates = Object.values(coverage.fnMap).filter(
        (fn) => fn.decl.start.line === line,
      );
      if (!line || candidates.length !== 1)
        throw new Error(
          `Expected one mapped function for ${module.file}:${name}`,
        );
      return {
        name,
        start: candidates[0].decl.start,
        end: candidates[0].loc.end,
      };
    });
    // Nested callbacks are included once, even when used by several workflows.
    const included = (loc) =>
      ranges.some(
        (range) =>
          loc.start.line >= range.start.line &&
          loc.start.line <= range.end.line,
      );
    const counters = zero();
    const count = (metric, hits) => {
      for (const hit of hits) {
        if (!Number.isInteger(hit) || hit < 0)
          throw new Error(`Invalid ${metric} counter in ${module.file}`);
        counters[metric][1]++;
        if (hit > 0) counters[metric][0]++;
      }
    };
    const lineHits = new Map();
    for (const [id, loc] of Object.entries(coverage.statementMap)) {
      if (!included(loc)) continue;
      const hit = coverage.s[id];
      count('statements', [hit]);
      lineHits.set(
        loc.start.line,
        Math.max(lineHits.get(loc.start.line) || 0, hit),
      );
    }
    count('lines', [...lineHits.values()]);
    for (const [id, fn] of Object.entries(coverage.fnMap))
      if (included(fn.loc)) count('functions', [coverage.f[id]]);
    for (const [id, branch] of Object.entries(coverage.branchMap))
      if (included(branch.loc)) count('branches', coverage.b[id]);
    for (const metric of Object.keys(sum)) {
      sum[metric][0] += counters[metric][0];
      sum[metric][1] += counters[metric][1];
    }
    rows.push({
      file: module.file,
      workflows: module.workflows,
      ranges,
      counters,
    });
  }
  const totals = Object.fromEntries(
    Object.entries(sum).map(([metric, [covered, total]]) => [
      metric,
      {
        covered,
        total,
        percent: total ? Math.floor((covered / total) * 10000) / 100 : null,
      },
    ]),
  );
  const output = path.join(root, 'test-results/priority-backend-coverage.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(
    output,
    JSON.stringify({ status: scope.status, totals, modules: rows }, null, 2) +
      '\n',
  );
  console.log(scope.status);
  for (const [metric, result] of Object.entries(totals))
    console.log(
      `${metric}: ${result.covered}/${result.total} (${result.percent}%)`,
    );
  console.log(`Detailed source ranges: ${path.relative(root, output)}`);
} catch (error) {
  console.error(`Priority coverage mapping failed: ${error.message}`);
  process.exitCode = 1;
}
