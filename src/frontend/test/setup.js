// Give every frontend test the same set of useful page checks.
// TLDR: register the jest-dom matchers with Vitest once for the test suite.

import '@testing-library/jest-dom/vitest';

import { afterAll } from 'vitest';
import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Each isolated Vitest file writes a snapshot before its environment disappears.
// Unique names avoid concurrent workers overwriting one another's counters.
afterAll(() => {
  if (process.env.PEERS_COVERAGE !== '1') return;
  const coverage = globalThis.__coverage__;
  if (!coverage || !Object.keys(coverage).length)
    throw new Error('Missing canonical frontend coverage snapshot');
  const directory = path.resolve('coverage/canonical');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, `${process.pid}-${randomUUID()}.json`),
    JSON.stringify(coverage),
  );
});
