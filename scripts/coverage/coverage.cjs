/* Coverage uses the same AST converter as Vitest. Source locations, rather than
 * provider-specific numeric IDs, identify counters across independent runs. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL, fileURLToPath } = require('node:url');
const policy = require('./policy.json');
const { createHash } = require('node:crypto');
const { changedFiles } = require('../regressionChanges.cjs');
const root = path.resolve(__dirname, '../..');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = () =>
  execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(name) : [name];
  });
}
function manifest() {
  return [
    ...policy.productionEntries,
    ...policy.productionRoots.flatMap((dir) =>
      walk(path.join(root, dir)).map((file) => path.relative(root, file)),
    ),
  ]
    .filter(
      (file) =>
        /\.(js|jsx)$/.test(file) &&
        !file
          .split(path.sep)
          .some((part) => policy.excludedDirectories.includes(part)) &&
        !/\.(test|spec)\./.test(file) &&
        !(
          file.startsWith('src/backend/') &&
          policy.excludedBackendFiles.includes(path.basename(file))
        ),
    )
    .sort();
}
function identity(input) {
  let file = input;
  if (file.startsWith('file:')) file = fileURLToPath(file);
  file = file.replaceAll('\\', '/');
  if (file.startsWith('/app/')) file = 'src/backend/' + file.slice(5);
  const marker = file.indexOf('/src/');
  if (marker >= 0) file = file.slice(marker + 1);
  if (path.isAbsolute(file)) file = path.relative(root, file);
  return file;
}
async function libraries() {
  const [coverage, reports, converter, vitest, vite] = await Promise.all([
    import('@vitest/istanbul-lib-coverage'),
    import('@vitest/istanbul-lib-report'),
    import('ast-v8-to-istanbul'),
    import('vitest/node'),
    import('vite'),
  ]);
  return {
    coverage,
    reports,
    convert: converter.convert,
    parse: vitest.parseAstAsync,
    vite,
  };
}
function validate(file) {
  for (const key of ['statementMap', 'fnMap', 'branchMap', 's', 'f', 'b']) {
    if (!file[key] || typeof file[key] !== 'object')
      throw new Error(`Malformed coverage: missing ${key}`);
  }
  for (const [mapKey, counterKey] of [
    ['statementMap', 's'],
    ['fnMap', 'f'],
    ['branchMap', 'b'],
  ]) {
    if (
      Object.keys(file[mapKey]).length !==
        Object.keys(file[counterKey]).length ||
      Object.keys(file[mapKey]).some(
        (id) => !Object.hasOwn(file[counterKey], id),
      )
    )
      throw new Error(`Malformed coverage: mismatched ${counterKey} IDs`);
    for (const [id, loc] of Object.entries(file[mapKey])) {
      if (
        counterKey === 'b' &&
        (!Array.isArray(file.b[id]) ||
          file.b[id].length !== loc.locations?.length)
      )
        throw new Error('Malformed branch counter arity');
    }
  }
  for (const key of ['s', 'f', 'b'])
    for (const counter of Object.values(file[key])) {
      if (
        !(Array.isArray(counter) ? counter : [counter]).every(
          (n) => Number.isFinite(n) && n >= 0,
        )
      )
        throw new Error('Malformed coverage counter');
    }
}
function normalize(data, allowed = manifest()) {
  const result = {};
  for (const [name, entry] of Object.entries(data)) {
    // The Vitest Istanbul fork exposes FileCoverage instances from toJSON().
    const file = entry.data || entry;
    const source = identity(file.path || name);
    if (!allowed.includes(source)) continue;
    validate(file);
    if (result[source]) throw new Error(`Duplicate source identity: ${source}`);
    result[source] = { ...file, path: path.join(root, source) };
  }
  if (!Object.keys(result).length)
    throw new Error('Report contains no production source coverage');
  return result;
}
function istanbulSnapshot(input) {
  if (!input.coverage) return normalize(input);
  if (input.complete !== true || input.format !== 'istanbul')
    throw new Error('Incomplete Istanbul runtime snapshot');
  const data = normalize(input.coverage);
  const hashes = sourceHashes();
  for (const file of Object.keys(data)) {
    if (input.sourceHashes?.[file] !== hashes[file])
      throw new Error(`Istanbul snapshot source hash mismatch: ${file}`);
  }
  return data;
}
async function collect(options) {
  if (!['istanbul', 'v8'].includes(options.format))
    throw new Error('Expected istanbul or v8 format');
  if (options.capture) {
    const capture = read(options.capture);
    if (
      !capture.complete ||
      capture.sha !== sha() ||
      String(capture.runId) !== String(process.env.GITHUB_RUN_ID || null) ||
      String(capture.runAttempt) !==
        String(
          options['producer-attempt'] || process.env.GITHUB_RUN_ATTEMPT || null,
        )
    )
      throw new Error('Runtime capture provenance mismatch');
    const hashes = sourceHashes();
    if (
      !capture.sourceHashes ||
      Object.keys(capture.sourceHashes).length !== Object.keys(hashes).length
    )
      throw new Error('Missing captured source hashes');
    for (const [file, hash] of Object.entries(capture.sourceHashes))
      if (hashes[file] !== hash)
        throw new Error(`Captured source hash mismatch: ${file}`);
  }
  const lib = await libraries();
  const files = fs.statSync(options.input).isDirectory()
    ? walk(options.input).filter((f) => f.endsWith('.json'))
    : [options.input];
  if (!files.length) throw new Error('No coverage input files');
  const collected = {};
  const add = (incoming) => {
    for (const [file, report] of Object.entries(incoming)) {
      if (collected[file]) mergeFile(collected[file], report);
      else collected[file] = structuredClone(report);
    }
  };
  for (const file of files) {
    const data = read(file);
    if (options.format === 'istanbul') add(istanbulSnapshot(data));
    else {
      const scripts = Array.isArray(data) ? data : data.result;
      if (!Array.isArray(scripts))
        throw new Error(`Malformed V8 report: ${file}`);
      for (const script of scripts) {
        if (typeof script.url !== 'string' || !Array.isArray(script.functions))
          throw new Error(`Malformed V8 script: ${file}`);
        if (!script.url) continue;
        let code = script.source;
        let sourceMap = script.sourceMap;
        if (typeof sourceMap === 'string') sourceMap = JSON.parse(sourceMap);
        let url;
        if (/^https?:/.test(script.url)) {
          if (!options['source-root'])
            throw new Error('Browser coverage requires --source-root');
          const asset = path.join(
            options['source-root'],
            new URL(script.url).pathname.replace(/^\//, ''),
          );
          if (!fs.existsSync(asset))
            throw new Error(`Missing browser asset: ${asset}`);
          code ??= fs.readFileSync(asset, 'utf8');
          if (!sourceMap && fs.existsSync(asset + '.map'))
            sourceMap = read(asset + '.map');
          if (!sourceMap)
            throw new Error(`Missing browser source map: ${asset}`);
          // Resolve original source paths relative to the real build directory.
          url = pathToFileURL(
            path.join(
              root,
              'build',
              new URL(script.url).pathname.replace(/^\//, ''),
            ),
          ).href;
          verifySourceMap(sourceMap);
        } else {
          const source = identity(script.url);
          if (!manifest().includes(source)) continue;
          url = pathToFileURL(path.join(root, source)).href;
          code ??= fs.readFileSync(path.join(root, source), 'utf8');
        }
        const converted = await lib.convert({
          code,
          sourceMap,
          ast: await lib.parse(code),
          coverage: { ...script, url },
          wrapperLength: 0,
        });
        add(normalize(converted));
      }
    }
  }
  const data = normalize(collected);
  write(options.output, {
    version: 1,
    sourceHashes: sourceHashes(),
    runId: process.env.GITHUB_RUN_ID || null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
    sha: sha(),
    suite: options.suite,
    format: 'istanbul-source-locations',
    coverage: data,
  });
}
function sourceHashes() {
  return Object.fromEntries(
    manifest().map((file) => [
      file,
      createHash('sha256')
        .update(fs.readFileSync(path.join(root, file)))
        .digest('hex'),
    ]),
  );
}
function verifySourceMap(map) {
  if (
    map?.version !== 3 ||
    !Array.isArray(map.sources) ||
    !Array.isArray(map.sourcesContent) ||
    typeof map.mappings !== 'string'
  )
    throw new Error('Malformed or incomplete source map');
  for (let i = 0; i < map.sources.length; i++) {
    const file = identity(map.sources[i]);
    if (
      manifest().includes(file) &&
      map.sourcesContent[i] !== fs.readFileSync(path.join(root, file), 'utf8')
    )
      throw new Error(`Source map content mismatch: ${file}`);
  }
}
function locationKey(value) {
  const position = (loc) =>
    loc && [loc.start.line, loc.start.column, loc.end.line, loc.end.column];
  if (value.locations)
    return JSON.stringify([
      value.type,
      position(value.loc),
      value.locations.map(position),
    ]);
  if (value.decl) return JSON.stringify(position(value.loc));
  return JSON.stringify(position(value));
}
function mergeFile(target, incoming) {
  validate(target);
  validate(incoming);
  for (const [mapKey, countKey] of [
    ['statementMap', 's'],
    ['fnMap', 'f'],
    ['branchMap', 'b'],
  ]) {
    const slots = new Map();
    for (const [id, location] of Object.entries(target[mapKey])) {
      const key = locationKey(location);
      if (!slots.has(key)) slots.set(key, []);
      slots.get(key).push(id);
    }
    for (const [id, location] of Object.entries(incoming[mapKey])) {
      // Equal source spans can occur more than once in a canonical AST. Match
      // occurrences independently so a later counter cannot swallow earlier hits.
      const slot = slots.get(locationKey(location))?.shift();
      if (slot === undefined) {
        // Source maps cannot reverse bundler rewrites of functions or branches.
        // Reject incompatible schemas instead of inflating totals or guessing hits.
        const error = new Error(
          `Incompatible ${mapKey} source locations in ${incoming.path}`,
        );
        error.code = 'COVERAGE_INCOMPATIBLE_SCHEMA';
        error.details = {
          source: identity(incoming.path),
          counter: mapKey,
          location,
          canonicalCounters: Object.keys(target[mapKey]).length,
          incomingCounters: Object.keys(incoming[mapKey]).length,
        };
        throw error;
      }
      if (Array.isArray(incoming[countKey][id])) {
        if (target[countKey][slot].length !== incoming[countKey][id].length)
          throw new Error('Incompatible branch arity');
        target[countKey][slot] = target[countKey][slot].map((count, index) =>
          Math.max(count, incoming[countKey][id][index]),
        );
      } else
        target[countKey][slot] = Math.max(
          target[countKey][slot],
          incoming[countKey][id],
        );
    }
  }
}
async function baseline(lib) {
  const data = {};
  for (const file of manifest()) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    if (!file.startsWith('src/backend/')) {
      // The same pre-bundle instrumenter defines unit, browser and absent-file
      // counters; transforms must never invent a second source denominator.
      const { instrumentSource } = require('../frontendInstrumentation.cjs');
      const instrumented = await instrumentSource(source, file);
      Object.assign(data, normalize({ [file]: instrumented.coverage }));
      continue;
    }
    // Parse original JSX directly: a synthetic transform changes source columns
    // and would create duplicate zero counters beside observed source coverage.
    const parsed = lib.vite.parseSync(file, source);
    if (parsed.errors.length)
      throw new Error(`Cannot parse production source: ${file}`);
    const converted = await lib.convert({
      code: source,
      ast: parsed.program,
      coverage: {
        url: pathToFileURL(path.join(root, file)).href,
        functions: [],
      },
      wrapperLength: 0,
    });
    Object.assign(data, normalize(converted));
  }
  return data;
}
function includeMissingFiles(data, empty) {
  for (const [file, report] of Object.entries(empty)) data[file] ??= report;
  return data;
}
async function merge(options) {
  const lib = await libraries();
  const plan = read(options.plan);
  if (plan.sha !== sha() || !Array.isArray(plan.suites) || !plan.suites.length)
    throw new Error('Invalid plan or SHA mismatch');
  const data = {};
  const names = new Set();
  const incompatible = [];
  for (const suite of plan.suites) {
    if (names.has(suite.name)) throw new Error('Duplicate expected suite');
    names.add(suite.name);
    const report = read(suite.report);
    if (
      report.sha !== plan.sha ||
      report.suite !== suite.name ||
      JSON.stringify(report.sourceHashes) !== JSON.stringify(sourceHashes()) ||
      String(report.runId) !== String(plan.runId ?? null) ||
      String(report.runAttempt) !== String(plan.runAttempt ?? null)
    )
      throw new Error(`Provenance mismatch: ${suite.name}`);
    for (const [file, incoming] of Object.entries(normalize(report.coverage))) {
      if (data[file]) {
        try {
          mergeFile(data[file], incoming);
        } catch (error) {
          if (error.code !== 'COVERAGE_INCOMPATIBLE_SCHEMA') throw error;
          incompatible.push({ suite: suite.name, ...error.details });
        }
      } else data[file] = structuredClone(incoming);
    }
  }
  write(path.join(options.output, 'compatibility.json'), {
    sha: plan.sha,
    runId: plan.runId ?? null,
    runAttempt: plan.runAttempt ?? null,
    compatible: !incompatible.length,
    incompatible,
  });
  if (incompatible.length)
    throw new Error(
      `Incompatible coverage schemas in ${incompatible.length} source reports; see ${path.join(options.output, 'compatibility.json')}. Use matching source instrumentation before bundling.`,
    );
  // Observed reports already enumerate the complete source AST, including zero
  // counters. Synthetic baselines are only needed for entirely absent files.
  // Merging a separately transformed baseline would duplicate source counters.
  const empty = await baseline(lib);
  includeMissingFiles(data, empty);
  for (const [name, entries] of [
    ['combined', Object.entries(data)],
    [
      'frontend',
      Object.entries(data).filter(([file]) => !file.startsWith('src/backend/')),
    ],
    [
      'backend',
      Object.entries(data).filter(([file]) => file.startsWith('src/backend/')),
    ],
  ]) {
    const map = lib.coverage.createCoverageMap(
      Object.fromEntries(entries.map(([, file]) => [file.path, file])),
    );
    const dir = path.join(options.output, name);
    const context = lib.reports.createContext({
      dir,
      coverageMap: map,
      sourceFinder: (file) => fs.readFileSync(file, 'utf8'),
    });
    for (const reporter of ['html', 'lcovonly', 'json', 'json-summary'])
      lib.reports.create(reporter).execute(context);
  }
  write(path.join(options.output, 'provenance.json'), {
    ...plan,
    manifest: manifest(),
    sourceHashes: sourceHashes(),
    metrics: ['statements', 'functions', 'branches', 'lines'],
  });
}
function addedLines(diff) {
  let line;
  const result = [];
  for (const text of diff.split('\n')) {
    if (text.startsWith('diff --git ')) line = undefined;
    else if (text.startsWith('@@')) {
      const match = text.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (!match) throw new Error('Malformed diff hunk');
      line = Number(match[1]);
    } else if (line !== undefined && text.startsWith('+')) result.push(line++);
    else if (line !== undefined && text.startsWith(' ')) line++;
  }
  return result;
}
function changedSourceLines(base, head, git) {
  const { mergeBase, files } = changedFiles(base, head, git);
  const changed = Object.fromEntries(
    files
      .filter((file) => !file.status.startsWith('D'))
      .map((file) => [
        file.path,
        addedLines(
          git(
            'git',
            [
              'diff',
              '--no-ext-diff',
              '--find-renames',
              '--unified=0',
              mergeBase,
              head,
              '--',
              ...(file.previousPath ? [file.previousPath] : []),
              file.path,
            ],
            { encoding: 'utf8' },
          ),
        ),
      ]),
  );
  return { mergeBase, changed };
}
async function patch(options) {
  const lib = await libraries();
  const data = normalize(read(options.report));
  const git = (command, args, settings) =>
    execFileSync(command, args, { ...settings, cwd: root });
  const head = options.head || sha();
  const { mergeBase, changed } = changedSourceLines(options.base, head, git);
  let total = 0;
  let covered = 0;
  const details = {};
  for (const [file, lines] of Object.entries(changed)) {
    if (!manifest().includes(file)) continue;
    if (!data[file])
      throw new Error(`Missing changed production source: ${file}`);
    const hits = lib.coverage.createFileCoverage(data[file]).getLineCoverage();
    const executable = lines.filter((line) => Object.hasOwn(hits, line));
    const missed = executable.filter((line) => hits[line] === 0);
    total += executable.length;
    covered += executable.length - missed.length;
    details[file] = { executable, missed };
  }
  const percentage = total ? (covered / total) * 100 : null;
  write(options.output, {
    sha: sha(),
    base: options.base,
    mergeBase,
    head,
    threshold: Number(options.threshold || policy.patchThreshold),
    total,
    covered,
    percentage,
    status: total ? 'evaluated' : 'not-applicable',
    pass:
      !total ||
      percentage >= Number(options.threshold || policy.patchThreshold),
    files: details,
  });
}
async function main() {
  const [command, ...args] = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!args[index].startsWith('--') || args[index + 1] === undefined)
      throw new Error('Expected --name value');
    options[args[index].slice(2)] = args[index + 1];
  }
  if (command === 'collect') await collect(options);
  else if (command === 'merge') await merge(options);
  else if (command === 'patch') await patch(options);
  else if (command === 'manifest')
    write(options.output, { sha: sha(), files: manifest(), policy });
  else throw new Error('Expected collect, merge, patch, or manifest');
}
module.exports = {
  identity,
  manifest,
  normalize,
  mergeFile,
  includeMissingFiles,
  addedLines,
  changedSourceLines,
  baseline,
  libraries,
  sourceHashes,
  locationKey,
  collect,
  merge,
  patch,
  verifySourceMap,
  istanbulSnapshot,
};
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
