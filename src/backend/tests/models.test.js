import { describe, expect, it } from 'vitest';
import Course from '../models/Course.js';
import Evaluation from '../models/Evaluation.js';
import Student from '../models/Student.js';
import Team from '../models/Team.js';

describe('backend model invariants', () => {
  it('requires the core course fields and limits course status values', () => {
    const error = new Course().validateSync();

    expect(error.errors.course_name).toBeDefined();
    expect(error.errors.course_number).toBeDefined();
    expect(error.errors.course_section).toBeDefined();
    expect(error.errors.semester).toBeDefined();
    expect(error.errors.professor_id).toBeDefined();
    expect(new Course({
      course_name: 'Course',
      course_number: 'CS 101',
      course_section: '01',
      semester: 'Fall 2026',
      professor_id: '507f1f77bcf86cd799439011',
      course_status: 'Unknown'
    }).validateSync().errors.course_status).toBeDefined();
  });

  it('requires student identity and course association', () => {
    const error = new Student().validateSync();

    expect(error.errors.student_id).toBeDefined();
    expect(error.errors.name).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.course_id).toBeDefined();
  });

  it('applies safe defaults to student evaluation state', () => {
    const student = new Student({
      student_id: 'S001',
      name: 'Student One',
      email: 'STUDENT@EXAMPLE.TEST',
      course_id: '507f1f77bcf86cd799439011'
    });

    expect(student.email).toBe('student@example.test');
    expect(student.team_id).toBeNull();
    expect(student.group_assignment).toBeNull();
    expect(student.evaluation_token).toBeNull();
    expect(student.evaluation_completed).toBe(false);
  });

  it('requires team identity and course association', () => {
    const error = new Team().validateSync();

    expect(error.errors.team_name).toBeDefined();
    expect(error.errors.course_id).toBeDefined();
  });

  it('enforces evaluation rating and feedback requirements', () => {
    const error = new Evaluation().validateSync();

    expect(error.errors.course_id).toBeDefined();
    expect(error.errors.student_id).toBeDefined();
    expect(error.errors.evaluator_id).toBeDefined();
    expect(error.errors['ratings.professionalism']).toBeDefined();
    expect(error.errors.overall_feedback).toBeDefined();
    expect(error.errors.evaluation_token).toBeDefined();
  });

  it('enforces the participation rating maximum of four', () => {
    const evaluation = new Evaluation({
      course_id: '507f1f77bcf86cd799439011',
      student_id: '507f1f77bcf86cd799439012',
      evaluator_id: '507f1f77bcf86cd799439013',
      ratings: {
        professionalism: 5,
        communication: 5,
        work_ethic: 5,
        content_knowledge_skills: 5,
        overall_contribution: 5,
        participation: 5
      },
      overall_feedback: 'Sufficient feedback',
      evaluation_token: 'token'
    });

    expect(evaluation.validateSync().errors['ratings.participation']).toBeDefined();
  });

  it('defines the compound student uniqueness index for a course', () => {
    expect(Student.schema.indexes()).toContainEqual([
      { student_id: 1, course_id: 1 },
      expect.objectContaining({ unique: true })
    ]);
  });

  it('defaults new courses and teams to active with zero counts', () => {
    const course = new Course();
    const team = new Team();

    expect(course.course_status).toBe('Active');
    expect(course.student_count).toBe(0);
    expect(course.team_count).toBe(0);
    expect(team.team_status).toBe('Active');
    expect(team.student_count).toBe(0);
    expect(team.students).toEqual([]);
  });
});
