// CW-02/CW-03/CW-04/CW-05: state transitions must preserve course boundaries.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Team = require('../models/Team');
const Evaluation = require('../models/Evaluation');
const courses = require('../controllers/courseController');
const students = require('../controllers/studentController');
const teams = require('../controllers/teamController');
const courseId = new mongoose.Types.ObjectId();
const studentId = new mongoose.Types.ObjectId();
const oldTeamId = new mongoose.Types.ObjectId();
const newTeamId = new mongoose.Types.ObjectId();
const params = {
  course_id: String(courseId),
  student_id: String(studentId),
  team_id: String(oldTeamId),
};
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });
afterEach(() => vi.restoreAllMocks());

describe('course preservation rules', () => {
  it('reactivates the matching inactive course instead of creating a duplicate', async () => {
    const course = {
      _id: courseId,
      course_status: 'Inactive',
      markModified: vi.fn(),
      save: vi.fn().mockResolvedValue(),
    };
    vi.spyOn(Course, 'findOne').mockResolvedValue(course);
    const create = vi.spyOn(Course.prototype, 'save');
    const res = response();
    const next = vi.fn();
    const body = {
      course_name: 'Testing',
      course_number: '4724',
      course_section: '01',
      semester: 'Fall',
    };
    await courses.createCourse({ body, user: { id: 'owner' } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(Course.findOne).toHaveBeenCalledWith({
      ...body,
      professor_id: 'owner',
      course_status: 'Inactive',
    });
    expect(course.course_status).toBe('Active');
    expect(course.save).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: courseId,
      message: 'Course reactivated.',
    });
  });
  it('keeps owner filtering when searching legacy course numbers and names', async () => {
    vi.spyOn(Course, 'find').mockResolvedValue([
      {
        toObject: () => ({ _id: courseId, course_code: 'SWE4724 02' }),
        _id: courseId,
      },
    ]);
    vi.spyOn(Team, 'aggregate').mockResolvedValue([]);
    const res = response();
    const next = vi.fn();
    await courses.listCourses(
      {
        user: { id: 'owner' },
        query: {
          course_name: 'Testing',
          course_number: '4724',
          course_section: '02',
          semester: 'Fall',
          course_status: '',
        },
      },
      res,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(Course.find).toHaveBeenCalledWith({
      professor_id: 'owner',
      course_name: { $regex: 'Testing', $options: 'i' },
      $or: [
        { course_number: { $regex: '4724', $options: 'i' } },
        { course_code: { $regex: '4724', $options: 'i' } },
      ],
      course_section: { $regex: '02', $options: 'i' },
      semester: { $regex: 'Fall', $options: 'i' },
    });
    expect(res.json).toHaveBeenCalledWith([
      {
        _id: courseId,
        course_code: 'SWE4724 02',
        course_number: 'SWE4724',
        course_section: '02',
        team_count: 0,
      },
    ]);
  });
  it('discards ownership, identity, and counter changes from course edits', async () => {
    vi.spyOn(Course, 'findByIdAndUpdate').mockResolvedValue({ _id: courseId });
    const next = vi.fn();
    await courses.updateCourse(
      {
        params,
        body: {
          course_name: 'Renamed',
          professor_id: 'other',
          _id: 'other',
          student_count: 900,
          team_count: 900,
        },
      },
      response(),
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(Course.findByIdAndUpdate).toHaveBeenCalledExactlyOnceWith(
      params.course_id,
      { course_name: 'Renamed' },
      { new: true },
    );
  });
});

function mockStudentEdit() {
  vi.spyOn(Student, 'findOne').mockResolvedValue({
    _id: studentId,
    team_id: oldTeamId,
  });
  vi.spyOn(Student, 'findOneAndUpdate').mockResolvedValue({ _id: studentId });
  vi.spyOn(Student, 'countDocuments').mockResolvedValue(2);
  vi.spyOn(Team, 'findByIdAndUpdate').mockResolvedValue({});
}
describe('student membership transitions', () => {
  it('preserves existing membership during a details-only edit and rejects protected fields', async () => {
    mockStudentEdit();
    const next = vi.fn();
    await students.updateStudent(
      {
        params,
        body: {
          name: 'Renamed',
          course_id: 'other',
          team_id: newTeamId,
          evaluation_token: 'forged',
          evaluation_completed: true,
        },
      },
      response(),
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(Student.findOneAndUpdate).toHaveBeenCalledExactlyOnceWith(
      { _id: params.student_id, course_id: params.course_id },
      { name: 'Renamed' },
      { new: true },
    );
    expect(Team.findByIdAndUpdate).not.toHaveBeenCalled();
  });
  it('moves a student between teams and recounts both memberships', async () => {
    mockStudentEdit();
    vi.spyOn(Team, 'findOne').mockResolvedValue({ _id: newTeamId });
    const next = vi.fn();
    await students.updateStudent(
      { params, body: { group_assignment: 'Beta' } },
      response(),
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(Team.findOne).toHaveBeenCalledWith({
      course_id: courseId,
      team_name: 'Beta',
    });
    expect(Student.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: params.student_id, course_id: params.course_id },
      { group_assignment: 'Beta', team_id: newTeamId },
      { new: true },
    );
    expect(Team.findByIdAndUpdate).toHaveBeenCalledWith(oldTeamId, {
      $pull: { students: params.student_id },
    });
    expect(Team.findByIdAndUpdate).toHaveBeenCalledWith(newTeamId, {
      $addToSet: { students: studentId },
    });
    expect(Team.findByIdAndUpdate).toHaveBeenCalledWith(oldTeamId, {
      student_count: 2,
    });
    expect(Team.findByIdAndUpdate).toHaveBeenCalledWith(newTeamId, {
      student_count: 2,
    });
  });
  it('clears membership when the team assignment is blank', async () => {
    mockStudentEdit();
    const findTeam = vi.spyOn(Team, 'findOne');
    const next = vi.fn();
    await students.updateStudent(
      { params, body: { group_assignment: ' ' } },
      response(),
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(findTeam).not.toHaveBeenCalled();
    expect(Student.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: params.student_id, course_id: params.course_id },
      { group_assignment: null, team_id: null },
      { new: true },
    );
    expect(Team.findByIdAndUpdate).toHaveBeenCalledWith(oldTeamId, {
      $pull: { students: params.student_id },
    });
  });
  it('removes authored and received evaluations when deleting a team member', async () => {
    vi.spyOn(Student, 'findOneAndDelete').mockResolvedValue({
      _id: studentId,
      team_id: oldTeamId,
    });
    vi.spyOn(Course, 'findById').mockResolvedValue({ _id: courseId });
    vi.spyOn(Evaluation, 'deleteMany').mockResolvedValue({ deletedCount: 2 });
    vi.spyOn(Team, 'findByIdAndUpdate').mockResolvedValue({});
    vi.spyOn(Student, 'countDocuments').mockResolvedValue(1);
    vi.spyOn(Course, 'findByIdAndUpdate').mockResolvedValue({});
    const next = vi.fn();
    await students.deleteStudent({ params }, response(), next);
    expect(next).not.toHaveBeenCalled();
    expect(Student.findOneAndDelete).toHaveBeenCalledWith({
      _id: params.student_id,
      course_id: params.course_id,
    });
    expect(Evaluation.deleteMany).toHaveBeenCalledWith({
      course_id: params.course_id,
      $or: [
        { student_id: params.student_id },
        { evaluator_id: params.student_id },
      ],
    });
    expect(Team.findByIdAndUpdate).toHaveBeenCalledWith(oldTeamId, {
      $pull: { students: studentId },
    });
    expect(Team.findByIdAndUpdate).toHaveBeenCalledWith(oldTeamId, {
      student_count: 1,
    });
    expect(Course.findByIdAndUpdate).toHaveBeenCalledWith(courseId, {
      student_count: 1,
    });
  });
});

describe('course-scoped cleanup', () => {
  it('resets tokens, SMTP acceptance markers, completion, and evaluations only in the selected course', async () => {
    vi.spyOn(Student, 'updateMany').mockResolvedValue({ modifiedCount: 3 });
    vi.spyOn(Evaluation, 'deleteMany').mockResolvedValue({ deletedCount: 4 });
    const res = response();
    const next = vi.fn();
    await students.resetEvaluationState({ params }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(Student.updateMany).toHaveBeenCalledExactlyOnceWith(
      { course_id: courseId },
      {
        $unset: { evaluation_token: 1, invitation_accepted_at: 1 },
        // Reset also returns completed students to the pending lifecycle state.
        $set: { evaluation_completed: false },
      },
    );
    expect(Evaluation.deleteMany).toHaveBeenCalledExactlyOnceWith({
      course_id: courseId,
    });
    expect(res.json).toHaveBeenCalledWith({
      message: 'Evaluation state reset successfully.',
      tokens_cleared: 3,
      evaluations_deleted: 4,
    });
  });
  it('stops reset after token cleanup fails and does not claim success', async () => {
    vi.spyOn(Student, 'updateMany').mockRejectedValue(
      new Error('Synthetic failure'),
    );
    const deletion = vi.spyOn(Evaluation, 'deleteMany');
    const res = response();
    const next = vi.fn();
    await students.resetEvaluationState({ params }, res, next);
    expect(next).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ code: 'SERVER_ERROR', status: 500 }),
    );
    expect(deletion).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
  it('deletes a course roster and its teams/evaluations and resets both counts', async () => {
    vi.spyOn(Student, 'countDocuments').mockResolvedValue(3);
    vi.spyOn(Student, 'deleteMany').mockResolvedValue({ deletedCount: 3 });
    vi.spyOn(Evaluation, 'deleteMany').mockResolvedValue({ deletedCount: 4 });
    vi.spyOn(Team, 'deleteMany').mockResolvedValue({ deletedCount: 2 });
    vi.spyOn(Course, 'findByIdAndUpdate').mockResolvedValue({});
    const res = response();
    const next = vi.fn();
    await students.deleteAllStudents({ params }, res, next);
    expect(next).not.toHaveBeenCalled();
    for (const model of [Student, Evaluation, Team])
      expect(model.deleteMany).toHaveBeenCalledExactlyOnceWith({
        course_id: courseId,
      });
    expect(Course.findByIdAndUpdate).toHaveBeenCalledWith(courseId, {
      student_count: 0,
      team_count: 0,
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_students: 3,
        deleted_evaluations: 4,
        deleted_teams: 2,
      }),
    );
  });
  it('clears teams and student links without deleting students', async () => {
    vi.spyOn(Team, 'deleteMany').mockResolvedValue({ deletedCount: 2 });
    vi.spyOn(Student, 'updateMany').mockResolvedValue({});
    const deleteStudents = vi.spyOn(Student, 'deleteMany');
    vi.spyOn(Course, 'findByIdAndUpdate').mockResolvedValue({});
    const res = response();
    const next = vi.fn();
    await teams.clearAllTeams({ params }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(Team.deleteMany).toHaveBeenCalledExactlyOnceWith({
      course_id: courseId,
    });
    expect(Student.updateMany).toHaveBeenCalledExactlyOnceWith(
      { course_id: courseId },
      { $unset: { team_id: '', group_assignment: '' } },
    );
    expect(deleteStudents).not.toHaveBeenCalled();
    expect(Course.findByIdAndUpdate).toHaveBeenCalledWith(courseId, {
      team_count: 0,
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ teams_deleted: 2 }),
    );
  });
});
