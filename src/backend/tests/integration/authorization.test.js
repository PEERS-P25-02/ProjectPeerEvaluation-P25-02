/*
 * Authorization checks use two real professor accounts and separate courses.
 * Rejected requests compare every application collection and the legacy reports
 * collection so a hidden write cannot pass by returning the expected status.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { jsonRequest, useIntegrationFixture, waitForMessages } from './api.js';

const state = useIntegrationFixture();
const secondAccount = {
  email: 'authorization-professor@example.com',
  password: 'AuthorizationFixture123!',
};
const capabilityToken = 'authorization-evaluation-capability';
const ratings = {
  professionalism: 4,
  communication: 4,
  work_ethic: 4,
  content_knowledge_skills: 4,
  overall_contribution: 4,
  participation: 3,
};
const normalized = (value) => JSON.parse(JSON.stringify(value));

async function databaseSnapshot() {
  const data = {};
  for (const [name, model] of Object.entries(state.context.models)) {
    data[name] = await model.find({}).sort({ _id: 1 }).lean();
  }
  data.reports = await state.context.connection.db
    .collection('reports')
    .find({})
    .sort({ _id: 1 })
    .toArray();
  return normalized(data);
}

async function secondProfessorFixture() {
  const { Professor, Course, Team, Student } = state.context.models;
  const professor = await Professor.create({
    name: 'Authorization Professor',
    email: secondAccount.email,
    password: await bcrypt.hash(secondAccount.password, 10),
    department: 'Synthetic Testing',
  });
  const course = await Course.create({
    course_name: 'Authorization Other Course',
    course_number: 'AUTH 2000',
    course_section: '02',
    semester: 'Test Semester',
    professor_id: professor._id,
    student_count: 2,
    team_count: 1,
  });
  const team = await Team.create({
    team_name: 'Authorization Other Team',
    course_id: course._id,
    student_count: 2,
  });
  const students = await Student.create(
    [1, 2].map((number) => ({
      student_id: `AUTH00${number}`,
      name: `Authorization Student ${number}`,
      email: `authorization-student-${number}@example.com`,
      course_id: course._id,
      team_id: team._id,
      evaluation_token: `authorization-token-${number}`,
    })),
  );
  team.students = students.map((student) => student._id);
  await team.save();
  const login = await jsonRequest('POST', '/api/auth/login', secondAccount);
  if (login.status !== 200 || typeof login.body.access_token !== 'string') {
    throw new Error('Second professor fixture login failed');
  }
  return { professor, course, team, students, token: login.body.access_token };
}

describe('professor authorization across course resources', () => {
  const fixture = state;
  let other;

  beforeEach(async () => {
    other = await secondProfessorFixture();
  });

  it('lists only each professor’s courses and allows own course reads and updates', async () => {
    const ownList = await jsonRequest(
      'GET',
      '/api/courses',
      undefined,
      fixture.token,
    );
    const otherList = await jsonRequest(
      'GET',
      '/api/courses',
      undefined,
      other.token,
    );
    expect(ownList.status).toBe(200);
    expect(ownList.body.map((course) => course._id)).toEqual([
      fixture.fixture.course.id,
    ]);
    expect(otherList.status).toBe(200);
    expect(otherList.body.map((course) => course._id)).toEqual([
      other.course.id,
    ]);

    for (const [course, token] of [
      [fixture.fixture.course, fixture.token],
      [other.course, other.token],
    ]) {
      const read = await jsonRequest(
        'GET',
        `/api/courses/${course.id}`,
        undefined,
        token,
      );
      expect(read.status).toBe(200);
      const update = await jsonRequest(
        'PUT',
        `/api/courses/${course.id}`,
        { course_name: `${course.course_name} Updated` },
        token,
      );
      expect(update.status).toBe(200);
      expect(
        (await state.context.models.Course.findById(course._id).lean())
          .course_name,
      ).toBe(`${course.course_name} Updated`);
      const roster = await jsonRequest(
        'GET',
        `/api/courses/${course.id}/students`,
        undefined,
        token,
      );
      const teams = await jsonRequest(
        'GET',
        `/api/courses/${course.id}/teams`,
        undefined,
        token,
      );
      expect(roster.status).toBe(200);
      expect(roster.body).toHaveLength(2);
      expect(teams.status).toBe(200);
      expect(teams.body).toHaveLength(1);
    }
  });

  it('ignores ownership, identity, and relationship fields in own-resource updates and team creation', async () => {
    const own = fixture.fixture;
    const foreignBefore = normalized({
      course: await state.context.models.Course.findById(
        other.course._id,
      ).lean(),
      team: await state.context.models.Team.findById(other.team._id).lean(),
      students: await state.context.models.Student.find({
        course_id: other.course._id,
      })
        .sort({ _id: 1 })
        .lean(),
    });
    const courseUpdate = await jsonRequest(
      'PUT',
      `/api/courses/${own.course.id}`,
      {
        course_name: 'Allowed Course Edit',
        professor_id: other.professor.id,
        course_id: other.course.id,
        $set: { professor_id: other.professor.id },
      },
      fixture.token,
    );
    expect(courseUpdate.status).toBe(200);
    const storedCourse = await state.context.models.Course.findById(
      own.course._id,
    ).lean();
    expect(String(storedCourse.professor_id)).toBe(own.professor.id);
    expect(String(storedCourse._id)).toBe(own.course.id);
    expect(storedCourse.course_name).toBe('Allowed Course Edit');

    const teamUpdate = await jsonRequest(
      'PUT',
      `/api/courses/${own.course.id}/teams/${own.team.id}`,
      {
        team_name: 'Allowed Team Edit',
        course_id: other.course.id,
        students: [],
        student_count: 0,
      },
      fixture.token,
    );
    expect(teamUpdate.status).toBe(200);
    const storedTeam = await state.context.models.Team.findById(
      own.team._id,
    ).lean();
    expect(String(storedTeam.course_id)).toBe(own.course.id);
    expect(storedTeam.students.map(String).sort()).toEqual(
      own.students.map((student) => student.id).sort(),
    );
    expect(storedTeam.student_count).toBe(2);
    expect(storedTeam.team_name).toBe('Allowed Team Edit');

    const created = await jsonRequest(
      'POST',
      `/api/courses/${own.course.id}/teams`,
      { teams: [{ team_name: 'Owned Create', course_id: other.course.id }] },
      fixture.token,
    );
    expect(created.status).toBe(201);
    const [newTeam] = await state.context.models.Team.find({
      _id: { $in: created.body.teams },
    }).lean();
    expect(String(newTeam.course_id)).toBe(own.course.id);
    expect(
      normalized({
        course: await state.context.models.Course.findById(
          other.course._id,
        ).lean(),
        team: await state.context.models.Team.findById(other.team._id).lean(),
        students: await state.context.models.Student.find({
          course_id: other.course._id,
        })
          .sort({ _id: 1 })
          .lean(),
      }),
    ).toEqual(foreignBefore);
  });

  it('keeps an updated student in its course and preserves server-managed state', async () => {
    const own = fixture.fixture;
    const student = own.students[0];
    await state.context.models.Student.findByIdAndUpdate(student._id, {
      evaluation_token: 'server-owned-capability',
      evaluation_completed: false,
    });
    const foreignBefore = normalized({
      course: await state.context.models.Course.findById(
        other.course._id,
      ).lean(),
      team: await state.context.models.Team.findById(other.team._id).lean(),
      students: await state.context.models.Student.find({
        course_id: other.course._id,
      })
        .sort({ _id: 1 })
        .lean(),
    });
    const response = await jsonRequest(
      'PUT',
      `/api/courses/${own.course.id}/students/${student.id}`,
      {
        name: 'Allowed Student Edit',
        course_id: other.course.id,
        team_id: other.team.id,
        evaluation_token: 'attacker-controlled-token',
        evaluation_completed: true,
        $set: { course_id: other.course.id, evaluation_completed: true },
      },
      fixture.token,
    );
    expect(response.status).toBe(200);
    const stored = await state.context.models.Student.findById(
      student._id,
    ).lean();
    expect(String(stored._id)).toBe(student.id);
    expect(String(stored.course_id)).toBe(own.course.id);
    expect(String(stored.team_id)).toBe(own.team.id);
    expect(stored.evaluation_token).toBe('server-owned-capability');
    expect(stored.evaluation_completed).toBe(false);
    expect(stored.name).toBe('Allowed Student Edit');
    expect(
      normalized({
        course: await state.context.models.Course.findById(
          other.course._id,
        ).lean(),
        team: await state.context.models.Team.findById(other.team._id).lean(),
        students: await state.context.models.Student.find({
          course_id: other.course._id,
        })
          .sort({ _id: 1 })
          .lean(),
      }),
    ).toEqual(foreignBefore);
  });

  it('ignores team identity, course, roster, and counter fields on creation', async () => {
    const own = fixture.fixture;
    const foreignBefore = normalized({
      course: await state.context.models.Course.findById(
        other.course._id,
      ).lean(),
      team: await state.context.models.Team.findById(other.team._id).lean(),
      students: await state.context.models.Student.find({
        course_id: other.course._id,
      })
        .sort({ _id: 1 })
        .lean(),
    });
    const submittedTeamId = new state.context.models.Team().id;
    const result = await jsonRequest(
      'POST',
      `/api/courses/${own.course.id}/teams`,
      {
        teams: [
          {
            _id: submittedTeamId,
            team_name: 'Injection Probe Team',
            course_id: other.course.id,
            students: [other.students[0].id],
            student_count: 77,
          },
        ],
      },
      fixture.token,
    );
    expect(result.status).toBe(201);
    const [created] = await state.context.models.Team.find({
      team_name: 'Injection Probe Team',
      course_id: own.course._id,
    }).lean();
    expect(created).toBeDefined();
    expect(String(created._id)).not.toBe(submittedTeamId);
    expect(String(created.course_id)).toBe(own.course.id);
    expect(created.students).toEqual([]);
    expect(created.student_count).toBe(0);
    expect(
      normalized({
        course: await state.context.models.Course.findById(
          other.course._id,
        ).lean(),
        team: await state.context.models.Team.findById(other.team._id).lean(),
        students: await state.context.models.Student.find({
          course_id: other.course._id,
        })
          .sort({ _id: 1 })
          .lean(),
      }),
    ).toEqual(foreignBefore);
  });

  it('creates a course for the authenticated professor despite a submitted owner ID', async () => {
    const input = {
      course_name: 'Authenticated Owner Course',
      course_number: 'AUTH 3000',
      course_section: '03',
      semester: 'Test Semester',
      professor_id: other.professor.id,
    };
    const response = await jsonRequest(
      'POST',
      '/api/courses',
      input,
      fixture.token,
    );
    expect(response.status).toBe(201);
    const created = await state.context.models.Course.findById(
      response.body.id,
    ).lean();
    expect(String(created.professor_id)).toBe(fixture.fixture.professor.id);
    expect(created.course_name).toBe(input.course_name);
  });

  it.each([
    [
      'course',
      (own) => `/api/courses/${own.course.id}`,
      (foreign) => foreign.course.id,
      'Course',
    ],
    [
      'team',
      (own) => `/api/courses/${own.course.id}/teams/${own.team.id}`,
      (foreign) => foreign.team.id,
      'Team',
    ],
    [
      'student',
      (own) => `/api/courses/${own.course.id}/students/${own.students[0].id}`,
      (foreign) => foreign.students[0].id,
      'Student',
    ],
  ])(
    'ignores an attempted %s identity mutation',
    async (_kind, path, foreignId, modelName) => {
      const own = fixture.fixture;
      const ownId =
        modelName === 'Course'
          ? own.course.id
          : modelName === 'Team'
            ? own.team.id
            : own.students[0].id;
      const before = await databaseSnapshot();
      const response = await jsonRequest(
        'PUT',
        path(own),
        { _id: foreignId(other) },
        fixture.token,
      );
      expect(response.status).toBe(200);
      expect(
        String(
          (await state.context.models[modelName].findById(ownId).lean())._id,
        ),
      ).toBe(ownId);
      expect(await databaseSnapshot()).toEqual(before);
    },
  );

  const deniedRequests = [
    ['course read', 'GET', (c) => `/api/courses/${c.id}`],
    [
      'course update',
      'PUT',
      (c) => `/api/courses/${c.id}`,
      { course_name: 'Unauthorized Change' },
    ],
    ['course deactivate', 'DELETE', (c) => `/api/courses/${c.id}`],
    [
      'roster upload',
      'POST',
      (c) => `/api/courses/${c.id}/roster`,
      () => {
        const form = new FormData();
        form.append(
          'file',
          new Blob([
            'student_id,name,email\nAUTH003,Blocked,blocked@example.com',
          ]),
          'roster.csv',
        );
        return form;
      },
    ],
    ['roster list', 'GET', (c) => `/api/courses/${c.id}/students`],
    [
      'roster add',
      'POST',
      (c) => `/api/courses/${c.id}/students`,
      { student_id: 'NEW001', name: 'New Student', email: 'new@example.com' },
    ],
    [
      'roster update',
      'PUT',
      (c, f) => `/api/courses/${c.id}/students/${f.students[0].id}`,
      { name: 'Changed' },
    ],
    [
      'roster delete',
      'DELETE',
      (c, f) => `/api/courses/${c.id}/students/${f.students[0].id}`,
    ],
    [
      'roster bulk delete',
      'POST',
      (c, f) => `/api/courses/${c.id}/students/bulk-delete`,
      (c, f) => ({ student_ids: f.students.map((student) => student.id) }),
    ],
    ['roster delete all', 'DELETE', (c) => `/api/courses/${c.id}/students`],
    ['course report', 'GET', (c) => `/api/courses/${c.id}/reports`],
    ['report CSV', 'GET', (c) => `/api/courses/${c.id}/reports/download`],
    [
      'student report',
      'GET',
      (c, f) =>
        `/api/courses/${c.id}/reports/student/${f.students[0].student_id}`,
    ],
    [
      'team report',
      'GET',
      (c, f) => `/api/courses/${c.id}/reports/team/${f.team.id}`,
    ],
    [
      'report generation',
      'POST',
      (c) => `/api/courses/${c.id}/reports/generate`,
    ],
    [
      'send course invitations',
      'POST',
      (c) => `/api/courses/${c.id}/evaluations/send`,
    ],
    [
      'send team invitations',
      'POST',
      (c, f) => `/api/courses/${c.id}/teams/${f.team.id}/evaluations/send`,
    ],
    [
      'evaluation status',
      'GET',
      (c) => `/api/courses/${c.id}/evaluations/status`,
    ],
    [
      'send reminders',
      'POST',
      (c) => `/api/courses/${c.id}/evaluations/remind`,
    ],
    [
      'reset evaluations',
      'DELETE',
      (c) => `/api/courses/${c.id}/evaluations/reset`,
    ],
    ['team list', 'GET', (c) => `/api/courses/${c.id}/teams`],
    [
      'team create',
      'POST',
      (c) => `/api/courses/${c.id}/teams`,
      { teams: [{ team_name: 'Unauthorized Team' }] },
    ],
    [
      'team update',
      'PUT',
      (c, f) => `/api/courses/${c.id}/teams/${f.team.id}`,
      { team_name: 'Unauthorized Rename' },
    ],
    [
      'team delete',
      'DELETE',
      (c, f) => `/api/courses/${c.id}/teams/${f.team.id}`,
    ],
    ['team clear', 'DELETE', (c) => `/api/courses/${c.id}/teams`],
    [
      'team auto-assign',
      'POST',
      (c) => `/api/courses/${c.id}/teams/auto-assign`,
    ],
    [
      'team add member',
      'POST',
      (c, f) =>
        `/api/courses/${c.id}/teams/${f.team.id}/students/${f.students[0].id}`,
    ],
    [
      'team remove member',
      'DELETE',
      (c, f) =>
        `/api/courses/${c.id}/teams/${f.team.id}/students/${f.students[0].id}`,
    ],
  ];

  it.each(deniedRequests)(
    'denies other-professor %s without disclosing or changing data',
    async (_label, method, path, body) => {
      const input =
        typeof body === 'function' ? body(other.course, other) : body;
      const before = await databaseSnapshot();
      const result = await jsonRequest(
        method,
        path(other.course, other),
        input,
        fixture.token,
      );
      expect(result.status).toBe(404);
      expect(result.body.error.code).toBe('NOT_FOUND');
      expect(JSON.stringify(result.body).toLowerCase()).not.toContain(
        other.course.id.toLowerCase(),
      );
      expect(await databaseSnapshot()).toEqual(before);
      expect(await waitForMessages(0)).toEqual([]);
    },
  );

  const foreignChildRequests = [
    [
      'roster update with foreign student ID',
      'PUT',
      (own, foreign) =>
        `/api/courses/${own.id}/students/${foreign.students[0].id}`,
      { name: 'Injected' },
    ],
    [
      'team update with foreign team ID',
      'PUT',
      (own, foreign) => `/api/courses/${own.id}/teams/${foreign.team.id}`,
      { team_name: 'Injected' },
    ],
    [
      'team membership with foreign child IDs',
      'POST',
      (own, foreign) =>
        `/api/courses/${own.id}/teams/${foreign.team.id}/students/${foreign.students[0].id}`,
    ],
    [
      'student report with foreign student ID',
      'GET',
      (own, foreign) =>
        `/api/courses/${own.id}/reports/student/${foreign.students[0].student_id}`,
    ],
    [
      'team report with foreign team ID',
      'GET',
      (own, foreign) =>
        `/api/courses/${own.id}/reports/team/${foreign.team.id}`,
    ],
  ];

  it.each(foreignChildRequests)(
    'rejects %s without writing',
    async (_label, method, path, body) => {
      const own = fixture.fixture.course;
      const before = await databaseSnapshot();
      const result = await jsonRequest(
        method,
        path(own, other),
        body,
        fixture.token,
      );
      expect(result.status).toBe(404);
      expect(result.body.error.code).toBe('NOT_FOUND');
      expect(await databaseSnapshot()).toEqual(before);
    },
  );

  function entry(studentId) {
    return {
      student_id: String(studentId),
      ratings: { ...ratings },
      overall_feedback: 'Synthetic recipient authorization feedback.',
    };
  }

  async function capabilitySnapshot() {
    return databaseSnapshot();
  }

  async function assignCapability() {
    await state.context.models.Student.findByIdAndUpdate(
      fixture.fixture.students[0]._id,
      { evaluation_token: capabilityToken },
    );
  }

  it.each([
    ['self', (foreign) => [entry(fixture.fixture.students[0]._id)]],
    ['foreign-course student', (foreign) => [entry(foreign.students[0]._id)]],
    ['nonexistent student', () => [entry('000000000000000000000000')]],
    [
      'different-team student in the same course',
      async () => {
        const { Team, Student } = state.context.models;
        const team = await Team.create({
          team_name: 'Separate Authorization Team',
          course_id: fixture.fixture.course._id,
        });
        const student = await Student.create({
          student_id: 'AUTH-SAME-COURSE',
          name: 'Same Course Other Team',
          email: 'same-course-other-team@example.com',
          course_id: fixture.fixture.course._id,
          team_id: team._id,
        });
        team.students = [student._id];
        await team.save();
        return [entry(student._id)];
      },
    ],
    [
      'later foreign recipient after a valid peer',
      (foreign) => [
        entry(fixture.fixture.students[1]._id),
        entry(foreign.students[0]._id),
      ],
    ],
  ])(
    'rejects evaluation submission addressed to %s before any writes',
    async (_label, makeEntries) => {
      await assignCapability();
      const entries = await makeEntries(other);
      const before = await capabilitySnapshot();
      const response = await jsonRequest(
        'POST',
        `/api/evaluate/${capabilityToken}`,
        {
          evaluations: entries,
        },
      );
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(await capabilitySnapshot()).toEqual(before);
    },
  );

  it('allows a capability holder without a team to submit to an eligible course peer', async () => {
    await assignCapability();
    const { Student, Team } = state.context.models;
    await Student.findByIdAndUpdate(fixture.fixture.students[0]._id, {
      team_id: null,
      group_assignment: null,
    });
    await Team.findByIdAndUpdate(fixture.fixture.team._id, {
      $pull: { students: fixture.fixture.students[0]._id },
      $set: { student_count: 1 },
    });
    const response = await jsonRequest(
      'POST',
      `/api/evaluate/${capabilityToken}`,
      {
        evaluations: [entry(fixture.fixture.students[1]._id)],
      },
    );
    expect(response.status).toBe(201);
    expect(response.body.evaluations_count).toBe(1);
    const saved = await state.context.models.Evaluation.findOne().lean();
    expect(String(saved.evaluator_id)).toBe(fixture.fixture.students[0].id);
    expect(String(saved.student_id)).toBe(fixture.fixture.students[1].id);
  });

  it('invalidates the form, status, and submit capability after authorized evaluation reset', async () => {
    await assignCapability();
    const reset = await jsonRequest(
      'DELETE',
      `/api/courses/${fixture.fixture.course.id}/evaluations/reset`,
      undefined,
      fixture.token,
    );
    expect(reset.status).toBe(200);
    const afterReset = await capabilitySnapshot();
    const form = await jsonRequest('GET', `/api/evaluate/${capabilityToken}`);
    const status = await jsonRequest(
      'GET',
      `/api/evaluate/${capabilityToken}/status`,
    );
    const submit = await jsonRequest(
      'POST',
      `/api/evaluate/${capabilityToken}`,
      {
        evaluations: [entry(fixture.fixture.students[1]._id)],
      },
    );
    expect(form.status).toBe(404);
    expect(form.body.error.code).toBe('EVALUATION_CANCELLED');
    expect(status.status).toBe(404);
    expect(status.body.error.code).toBe('INVALID_TOKEN');
    expect(submit.status).toBe(404);
    expect(submit.body.error.code).toBe('EVALUATION_CANCELLED');
    expect(await capabilitySnapshot()).toEqual(afterReset);
  });
});
