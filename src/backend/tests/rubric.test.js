/*
 * These tests check that the evaluation criteria, score descriptions, and
 * feedback rules stay consistent.
 *
 * TLDR: verifies the rubric configuration without starting the application.
 */
import { describe, expect, it } from 'vitest';
import rubric from '../config/rubric.js';

describe('evaluation rubric', () => {
  it('contains the required scoring criteria', () => {
    expect(rubric.criteria.map((criterion) => criterion.id)).toEqual([
      'professionalism',
      'communication',
      'work_ethic',
      'content_knowledge_skills',
      'overall_contribution',
      'participation',
    ]);
    expect(rubric.criteria.every((criterion) => criterion.required)).toBe(true);
  });

  it('defines scale descriptions for every allowed score', () => {
    for (const criterion of rubric.criteria) {
      const [minimum, maximum] = criterion.scale.split('-').map(Number);
      const scores = Object.keys(criterion.scaleDescriptions).map(Number);

      expect(scores).toHaveLength(maximum - minimum + 1);
      expect(scores).toEqual(
        expect.arrayContaining(
          Array.from(
            { length: maximum - minimum + 1 },
            (_, index) => minimum + index,
          ),
        ),
      );
    }
  });

  it('requires feedback with the documented length limits', () => {
    expect(rubric.overallFeedback).toMatchObject({
      id: 'overall_feedback',
      type: 'text',
      required: true,
      minLength: 10,
      maxLength: 1000,
    });
  });
});
