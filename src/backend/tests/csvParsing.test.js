/*
 * These tests check how roster uploads handle student details, team names, and
 * incomplete rows.
 *
 * TLDR: sends temporary CSV files through the upload controller with mocked
 * database operations.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const { uploadRoster } = require('../controllers/studentController.js');
const Student = require('../models/Student.js');
const Team = require('../models/Team.js');
const Course = require('../models/Course.js');
const Evaluation = require('../models/Evaluation.js');

const courseId = '507f1f77bcf86cd799439011';
const temporaryFiles = new Set();

afterEach(() => {
  vi.restoreAllMocks();
  for (const filePath of temporaryFiles) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  temporaryFiles.clear();
});

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() };
}

function existingStudentQuery() {
  return { select: vi.fn().mockResolvedValue([]) };
}

describe('roster CSV parsing', () => {
  it('parses the CSV through the upload controller and preserves roster assignments', async () => {
    const filePath = path.join(os.tmpdir(), `roster-${Date.now()}.csv`);
    temporaryFiles.add(filePath);
    fs.writeFileSync(
      filePath,
      'student_id,name,email,team_name\nS001,"Student, One",student@example.test,Team A\n',
    );

    const studentId = new mongoose.Types.ObjectId();
    const teamId = new mongoose.Types.ObjectId();
    const createdStudent = {
      _id: studentId,
      student_id: 'S001',
      name: 'Student, One',
      email: 'student@example.test',
    };

    vi.spyOn(Student, 'updateMany').mockResolvedValue({});
    vi.spyOn(Student, 'find')
      .mockImplementationOnce(() => existingStudentQuery())
      .mockResolvedValueOnce([createdStudent]);
    vi.spyOn(Student, 'insertMany').mockResolvedValue([createdStudent]);
    vi.spyOn(Student, 'findByIdAndUpdate').mockResolvedValue({});
    vi.spyOn(Student, 'countDocuments').mockResolvedValue(1);
    vi.spyOn(Team, 'findOne').mockResolvedValue(null);
    vi.spyOn(Team.prototype, 'save').mockResolvedValue({ _id: teamId });
    vi.spyOn(Team, 'findByIdAndUpdate').mockResolvedValue({});
    vi.spyOn(Team, 'countDocuments').mockResolvedValue(1);
    vi.spyOn(Course, 'findByIdAndUpdate').mockResolvedValue({});
    vi.spyOn(Evaluation, 'deleteMany').mockResolvedValue({ deletedCount: 0 });

    const res = response();
    await uploadRoster(
      {
        params: { course_id: courseId },
        file: { path: filePath },
      },
      res,
      vi.fn(),
    );

    await vi.waitFor(() => expect(res.json).toHaveBeenCalledOnce());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        students: ['S001'],
        team_names: ['Team A'],
        teams_created: 1,
      }),
    );
    expect(Student.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          student_id: 'S001',
          name: 'Student, One',
          email: 'student@example.test',
          group_assignment: 'Team A',
          course_id: courseId,
        }),
      ],
      { ordered: false },
    );
  });

  it('accepts legacy team column names and rejects rows missing required values', async () => {
    const filePath = path.join(os.tmpdir(), `roster-${Date.now()}-legacy.csv`);
    temporaryFiles.add(filePath);
    fs.writeFileSync(
      filePath,
      'student_id,name,email,group_assignment\nS001,Student One,one@example.test,Team A\nS002,,two@example.test,Team B\n',
    );

    vi.spyOn(Student, 'updateMany').mockResolvedValue({});
    vi.spyOn(Student, 'find')
      .mockImplementationOnce(() => existingStudentQuery())
      .mockResolvedValueOnce([]);
    vi.spyOn(Student, 'insertMany').mockResolvedValue([]);
    vi.spyOn(Student, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Team, 'findOne').mockResolvedValue(null);
    vi.spyOn(Team.prototype, 'save').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
    });
    vi.spyOn(Team, 'findByIdAndUpdate').mockResolvedValue({});
    vi.spyOn(Team, 'countDocuments').mockResolvedValue(1);
    vi.spyOn(Course, 'findByIdAndUpdate').mockResolvedValue({});
    vi.spyOn(Evaluation, 'deleteMany').mockResolvedValue({ deletedCount: 0 });

    const res = response();
    await uploadRoster(
      {
        params: { course_id: courseId },
        file: { path: filePath },
      },
      res,
      vi.fn(),
    );

    await vi.waitFor(() => expect(res.json).toHaveBeenCalledOnce());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: [expect.stringContaining('S002')],
      }),
    );
    expect(Student.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          student_id: 'S001',
          name: 'Student One',
          email: 'one@example.test',
          group_assignment: 'Team A',
          course_id: courseId,
        }),
      ],
      { ordered: false },
    );
  });
});
