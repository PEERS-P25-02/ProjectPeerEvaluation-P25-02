const { validateTarget } = require('./target.cjs');

module.exports = function globalSetup(config) {
  validateTarget(process.env);
  // CLI flags can override config defaults. Shared reset ownership requires
  // one worker and one sequential project for this disposable stack.
  if (
    config.workers !== 1 ||
    config.projects.length !== 1 ||
    config.projects.some((project) => project.fullyParallel)
  ) {
    throw new Error(
      'E2E fixtures require one worker, one project, and no parallel overrides',
    );
  }
};
