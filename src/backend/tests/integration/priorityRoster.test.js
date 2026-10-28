// Priority regression cases cross HTTP and MongoDB, including partial CSV writes.
import { describe, expect, it } from 'vitest';
import { jsonRequest, useIntegrationFixture } from './api.js';

describe('Priority course and roster regressions', () => {
  const state = useIntegrationFixture();
  const normalize = (value) => JSON.parse(JSON.stringify(value));
  const base = () => `/api/courses/${state.fixture.course._id}`;
  const request = (method, suffix, body) =>
    jsonRequest(method, `${base()}${suffix}`, body, state.token);

  async function foreignCourse() {
    const { Course, Team, Student, Professor } = state.context.models;
    const professor = await Professor.create({
      name: 'Other Professor',
      email: 'other-priority-professor@example.com',
      password: state.fixture.professor.password,
      department: 'Synthetic Testing',
    });
    const course = await Course.create({
      course_name: 'Preserved Course',
      course_number: 'OTHER 2000',
      course_section: '02',
      semester: 'Synthetic Semester',
      professor_id: professor._id,
      student_count: 1,
      team_count: 1,
    });
    const team = await Team.create({
      course_id: course._id,
      team_name: 'Preserved Team',
      student_count: 1,
    });
    const student = await Student.create({
      course_id: course._id,
      student_id: 'PRESERVE001',
      name: 'Preserved Student',
      email: 'preserved@example.com',
      team_id: team._id,
      group_assignment: team.team_name,
    });
    team.students = [student._id];
    await team.save();
    return course;
  }

  async function courseSnapshot(course) {
    const { Course, Team, Student, Evaluation } = state.context.models;
    return normalize({
      course: await Course.findById(course._id).lean(),
      owner: await state.context.models.Professor.findById(
        course.professor_id,
      ).lean(),
      teams: await Team.find({ course_id: course._id }).sort({ _id: 1 }).lean(),
      students: await Student.find({ course_id: course._id })
        .sort({ _id: 1 })
        .lean(),
      evaluations: await Evaluation.find({ course_id: course._id })
        .sort({ _id: 1 })
        .lean(),
    });
  }

  async function upload(rows) {
    const form = new FormData();
    form.append(
      'file',
      new Blob([`student_id,name,email,team_name\n${rows.join('\n')}\n`], {
        type: 'text/csv',
      }),
      'priority-synthetic.csv',
    );
    return request('POST', '/roster', form);
  }

  async function expectImported(studentId, teamName) {
    const { Student, Team, Course } = state.context.models;
    const student = await Student.findOne({
      course_id: state.fixture.course._id,
      student_id: studentId,
    });
    const team = await Team.findOne({
      course_id: state.fixture.course._id,
      team_name: teamName,
    });
    expect(student).not.toBeNull();
    expect(team).not.toBeNull();
    expect(String(student.team_id)).toBe(String(team._id));
    expect(student.group_assignment).toBe(teamName);
    expect(team.students.map(String)).toContain(String(student._id));
    expect(team.student_count).toBe(
      await Student.countDocuments({ team_id: team._id }),
    );
    const course = await Course.findById(state.fixture.course._id);
    expect(course.student_count).toBe(
      await Student.countDocuments({ course_id: course._id }),
    );
    expect(course.team_count).toBe(
      await Team.countDocuments({ course_id: course._id }),
    );
    return student;
  }

  it('REG-CW02-03 preserves unrelated course and owner records during a supported edit', async () => {
    const foreign = await foreignCourse();
    const before = await courseSnapshot(foreign);
    const { Course, Professor } = state.context.models;
    const ownerBefore = normalize(
      await Professor.findById(state.fixture.professor._id).lean(),
    );
    const original = normalize(
      await Course.findById(state.fixture.course._id).lean(),
    );
    const response = await request('PUT', '', {
      course_name: 'Edited Priority Course',
    });
    expect(response.status).toBe(200);
    expect(
      normalize(await Course.findById(state.fixture.course._id).lean()),
    ).toEqual({ ...original, course_name: 'Edited Priority Course' });
    expect(await courseSnapshot(foreign)).toEqual(before);
    expect(
      normalize(await Professor.findById(state.fixture.professor._id).lean()),
    ).toEqual(ownerBefore);
  });

  it('REG-CW03-03 reports incomplete CSV rows while preserving a correctly linked valid row', async () => {
    const result = await upload([
      'MIX001,Valid Mixed Student,mixed@example.com,Mixed Team',
      'MIX002,Incomplete Student,,Mixed Team',
    ]);
    expect(result.status).toBe(200);
    const saved = await expectImported('MIX001', 'Mixed Team');
    expect(saved).toMatchObject({
      name: 'Valid Mixed Student',
      email: 'mixed@example.com',
    });
    expect(
      await state.context.models.Student.countDocuments({
        course_id: state.fixture.course._id,
        student_id: 'MIX002',
      }),
    ).toBe(0);
    expect(result.body.students).toEqual(['MIX001']);
    expect(result.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('MIX002')]),
    );
  });

  it('REG-CW03-06 discloses a real duplicate-key processing failure after valid CSV rows', async () => {
    // Repeated new IDs reach unordered insertMany together, causing a real database
    // write error after valid inserts without replacing the API or model with mocks.
    const result = await upload([
      'PART001,First Valid Student,partial1@example.com,Partial Team',
      'PART002,Second Valid Student,partial2@example.com,Partial Team',
      'PART002,Duplicate Student,duplicate@example.com,Partial Team',
    ]);
    expect(result.status).toBe(200);
    await expectImported('PART001', 'Partial Team');
    await expectImported('PART002', 'Partial Team');
    expect(
      await state.context.models.Student.countDocuments({
        course_id: state.fixture.course._id,
        student_id: 'PART002',
      }),
    ).toBe(1);
    expect([...result.body.students].sort()).toEqual(['PART001', 'PART002']);
    expect(result.body.errors).toEqual([
      'Some students could not be added (possible duplicates or DB error).',
    ]);
    expect(result.body.message).toContain('Roster processed with some errors.');
  });

  it('REG-CW03-11 reads assigned and unassigned manual additions with consistent counts and another course intact', async () => {
    const foreign = await foreignCourse();
    const before = await courseSnapshot(foreign);
    const assigned = await request('POST', '/students', {
      student_id: 'MAN001',
      name: 'Assigned Manual',
      email: 'assigned-manual@example.com',
      group_assignment: 'Manual Team',
    });
    const unassigned = await request('POST', '/students', {
      student_id: 'MAN002',
      name: 'Unassigned Manual',
      email: 'unassigned-manual@example.com',
    });
    expect(assigned.status).toBe(201);
    expect(unassigned.status).toBe(201);
    const saved = await expectImported('MAN001', 'Manual Team');
    expect(saved).toMatchObject({
      name: 'Assigned Manual',
      email: 'assigned-manual@example.com',
    });
    const roster = await request('GET', '/students');
    expect(roster.status).toBe(200);
    expect(roster.body).toHaveLength(4);
    expect(roster.body).toContainEqual(
      expect.objectContaining({
        _id: String(saved._id),
        student_id: 'MAN001',
        team_id: String(saved.team_id),
        group_assignment: 'Manual Team',
      }),
    );
    const storedUnassigned = await state.context.models.Student.findById(
      unassigned.body.student._id,
    ).lean();
    expect(storedUnassigned).toMatchObject({
      student_id: 'MAN002',
      name: 'Unassigned Manual',
      email: 'unassigned-manual@example.com',
      team_id: null,
      group_assignment: null,
    });
    expect(roster.body).toContainEqual(normalize(storedUnassigned));
    expect(await courseSnapshot(foreign)).toEqual(before);
  });

  it('REG-CW04-10 returns a newly created named empty team with consistent stored counts', async () => {
    const result = await request('POST', '/teams', {
      teams: [{ team_name: 'Named Empty Priority Team' }],
    });
    expect(result.status).toBe(201);
    expect(result.body.teams).toHaveLength(1);
    const list = await request('GET', '/teams');
    expect(list.status).toBe(200);
    const team = await state.context.models.Team.findById(
      result.body.teams[0],
    ).lean();
    expect(team).toMatchObject({
      team_name: 'Named Empty Priority Team',
      students: [],
      student_count: 0,
    });
    expect(list.body).toContainEqual(
      expect.objectContaining({
        _id: String(team._id),
        team_name: team.team_name,
        students: [],
        student_count: 0,
      }),
    );
    const { Course, Team } = state.context.models;
    expect((await Course.findById(state.fixture.course._id)).team_count).toBe(
      await Team.countDocuments({ course_id: state.fixture.course._id }),
    );
    expect(list.body).toHaveLength(2);
  });
});
