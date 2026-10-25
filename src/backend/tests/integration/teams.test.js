// These tests cover creating teams and changing their membership.
// TLDR: verify both sides of student/team relationships and protect records in other
//       courses.

import { describe, expect, it } from 'vitest';
import { jsonRequest, useIntegrationFixture } from './api.js';

describe('Team API and database integration', () => {
  const state = useIntegrationFixture();
  const base = () => `/api/courses/${state.fixture.course._id}/teams`;
  const request = (method, suffix = '', body) =>
    jsonRequest(method, `${base()}${suffix}`, body, state.token);
  const normalized = (value) => JSON.parse(JSON.stringify(value));
  const ids = (values) => values.map(String).sort();

  async function snapshot() {
    // Full records expose accidental relationship/count changes on rejected requests.
    const { Course, Team, Student } = state.context.models;
    return normalized(
      await Promise.all(
        [Course, Team, Student].map((model) =>
          model.find({}).sort({ _id: 1 }).lean(),
        ),
      ),
    );
  }

  async function foreignFixture() {
    const { Course, Team, Student } = state.context.models;
    const course = await Course.create({
      course_name: 'Unrelated Course',
      course_number: 'TEST 2000',
      course_section: '02',
      semester: 'Test Semester',
      professor_id: state.fixture.professor._id,
      student_count: 1,
      team_count: 1,
    });
    const team = await Team.create({
      team_name: 'Unrelated Team',
      course_id: course._id,
      student_count: 1,
    });
    const student = await Student.create({
      student_id: 'FOREIGN001',
      name: 'Unrelated Student',
      email: 'unrelated-team-student@example.com',
      course_id: course._id,
      team_id: team._id,
      group_assignment: team.team_name,
    });
    team.students = [student._id];
    await team.save();
    return { course, team, student };
  }

  it('TEAM-01 OP-33-14 lists only course teams with actual populated members', async () => {
    await foreignFixture();
    const before = await snapshot();
    const result = await request('GET');
    expect(result.status).toBe(200);
    expect(result.body).toHaveLength(1);
    expect(result.body[0]).toMatchObject({
      _id: String(state.fixture.team._id),
      course_id: String(state.fixture.course._id),
      team_name: 'Fixture Team',
      student_count: 2,
    });
    expect(ids(result.body[0].students.map((student) => student._id))).toEqual(
      ids(state.fixture.students.map((student) => student._id)),
    );
    for (const student of state.fixture.students) {
      expect(result.body[0].students).toContainEqual(
        expect.objectContaining({
          _id: String(student._id),
          name: student.name,
          email: student.email,
        }),
      );
    }
    expect(await snapshot()).toEqual(before);
  });

  it('TEAM-02 OP-33-15 creates distinct empty teams and updates course count', async () => {
    const { Team, Course } = state.context.models;
    const result = await request('POST', '', {
      teams: [{ team_name: 'New Alpha' }, { team_name: 'New Beta' }],
    });
    expect(result.status).toBe(201);
    expect(result.body.teams).toHaveLength(2);
    expect(new Set(result.body.teams).size).toBe(2);
    const created = await Team.find({ _id: { $in: result.body.teams } })
      .sort({ team_name: 1 })
      .lean();
    expect(created.map((team) => team.team_name)).toEqual([
      'New Alpha',
      'New Beta',
    ]);
    for (const team of created) {
      expect(String(team.course_id)).toBe(String(state.fixture.course._id));
      expect(team.students).toEqual([]);
      expect(team.student_count).toBe(0);
      expect(team.team_status).toBe('Active');
    }
    expect((await Course.findById(state.fixture.course._id)).team_count).toBe(
      3,
    );
  });

  it('TEAM-03 OP-33-15 rejects empty creation without writes', async () => {
    const before = await snapshot();
    const result = await request('POST', '', { teams: [] });
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe('VALIDATION_ERROR');
    expect(await snapshot()).toEqual(before);
  });

  it('TEAM-04 OP-33-16 persists rename/status and updates student labels', async () => {
    const { Team, Student } = state.context.models;
    const result = await request('PUT', `/${state.fixture.team._id}`, {
      team_name: 'Renamed Team',
      team_status: 'Inactive',
    });
    expect(result.status).toBe(200);
    expect(result.body.team).toMatchObject({
      team_name: 'Renamed Team',
      team_status: 'Inactive',
    });
    const saved = await Team.findById(state.fixture.team._id).lean();
    expect(saved).toMatchObject({
      team_name: 'Renamed Team',
      team_status: 'Inactive',
      student_count: 2,
    });
    expect(ids(saved.students)).toEqual(ids(state.fixture.team.students));
    const students = await Student.find({
      course_id: state.fixture.course._id,
    });
    expect(students).toHaveLength(2);
    for (const student of students) {
      expect(student.group_assignment).toBe('Renamed Team');
      expect(String(student.team_id)).toBe(String(saved._id));
    }
  });

  it('TEAM-05 OP-33-17 deletes an empty team and recalculates course count', async () => {
    const { Team, Course, Student } = state.context.models;
    const empty = await Team.create({
      team_name: 'Empty Team',
      course_id: state.fixture.course._id,
    });
    await Course.updateOne(
      { _id: state.fixture.course._id },
      { team_count: 2 },
    );
    const beforeStudents = normalized(
      await Student.find({}).sort({ _id: 1 }).lean(),
    );
    const beforeTeam = normalized(
      await Team.findById(state.fixture.team._id).lean(),
    );
    const result = await request('DELETE', `/${empty._id}`);
    expect(result.status).toBe(200);
    expect(await Team.findById(empty._id)).toBeNull();
    expect((await Course.findById(state.fixture.course._id)).team_count).toBe(
      1,
    );
    expect(
      normalized(await Team.findById(state.fixture.team._id).lean()),
    ).toEqual(beforeTeam);
    expect(normalized(await Student.find({}).sort({ _id: 1 }).lean())).toEqual(
      beforeStudents,
    );
  });

  it('TEAM-06 OP-33-17 rejects populated-team deletion without writes', async () => {
    const before = await snapshot();
    const result = await request('DELETE', `/${state.fixture.team._id}`);
    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe('CONSTRAINT_ERROR');
    expect(await snapshot()).toEqual(before);
  });

  it('TEAM-07 OP-33-18 clears only course teams and unsets student assignments', async () => {
    const { Team, Student, Course } = state.context.models;
    const foreign = await foreignFixture();
    const foreignBefore = normalized(foreign);
    await Team.create({
      team_name: 'Second Team',
      course_id: state.fixture.course._id,
    });
    const result = await request('DELETE');
    expect(result.status).toBe(200);
    expect(result.body.teams_deleted).toBe(2);
    expect(
      await Team.countDocuments({ course_id: state.fixture.course._id }),
    ).toBe(0);
    const remaining = await Student.find({
      course_id: state.fixture.course._id,
    }).lean();
    expect(ids(remaining.map((student) => student._id))).toEqual(
      ids(state.fixture.students.map((student) => student._id)),
    );
    for (const student of remaining) {
      expect(student).not.toHaveProperty('team_id');
      expect(student).not.toHaveProperty('group_assignment');
    }
    const course = await Course.findById(state.fixture.course._id);
    expect(course.team_count).toBe(0);
    expect(course.student_count).toBe(2);
    expect(
      normalized({
        course: await Course.findById(foreign.course._id),
        team: await Team.findById(foreign.team._id),
        student: await Student.findById(foreign.student._id),
      }),
    ).toEqual(foreignBefore);
  });

  it('TEAM-08 OP-33-19 assigns an unassigned student consistently on both records', async () => {
    const { Student, Team, Course } = state.context.models;
    const student = await Student.create({
      student_id: 'NEW001',
      name: 'New Student',
      email: 'new-team-member@example.com',
      course_id: state.fixture.course._id,
    });
    await Course.updateOne(
      { _id: state.fixture.course._id },
      { student_count: 3 },
    );
    const result = await request(
      'POST',
      `/${state.fixture.team._id}/students/${student._id}`,
    );
    expect(result.status).toBe(200);
    const team = await Team.findById(state.fixture.team._id);
    expect(ids(team.students)).toEqual(
      ids([...state.fixture.team.students, student._id]),
    );
    expect(team.student_count).toBe(3);
    const saved = await Student.findById(student._id);
    expect(String(saved.team_id)).toBe(String(team._id));
    expect(saved.group_assignment).toBe(team.team_name);
    expect(
      (await Course.findById(state.fixture.course._id)).student_count,
    ).toBe(3);
  });

  it('TEAM-09 OP-33-19 moves a student and recalculates both team memberships', async () => {
    const { Team, Student, Course } = state.context.models;
    const foreign = await foreignFixture();
    const foreignBefore = normalized(foreign);
    const destination = await Team.create({
      team_name: 'Destination Team',
      course_id: state.fixture.course._id,
    });
    const [moved, untouched] = state.fixture.students;
    const untouchedBefore = normalized(
      await Student.findById(untouched._id).lean(),
    );
    const result = await request(
      'POST',
      `/${destination._id}/students/${moved._id}`,
    );
    expect(result.status).toBe(200);
    const oldTeam = await Team.findById(state.fixture.team._id);
    const newTeam = await Team.findById(destination._id);
    expect(ids(oldTeam.students)).toEqual([String(untouched._id)]);
    expect(oldTeam.student_count).toBe(1);
    expect(ids(newTeam.students)).toEqual([String(moved._id)]);
    expect(newTeam.student_count).toBe(1);
    const saved = await Student.findById(moved._id);
    expect(String(saved.team_id)).toBe(String(destination._id));
    expect(saved.group_assignment).toBe('Destination Team');
    expect(normalized(await Student.findById(untouched._id).lean())).toEqual(
      untouchedBefore,
    );
    expect(
      normalized({
        course: await Course.findById(foreign.course._id),
        team: await Team.findById(foreign.team._id),
        student: await Student.findById(foreign.student._id),
      }),
    ).toEqual(foreignBefore);
  });

  it('TEAM-10 OP-33-19 rejects adding an existing member without writes', async () => {
    const before = await snapshot();
    const result = await request(
      'POST',
      `/${state.fixture.team._id}/students/${state.fixture.students[0]._id}`,
    );
    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe('DUPLICATE');
    expect(await snapshot()).toEqual(before);
  });

  it('TEAM-11 OP-33-20 removes only the selected membership and clears assignment', async () => {
    const { Student, Team } = state.context.models;
    const [removed, retained] = state.fixture.students;
    const retainedBefore = normalized(
      await Student.findById(retained._id).lean(),
    );
    const result = await request(
      'DELETE',
      `/${state.fixture.team._id}/students/${removed._id}`,
    );
    expect(result.status).toBe(200);
    const team = await Team.findById(state.fixture.team._id);
    expect(ids(team.students)).toEqual([String(retained._id)]);
    expect(team.student_count).toBe(1);
    const saved = await Student.findById(removed._id);
    expect(saved.team_id).toBeNull();
    expect(saved.group_assignment).toBe('');
    expect(normalized(await Student.findById(retained._id).lean())).toEqual(
      retainedBefore,
    );
  });

  it('TEAM-12 OP-33-20 rejects removing a nonmember without writes', async () => {
    const student = await state.context.models.Student.create({
      student_id: 'UNASSIGNED001',
      name: 'Unassigned Student',
      email: 'unassigned@example.com',
      course_id: state.fixture.course._id,
    });
    const before = await snapshot();
    const result = await request(
      'DELETE',
      `/${state.fixture.team._id}/students/${student._id}`,
    );
    expect(result.status).toBe(404);
    expect(result.body.error.code).toBe('NOT_FOUND');
    expect(await snapshot()).toEqual(before);
  });

  it('TEAM-13 OP-33-19 rejects a different course student without writes', async () => {
    const foreign = await foreignFixture();
    const before = await snapshot();
    const result = await request(
      'POST',
      `/${state.fixture.team._id}/students/${foreign.student._id}`,
    );
    expect(result.status).toBe(404);
    expect(result.body.error.code).toBe('NOT_FOUND');
    expect(await snapshot()).toEqual(before);
  });
});
