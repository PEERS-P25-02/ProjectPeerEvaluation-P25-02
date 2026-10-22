import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const { getCourseReport } = require('../controllers/reportController.js');
const Course = require('../models/Course.js');
const Student = require('../models/Student.js');
const Evaluation = require('../models/Evaluation.js');
const Team = require('../models/Team.js');

const courseId = new mongoose.Types.ObjectId();

afterEach(() => vi.restoreAllMocks());

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() };
}

function student(id, name) {
  return {
    _id: id,
    name,
    team_id: null,
    toObject: () => ({ _id: id, name })
  };
}

describe('report preparation', () => {
  it('prepares student scores and letter grades from stored evaluations', async () => {
    const first = student(new mongoose.Types.ObjectId(), 'Student One');
    const second = student(new mongoose.Types.ObjectId(), 'Student Two');
    vi.spyOn(Course, 'findById').mockResolvedValue({ course_name: 'Course' });
    vi.spyOn(Student, 'find').mockReturnValue({
      populate: vi.fn().mockResolvedValue([first, second])
    });
    vi.spyOn(Evaluation, 'find').mockResolvedValue([
      {
        student_id: first._id,
        toObject: () => ({ student_id: first._id }),
        ratings: {
          professionalism: 4,
          communication: 4,
          work_ethic: 4,
          content_knowledge_skills: 4,
          overall_contribution: 4,
          participation: 4
        }
      }
    ]);
    vi.spyOn(Team, 'find').mockResolvedValue([]);

    const res = response();
    await getCourseReport({
      params: { course_id: courseId.toString() },
      query: { gradingMethod: 'mean' }
    }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      students: expect.arrayContaining([
        expect.objectContaining({
          name: 'Student One',
          originalScore: 83.33,
          finalScore: 83.33,
          letterGrade: 'B',
          evaluationsReceived: 1
        }),
        expect.objectContaining({
          name: 'Student Two',
          originalScore: 0,
          finalScore: 0,
          letterGrade: 'No evaluations'
        })
      ])
    }));
  });
});
