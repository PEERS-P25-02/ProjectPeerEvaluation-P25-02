// CW-01: resolve ownership before a course handler runs.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const Course = require('../models/Course');
const { requireCourseOwner } = require('../middleware/courseAuthorization');
const courseId = new mongoose.Types.ObjectId().toString();
const professorId = new mongoose.Types.ObjectId().toString();
afterEach(() => vi.restoreAllMocks());
describe('course ownership boundary', () => {
  it('rejects malformed IDs without querying or attaching a course', async () => {
    const query = vi.spyOn(Course, 'findOne');
    const req = { user: { id: professorId } };
    const next = vi.fn();
    await requireCourseOwner(req, {}, next, 'invalid');
    expect(next).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ status: 400, code: 'VALIDATION_ERROR' }),
    );
    expect(query).not.toHaveBeenCalled();
    expect(req).not.toHaveProperty('course');
  });
  it('queries both course and owner and attaches only the matching course', async () => {
    const course = { _id: courseId, professor_id: professorId };
    const query = vi.spyOn(Course, 'findOne').mockResolvedValue(course);
    const req = { user: { id: professorId } };
    const next = vi.fn();
    await requireCourseOwner(req, {}, next, courseId);
    expect(query).toHaveBeenCalledExactlyOnceWith({
      _id: courseId,
      professor_id: professorId,
    });
    expect(req.course).toBe(course);
    expect(next).toHaveBeenCalledExactlyOnceWith();
  });
  it('conceals absent and unowned courses and stops the handler', async () => {
    vi.spyOn(Course, 'findOne').mockResolvedValue(null);
    const req = { user: { id: professorId } };
    const next = vi.fn();
    await requireCourseOwner(req, {}, next, courseId);
    expect(next).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ status: 404, code: 'NOT_FOUND' }),
    );
    expect(req).not.toHaveProperty('course');
  });
  it('forwards database failures without granting access', async () => {
    const error = new Error('Synthetic database failure');
    vi.spyOn(Course, 'findOne').mockRejectedValue(error);
    const req = { user: { id: professorId } };
    const next = vi.fn();
    await requireCourseOwner(req, {}, next, courseId);
    expect(next).toHaveBeenCalledExactlyOnceWith(error);
    expect(error).toMatchObject({ status: 500, code: 'SERVER_ERROR' });
    expect(req).not.toHaveProperty('course');
  });
});
