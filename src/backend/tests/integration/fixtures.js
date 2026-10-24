/*
 * This file gives the environment checks a small, repeatable starting point:
 * one invented professor, one course, one team, and two students. Before adding
 * them, it clears the current run's test records and captured email.
 *
 * It checks that the database belongs to this run before clearing records and
 * keeps the database's lookup and duplicate-prevention rules in place. It also
 * refuses to take over an unmarked database that already contains information.
 *
 * The supporting parts must already be running. This file does not start or
 * stop them, and its small example dataset does not cover every application
 * feature or provide data for everyday development.
 *
 * TLDR: Mongoose fixture helpers initialize models/indexes, enforce per-run
 * ownership, seed synthetic professor/course/team/student records, and reset
 * known collections plus the isolated inbox through Mailpit's API.
 */
import { createRequire } from 'node:module';
import {
  assertOwnedDatabase,
  validateTestTarget,
} from '../helpers/integrationTarget.js';

// Use the same CommonJS model loading path as the backend.
const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const modelNames = ['Professor', 'Course', 'Student', 'Team', 'Evaluation'];

export const fixtureAccount = {
  email: 'environment-professor@example.com',
  password: 'EnvironmentCheck123!',
};

export async function openTestDatabase(environment) {
  const target = validateTestTarget(environment);
  const connection = await mongoose
    .createConnection(environment.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    .asPromise();
  try {
    const owner = await connection.db
      .collection('__test_run')
      .findOne({ _id: 'owner' });
    if (!owner) {
      // Backend startup can create empty model collections/indexes before seeding.
      // Adopt only empty application collections, never pre-existing data.
      const allowed = new Set([
        'professors',
        'courses',
        'students',
        'teams',
        'evaluations',
        'reports',
        '__test_run',
      ]);
      const collections = await connection.db.listCollections().toArray();
      for (const { name } of collections) {
        if (
          !allowed.has(name) ||
          (await connection.db.collection(name).findOne({}))
        ) {
          throw new Error(
            'Refusing to adopt an unmarked database containing data',
          );
        }
      }
      await connection.db.collection('__test_run').insertOne({
        _id: 'owner',
        runId: target.runId,
      });
    }
    await assertOwnedDatabase(connection, environment);
    const models = Object.fromEntries(
      modelNames.map((name) => [
        name,
        connection.model(name, require(`../../models/${name}.js`).schema),
      ]),
    );
    await Promise.all(Object.values(models).map((model) => model.init()));
    return { connection, models, environment };
  } catch (error) {
    await connection.close();
    throw error;
  }
}

export async function mailpitRequest(environment, path, options) {
  validateTestTarget(environment);
  const response = await fetch(`${environment.MAILPIT_API_URL}${path}`, {
    ...options,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`Mailpit request failed with HTTP ${response.status}`);
  }
  return response;
}

export async function resetTestData(context) {
  const { connection, models, environment } = context;
  await assertOwnedDatabase(connection, environment);
  // Delete only known fixture collections; retain ownership metadata and indexes.
  for (const model of Object.values(models)) {
    await model.deleteMany({});
  }
  await mailpitRequest(environment, '/api/v1/messages', { method: 'DELETE' });
}

export async function seedTestData(context) {
  await resetTestData(context);
  const { Professor, Course, Student, Team } = context.models;
  const professor = await Professor.create({
    name: 'Environment Professor',
    email: fixtureAccount.email,
    password: await bcrypt.hash(fixtureAccount.password, 10),
    department: 'Synthetic Testing',
  });
  const course = await Course.create({
    course_name: 'Environment Fixture',
    course_number: 'TEST 1000',
    course_section: '01',
    semester: 'Test Semester',
    professor_id: professor._id,
    student_count: 2,
    team_count: 1,
  });
  const team = await Team.create({
    team_name: 'Fixture Team',
    course_id: course._id,
    student_count: 2,
  });
  const students = await Student.create(
    [1, 2].map((number) => ({
      student_id: `TEST00${number}`,
      name: `Fixture Student ${number}`,
      email: `fixture-student-${number}@example.com`,
      course_id: course._id,
      team_id: team._id,
    })),
  );
  team.students = students.map((student) => student._id);
  await team.save();
  return { professor, course, team, students };
}
