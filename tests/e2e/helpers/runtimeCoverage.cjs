const { test: base, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// Coverage survives same-origin document navigations. Wrapping close ensures
// popup and explicitly created contexts flush before Chromium destroys scripts.
const test = base.extend({
  browser: async ({ browser }, use) => {
    if (process.env.PEERS_COVERAGE !== '1') return use(browser);
    const pending = [];
    const failures = [];
    const attach = async (page) => {
      const originalClose = page.close.bind(page);
      let flushed = false;
      const flush = async () => {
        if (flushed) return;
        flushed = true;
        try {
          const snapshots = await page.evaluate(() => {
            const previous = JSON.parse(
              sessionStorage.getItem('__peersCoverageSnapshots__') || '[]',
            );
            if (
              globalThis.__coverage__ &&
              Object.keys(globalThis.__coverage__).length
            )
              previous.push({
                coverage: globalThis.__coverage__,
                sourceHashes: globalThis.__peersCoverageSources__,
              });
            return previous;
          });
          if (!snapshots.length)
            throw new Error(
              'Page has no canonical frontend coverage snapshots',
            );
          const directory = path.resolve('coverage/frontend');
          fs.mkdirSync(directory, { recursive: true });
          for (const snapshot of snapshots) {
            if (
              !snapshot.sourceHashes ||
              !Object.keys(snapshot.coverage).length
            )
              throw new Error('Incomplete canonical browser snapshot');
            fs.writeFileSync(
              path.join(directory, `${randomUUID()}.json`),
              JSON.stringify({
                complete: true,
                format: 'istanbul',
                ...snapshot,
              }),
            );
          }
        } catch (error) {
          failures.push(error);
        }
      };
      page.close = async (...args) => {
        await flush();
        return originalClose(...args);
      };
      page.on('close', () => {
        if (!flushed)
          failures.push(new Error('Page closed before coverage flush'));
      });
      return flush;
    };
    const originalNewContext = browser.newContext.bind(browser);
    browser.newContext = async (...args) => {
      const context = await originalNewContext(...args);
      // A full reload replaces the JavaScript realm. Save its counters while
      // the old document is alive, then collect all snapshots before closing.
      await context.addInitScript(() => {
        globalThis.addEventListener('beforeunload', () => {
          if (
            !globalThis.__coverage__ ||
            !Object.keys(globalThis.__coverage__).length
          )
            return;
          const snapshots = JSON.parse(
            sessionStorage.getItem('__peersCoverageSnapshots__') || '[]',
          );
          snapshots.push({
            coverage: globalThis.__coverage__,
            sourceHashes: globalThis.__peersCoverageSources__,
          });
          sessionStorage.setItem(
            '__peersCoverageSnapshots__',
            JSON.stringify(snapshots),
          );
        });
      });
      const captures = new Map();
      context.on('page', (page) => {
        const ready = attach(page);
        captures.set(page, ready);
        pending.push(ready);
      });
      const originalNewPage = context.newPage.bind(context);
      context.newPage = async (...pageArgs) => {
        const page = await originalNewPage(...pageArgs);
        await captures.get(page);
        return page;
      };
      const originalClose = context.close.bind(context);
      context.close = async (...closeArgs) => {
        for (const ready of captures.values()) await (await ready)();
        return originalClose(...closeArgs);
      };
      return context;
    };
    try {
      await use(browser);
      await Promise.all(pending);
      if (failures.length)
        throw new AggregateError(failures, 'Browser coverage capture failed');
    } finally {
      browser.newContext = originalNewContext;
      if (failures.length) {
        fs.mkdirSync('coverage/frontend', { recursive: true });
        fs.writeFileSync(
          `coverage/frontend/incomplete-${randomUUID()}.json`,
          JSON.stringify({
            complete: false,
            errors: failures.map((error) => error.message),
          }),
        );
      }
    }
  },
});
module.exports = { test, expect };
