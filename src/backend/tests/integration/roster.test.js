// These tests cover importing and managing a course roster.
// TLDR: exercise course-scoped requests, then inspect saved records and
//       relationships for successful and rejected changes.

import { describe, expect, it } from 'vitest';
import { jsonRequest, useIntegrationFixture } from './api.js';

const ratings = {
  professionalism: 4,
  communication: 4,
  work_ethic: 4,
  content_knowledge_skills: 4,
  overall_contribution: 4,
  participation: 3,
};

// These cases cross the real HTTP boundary and inspect MongoDB separately.
// Snapshots include all fixture collections so rejected writes cannot silently
// mutate a team, counter, or evaluation while returning the expected error.
describe('Roster API and database integration', () => {
  const state = useIntegrationFixture();
  const path = (suffix = '') =>
    `/api/courses/${state.fixture.course._id}/students${suffix}`;
  const request = (method, suffix, body) =>
    jsonRequest(method, path(suffix), body, state.token);

  async function snapshot() {
    const entries = await Promise.all(
      Object.entries(state.context.models).map(async ([name, model]) => [
        name,
        await model.find({}).sort({ _id: 1 }).lean(),
      ]),
    );
    return JSON.parse(JSON.stringify(Object.fromEntries(entries)));
  }

  async function evaluation(course, recipient, evaluator, token) {
    return state.context.models.Evaluation.create({
      course_id: course._id,
      student_id: recipient._id,
      evaluator_id: evaluator._id,
      ratings,
      overall_feedback: 'Synthetic, detailed feedback for integration checks.',
      evaluation_token: token,
    });
  }

  async function foreignCourse() {
    const { Course, Student, Team } = state.context.models;
    const course = await Course.create({
      course_name: 'Unrelated Roster',
      course_number: 'TEST 2000',
      course_section: '02',
      semester: 'Test Semester',
      professor_id: state.fixture.professor._id,
      student_count: 2,
      team_count: 1,
    });
    const team = await Team.create({
      team_name: 'Unrelated Team',
      course_id: course._id,
      student_count: 2,
    });
    const students = await Student.create(
      [1, 2].map((number) => ({
        student_id: `OTHER${number}`,
        name: `Other Student ${number}`,
        email: `other-roster-${number}@example.com`,
        course_id: course._id,
        team_id: team._id,
        evaluation_token: `other-roster-token-${number}`,
      })),
    );
    team.students = students.map((student) => student._id);
    await team.save();
    const record = await evaluation(
      course,
      students[0],
      students[1],
      'foreign',
    );
    return { course, team, students, record };
  }

  async function foreignSnapshot(foreign) {
    const { Course, Team, Student, Evaluation } = state.context.models;
    return JSON.parse(
      JSON.stringify({
        course: await Course.findById(foreign.course._id).lean(),
        team: await Team.findById(foreign.team._id).lean(),
        students: await Student.find({ course_id: foreign.course._id })
          .sort({ _id: 1 })
          .lean(),
        evaluations: await Evaluation.find({ course_id: foreign.course._id })
          .sort({ _id: 1 })
          .lean(),
      }),
    );
  }

  it('OP-33-07 imports multipart CSV, links teams and resets only selected evaluation state', async () => {
    const { Student, Team, Course, Evaluation } = state.context.models;
    const { course, students } = state.fixture;
    const foreign = await foreignCourse();
    const unchanged = await foreignSnapshot(foreign);
    await Student.updateMany(
      { course_id: course._id },
      {
        evaluation_token: 'prior-roster-token',
        invitation_accepted_at: new Date('2026-01-01T00:00:00.000Z'),
      },
    );
    await evaluation(course, students[0], students[1], 'prior-roster-token');
    const form = new FormData();
    form.append(
      'file',
      new Blob(
        [
          'student_id,name,email,team_name\nCSV001,"Quoted, Student",CSV001@EXAMPLE.COM,Imported Team\nCSV002,Unassigned Student,csv002@example.com,\n',
        ],
        { type: 'text/csv' },
      ),
      'synthetic-roster.csv',
    );
    const response = await jsonRequest(
      'POST',
      `/api/courses/${course._id}/roster`,
      form,
      state.token,
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      students: ['CSV001', 'CSV002'],
      teams_created: 1,
      evaluations_cleared: 1,
      evaluation_state_reset: true,
      errors: [],
    });
    const imported = await Student.findOne({
      course_id: course._id,
      student_id: 'CSV001',
    });
    const unassigned = await Student.findOne({
      course_id: course._id,
      student_id: 'CSV002',
    });
    const team = await Team.findOne({
      course_id: course._id,
      team_name: 'Imported Team',
    });
    expect(imported).toMatchObject({
      name: 'Quoted, Student',
      email: 'csv001@example.com',
      group_assignment: 'Imported Team',
    });
    expect(imported.team_id.toString()).toBe(team.id);
    expect(team.students.map(String)).toEqual([imported.id]);
    expect(team.student_count).toBe(1);
    expect(unassigned.team_id).toBeNull();
    expect(await Student.countDocuments({ course_id: course._id })).toBe(4);
    expect((await Course.findById(course._id)).toObject()).toMatchObject({
      student_count: 4,
      team_count: 2,
    });
    expect(
      await Student.countDocuments({
        course_id: course._id,
        evaluation_token: { $ne: null },
      }),
    ).toBe(0);
    expect(
      await Student.countDocuments({
        course_id: course._id,
        invitation_accepted_at: { $exists: true },
      }),
    ).toBe(0);
    expect(await Evaluation.countDocuments({ course_id: course._id })).toBe(0);
    expect(await foreignSnapshot(foreign)).toEqual(unchanged);
  });

  it('OP-33-07 rejects uploads without a file without changing stored records', async () => {
    const before = await snapshot();
    const response = await jsonRequest(
      'POST',
      `/api/courses/${state.fixture.course._id}/roster`,
      {},
      state.token,
    );
    expect(response.status).toBe(400);
    expect(await snapshot()).toEqual(before);
  });

  it('OP-33-08 lists exactly the selected course roster from MongoDB', async () => {
    await foreignCourse();
    const expected = await state.context.models.Student.find({
      course_id: state.fixture.course._id,
    })
      .sort({ student_id: 1 })
      .lean();
    const response = await request('GET', '');
    expect(response.status).toBe(200);
    expect(
      response.body.sort((a, b) => a.student_id.localeCompare(b.student_id)),
    ).toEqual(JSON.parse(JSON.stringify(expected)));
  });

  it('OP-33-09 adds a normalized student with a new team and updates counters', async () => {
    const { Student, Team, Course } = state.context.models;
    const response = await request('POST', '', {
      student_id: 'ADD001',
      name: ' Added Student ',
      email: 'ADDED@EXAMPLE.COM',
      group_assignment: 'New Team',
    });
    expect(response.status).toBe(201);
    const student = await Student.findById(response.body.student._id);
    const team = await Team.findOne({
      course_id: state.fixture.course._id,
      team_name: 'New Team',
    });
    expect(student).toMatchObject({
      student_id: 'ADD001',
      name: 'Added Student',
      email: 'added@example.com',
      group_assignment: 'New Team',
    });
    expect(student.course_id.toString()).toBe(state.fixture.course.id);
    expect(student.team_id.toString()).toBe(team.id);
    expect(team.students.map(String)).toEqual([student.id]);
    expect(team.student_count).toBe(1);
    expect(
      (await Course.findById(state.fixture.course._id)).toObject(),
    ).toMatchObject({ student_count: 3, team_count: 2 });
  });

  it('OP-33-09 adds an unassigned student without creating a team', async () => {
    const { Student, Team, Course } = state.context.models;
    const response = await request('POST', '', {
      student_id: 'ADD002',
      name: 'No Team',
      email: 'no-team@example.com',
    });
    expect(response.status).toBe(201);
    const student = await Student.findById(response.body.student._id);
    expect(student).toMatchObject({
      student_id: 'ADD002',
      team_id: null,
      group_assignment: null,
    });
    expect(
      await Team.countDocuments({ course_id: state.fixture.course._id }),
    ).toBe(1);
    expect(
      (await Course.findById(state.fixture.course._id)).student_count,
    ).toBe(3);
  });

  it('OP-33-09 rejects a duplicate student ID before creating a proposed team', async () => {
    const before = await snapshot();
    const response = await request('POST', '', {
      student_id: state.fixture.students[0].student_id,
      name: 'Duplicate',
      email: 'duplicate@example.com',
      group_assignment: 'Must Not Exist',
    });
    expect(response.status).toBe(409);
    expect(await snapshot()).toEqual(before);
  });

  it('OP-33-10 edits student details and moves membership and counters to a new team', async () => {
    const { Student, Team, Course } = state.context.models;
    const student = state.fixture.students[0];
    const response = await request('PUT', `/${student._id}`, {
      name: 'Moved Student',
      email: 'moved@example.com',
      group_assignment: 'Destination Team',
    });
    expect(response.status).toBe(200);
    const updated = await Student.findById(student._id);
    const destination = await Team.findOne({
      course_id: state.fixture.course._id,
      team_name: 'Destination Team',
    });
    const original = await Team.findById(state.fixture.team._id);
    expect(updated).toMatchObject({
      name: 'Moved Student',
      email: 'moved@example.com',
      group_assignment: 'Destination Team',
    });
    expect(updated.team_id.toString()).toBe(destination.id);
    expect(destination.students.map(String)).toEqual([student.id]);
    expect(destination.student_count).toBe(1);
    expect(original.students.map(String)).toEqual([
      state.fixture.students[1].id,
    ]);
    expect(original.student_count).toBe(1);
    expect(
      (await Course.findById(state.fixture.course._id)).toObject(),
    ).toMatchObject({ student_count: 2, team_count: 2 });
  });

  it('OP-33-10 retains team membership when editing only name and email', async () => {
    const { Student, Team } = state.context.models;
    const student = state.fixture.students[0];
    const teamBefore = JSON.parse(
      JSON.stringify(await Team.findById(state.fixture.team._id).lean()),
    );
    const response = await request('PUT', `/${student._id}`, {
      name: 'Renamed Student',
      email: 'renamed@example.com',
    });
    expect(response.status).toBe(200);
    const updated = await Student.findById(student._id);
    expect(updated).toMatchObject({
      name: 'Renamed Student',
      email: 'renamed@example.com',
      group_assignment: student.group_assignment,
    });
    expect(updated.team_id.toString()).toBe(state.fixture.team.id);
    expect(
      JSON.parse(
        JSON.stringify(await Team.findById(state.fixture.team._id).lean()),
      ),
    ).toEqual(teamBefore);
  });

  it('OP-33-11 deletes a student and incoming/outgoing evaluations while preserving another course', async () => {
    const { Student, Team, Course, Evaluation } = state.context.models;
    const { course, students } = state.fixture;
    await evaluation(course, students[0], students[1], 'incoming');
    await evaluation(course, students[1], students[0], 'outgoing');
    const foreign = await foreignCourse();
    const unchanged = await foreignSnapshot(foreign);
    const response = await request('DELETE', `/${students[0]._id}`);
    expect(response.status).toBe(200);
    expect(await Student.findById(students[0]._id)).toBeNull();
    expect(await Evaluation.countDocuments({ course_id: course._id })).toBe(0);
    const team = await Team.findById(state.fixture.team._id);
    expect(team.students.map(String)).toEqual([students[1].id]);
    expect(team.student_count).toBe(1);
    expect((await Course.findById(course._id)).student_count).toBe(1);
    expect(await foreignSnapshot(foreign)).toEqual(unchanged);
  });

  it('OP-33-12 bulk-deletes selected students and both evaluation directions only in this course', async () => {
    const { Student, Team, Course, Evaluation } = state.context.models;
    const { course, students } = state.fixture;
    const retained = await Student.create({
      student_id: 'RETAIN001',
      name: 'Retained Student',
      email: 'retain@example.com',
      course_id: course._id,
    });
    await evaluation(course, students[0], retained, 'bulk-incoming');
    await evaluation(course, retained, students[0], 'bulk-outgoing');
    const keep = await evaluation(
      course,
      retained,
      retained,
      'retained-evaluation',
    );
    const foreign = await foreignCourse();
    const unchanged = await foreignSnapshot(foreign);
    const response = await request('POST', '/bulk-delete', {
      student_ids: [
        ...students.map((student) => student.id),
        foreign.students[0].id,
      ],
    });
    expect(response.status).toBe(200);
    expect(response.body.deleted_count).toBe(2);
    expect(
      (await Student.find({ course_id: course._id })).map(
        (student) => student.id,
      ),
    ).toEqual([retained.id]);
    expect(
      (await Evaluation.find({ course_id: course._id })).map(
        (record) => record.id,
      ),
    ).toEqual([keep.id]);
    const team = await Team.findById(state.fixture.team._id);
    expect(team.students).toHaveLength(0);
    expect(team.student_count).toBe(0);
    expect((await Course.findById(course._id)).student_count).toBe(1);
    expect(await foreignSnapshot(foreign)).toEqual(unchanged);
  });

  it('OP-33-12 rejects empty bulk selection without any mutations', async () => {
    const before = await snapshot();
    const response = await request('POST', '/bulk-delete', { student_ids: [] });
    expect(response.status).toBe(400);
    expect(await snapshot()).toEqual(before);
  });

  it('OP-33-13 clears students, teams and evaluations only for the selected populated course', async () => {
    const { Student, Team, Course, Evaluation } = state.context.models;
    const { course, students } = state.fixture;
    await evaluation(course, students[0], students[1], 'clear-roster');
    const foreign = await foreignCourse();
    const unchanged = await foreignSnapshot(foreign);
    const response = await request('DELETE', '');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      deleted_students: 2,
      deleted_evaluations: 1,
      deleted_teams: 1,
    });
    expect(await Student.countDocuments({ course_id: course._id })).toBe(0);
    expect(await Team.countDocuments({ course_id: course._id })).toBe(0);
    expect(await Evaluation.countDocuments({ course_id: course._id })).toBe(0);
    expect((await Course.findById(course._id)).toObject()).toMatchObject({
      student_count: 0,
      team_count: 0,
    });
    expect(await foreignSnapshot(foreign)).toEqual(unchanged);
  });
});
