import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import csv from 'csv-parser';

function parseRoster(input) {
  return new Promise((resolve, reject) => {
    const rows = [];

    Readable.from([input])
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function normalizeRow(row) {
  const teamAssignment = (
    row.team_name || row.group_assignment || row.group || ''
  ).trim() || null;

  return {
    student_id: row.student_id?.trim(),
    name: row.name?.trim(),
    email: row.email?.trim(),
    group_assignment: teamAssignment
  };
}

describe('roster CSV parsing', () => {
  it('parses required fields and the preferred team_name column', async () => {
    const [row] = await parseRoster(
      'student_id,name,email,team_name\nS001,"Student, One",student@example.test,Team A\n'
    );

    expect(normalizeRow(row)).toEqual({
      student_id: 'S001',
      name: 'Student, One',
      email: 'student@example.test',
      group_assignment: 'Team A'
    });
  });

  it('supports legacy group_assignment and group team columns', async () => {
    const rows = await parseRoster(
      'student_id,name,email,group_assignment\nS001,Student One,one@example.test,Team A\n'
    );
    const legacyRows = await parseRoster(
      'student_id,name,email,group\nS002,Student Two,two@example.test,Team B\n'
    );

    expect(normalizeRow(rows[0]).group_assignment).toBe('Team A');
    expect(normalizeRow(legacyRows[0]).group_assignment).toBe('Team B');
  });

  it('normalizes blank team assignments to null', async () => {
    const [row] = await parseRoster(
      'student_id,name,email,team_name\nS001,Student One,student@example.test,   \n'
    );

    expect(normalizeRow(row).group_assignment).toBeNull();
  });

  it('makes missing required values detectable', async () => {
    const [row] = await parseRoster(
      'student_id,name,email\nS001,,student@example.test\n'
    );
    const normalized = normalizeRow(row);

    expect(normalized.student_id).toBe('S001');
    expect(normalized.name).toBe('');
    expect(normalized.email).toBe('student@example.test');
    expect(!normalized.student_id || !normalized.name || !normalized.email).toBe(true);
  });
});
