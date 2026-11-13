import { describe, expect, it } from 'vitest';
const redactEvaluationToken = require('../utils/redactEvaluationToken');

describe('redactEvaluationToken', () => {
  it('redacts evaluation token segments while preserving route suffixes and queries', () => {
    expect(
      redactEvaluationToken('/api/evaluate/synthetic-secret/status?check=1'),
    ).toBe('/api/evaluate/[REDACTED]/status?check=1');
  });

  it('leaves unrelated paths unchanged', () => {
    expect(redactEvaluationToken('/api/health')).toBe('/api/health');
  });
});
