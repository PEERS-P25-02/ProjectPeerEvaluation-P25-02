const CONTAINER_PATH = /^tests\/integration\/[A-Za-z0-9_.-]+\.test\.js$/;
const REPOSITORY_PREFIX = 'src/backend/';

function toContainerPaths(paths) {
  if (!Array.isArray(paths))
    throw new TypeError('Integration test paths must be an array');

  return paths.map((input) => {
    if (typeof input !== 'string' || !input)
      throw new Error(`Invalid integration test path: ${String(input)}`);

    // CI selects repository-relative paths; Vitest needs paths relative to its
    // Docker workdir at src/backend.
    const containerPath = input.startsWith(REPOSITORY_PREFIX)
      ? input.slice(REPOSITORY_PREFIX.length)
      : input;
    if (!CONTAINER_PATH.test(containerPath))
      throw new Error(`Unexpected integration test path: ${input}`);
    return containerPath;
  });
}

module.exports = { toContainerPaths };
