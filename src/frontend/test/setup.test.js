import { beforeAll, expect, it } from 'vitest';

beforeAll(() => {
  globalThis.__coverage__ = {};
});

it('allows a per-file coverage snapshot to be empty', () => {
  expect(globalThis.__coverage__).toEqual({});
});
