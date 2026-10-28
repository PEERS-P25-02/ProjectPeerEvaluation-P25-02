// These tests cover course details, rosters, teams, and evaluation actions.
// TLDR: render the page with mocked API calls and synthetic records; mutation mocks
//       update their data so refresh behavior is observable.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CourseManagement from '../pages/CourseManagement';
import { AuthProvider } from '../contexts/AuthContext';
import api, { getCourseById } from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  getCourseById: vi.fn(),
}));

// Keep routing and auth context in place while each test controls only the API boundary.
function renderCourseManagement() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CourseManagement />
      </AuthProvider>
    </MemoryRouter>,
  );
}

const managedCourse = {
  _id: 'course-1',
  course_name: 'Software Testing',
  course_number: 'SWE 4724',
  course_section: '01',
  semester: 'Fall 2026',
  course_status: 'Active',
  student_count: 0,
  team_count: 0,
};
const rosterStudent = {
  _id: 'student-1',
  student_id: 'S001',
  name: 'Synthetic Student',
  email: 'student@example.com',
  group_assignment: '',
};

// This mutable in-memory server lets follow-up GETs prove a mutation triggered a refresh.
function mockManagedCourse({
  courses = [{ ...managedCourse }],
  students = [],
  teams = [],
  evaluationStatus = { evaluations_sent: false },
} = {}) {
  // Return current synthetic server data after mutations so the UI must actually refresh.
  const data = { courses, students, teams, evaluationStatus };
  api.get.mockImplementation(async (url) => {
    if (url === '/health') return { data: { status: 'ok' } };
    if (url.startsWith('/courses?')) return { data: [...data.courses] };
    if (url === '/courses/course-1/students')
      return { data: [...data.students] };
    if (url === '/courses/course-1/teams') return { data: [...data.teams] };
    if (url === '/courses/course-1/evaluations/status')
      return { data: data.evaluationStatus };
    throw new Error(`Unexpected course request: ${url}`);
  });
  getCourseById.mockImplementation(async (id) =>
    data.courses.find((course) => course._id === id),
  );
  return data;
}

const sentEvaluationStatus = {
  evaluations_sent: true,
  completed_count: 1,
  total_count: 2,
  students: [
    { ...rosterStudent, team: 'Team Alpha', completed: true },
    {
      _id: 'student-2',
      student_id: 'S002',
      name: 'Another Student',
      team: 'Team Alpha',
      completed: false,
    },
  ],
};

async function openEvaluationStatus(user) {
  await user.click(
    within(await loadedCourseRow()).getByTitle('Evaluation Status'),
  );
  return screen.findByRole('dialog', { name: /Evaluation Status -/ });
}

async function loadedCourseRow() {
  return (
    await screen.findByRole('cell', { name: 'Software Testing' })
  ).closest('tr');
}

async function openStudents(user) {
  await user.click(
    within(await loadedCourseRow()).getByTitle('Manage Students'),
  );
  return screen.findByRole('dialog', { name: /Manage Students for/ });
}

async function openTeams(user) {
  await user.click(within(await loadedCourseRow()).getByTitle('Manage Teams'));
  return screen.findByRole('dialog', { name: /Manage Teams for/ });
}

async function fillCourse(user, dialog, fields) {
  for (const [label, value] of Object.entries(fields)) {
    const input = within(dialog).getByRole('textbox', {
      name: new RegExp(`^${label}`),
    });
    await user.clear(input);
    await user.type(input, value);
  }
}

describe('CourseManagement', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => vi.restoreAllMocks());

  it('loads and displays the active courses', async () => {
    const course = {
      _id: 'course-1',
      course_name: 'Stale Course',
      course_number: 'SWE 4724',
      course_section: '01',
      semester: 'Fall 2026',
      course_status: 'Active',
    };

    api.get.mockResolvedValueOnce({
      data: [course],
    });

    getCourseById.mockResolvedValueOnce({
      ...course,
      course_name: 'Software Testing',
      student_count: 12,
      team_count: 3,
    });

    renderCourseManagement();

    expect(
      screen.getByRole('heading', {
        name: 'Course Management Dashboard',
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/courses?course_status=Active');
    });

    expect(getCourseById).toHaveBeenCalledWith('course-1');

    expect(
      await screen.findByRole('cell', {
        name: 'Software Testing',
      }),
    ).toBeInTheDocument();

    // Distinct refreshed values make discarding getCourseById's result detectable.
    const row = screen
      .getByRole('cell', { name: 'Software Testing' })
      .closest('tr');
    expect(within(row).getByRole('cell', { name: '12' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: '3' })).toBeInTheDocument();
    expect(
      screen.queryByRole('cell', { name: 'Stale Course' }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole('cell', {
        name: 'SWE 4724',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('cell', {
        name: '01',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('cell', {
        name: 'Fall 2026',
      }),
    ).toBeInTheDocument();
  });

  it('shows a message when no active courses are found', async () => {
    api.get.mockResolvedValueOnce({
      data: [],
    });

    renderCourseManagement();

    expect(
      await screen.findByText(
        'No courses found. Create your first course to get started.',
      ),
    ).toBeInTheDocument();
  });

  it('shows an error when courses cannot be loaded', async () => {
    api.get.mockRejectedValueOnce(new Error('Request failed'));

    renderCourseManagement();

    expect(
      await screen.findByText('Failed to fetch courses'),
    ).toBeInTheDocument();
  });
  it('creates a course and displays the refreshed course list', async () => {
    const user = userEvent.setup();
    const data = mockManagedCourse({ courses: [] });
    api.post.mockImplementationOnce(async (_url, fields) => {
      data.courses.push({
        _id: 'course-2',
        ...fields,
        course_status: 'Active',
      });
      return { data: {} };
    });
    renderCourseManagement();
    await screen.findByText(
      'No courses found. Create your first course to get started.',
    );
    await user.click(screen.getByRole('button', { name: /Create Course/ }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Create New Course',
    });
    expect(
      within(dialog).getByRole('button', { name: 'Create' }),
    ).toBeDisabled();
    await fillCourse(user, dialog, {
      'Course Name': 'New Course',
      'Course Number': 'SWE 4000',
      'Course Section': '02',
      Semester: 'Spring 2027',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(
      await screen.findByRole('cell', { name: 'New Course' }),
    ).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/courses', {
      course_name: 'New Course',
      course_number: 'SWE 4000',
      course_section: '02',
      semester: 'Spring 2027',
    });
    expect(screen.getByText('Course created successfully')).toBeInTheDocument();
  });

  it('keeps entered course details available when creation fails', async () => {
    const user = userEvent.setup();
    mockManagedCourse();
    api.post.mockRejectedValueOnce(new Error('Unavailable'));
    renderCourseManagement();
    await loadedCourseRow();
    await user.click(screen.getByRole('button', { name: /Create Course/ }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Create New Course',
    });
    await fillCourse(user, dialog, {
      'Course Name': 'New Course',
      'Course Number': 'SWE 4000',
      'Course Section': '02',
      Semester: 'Spring 2027',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(
      await screen.findByText('Failed to create course'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('textbox', { name: 'Course Name' }),
    ).toHaveValue('New Course');
    api.post.mockResolvedValueOnce({ data: {} });
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(
      await screen.findByText('Course created successfully'),
    ).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it('edits a course and displays the saved name', async () => {
    const user = userEvent.setup();
    const data = mockManagedCourse();
    api.put.mockImplementationOnce(async (_url, fields) => {
      data.courses[0] = { ...data.courses[0], ...fields };
      return { data: {} };
    });
    renderCourseManagement();
    await user.click(within(await loadedCourseRow()).getByTitle('Edit Course'));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Course' });
    await fillCourse(user, dialog, { 'Course Name': 'Updated Course' });
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByRole('cell', { name: 'Updated Course' }),
    ).toBeInTheDocument();
    expect(api.put).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1',
      expect.objectContaining({
        course_name: 'Updated Course',
        course_number: 'SWE 4724',
        course_section: '01',
        semester: 'Fall 2026',
      }),
    );
    expect(
      screen.queryByRole('cell', { name: 'Software Testing' }),
    ).not.toBeInTheDocument();
  });

  it('cancels deletion without making a request, then deletes after confirmation', async () => {
    const user = userEvent.setup();
    const data = mockManagedCourse();
    api.delete.mockImplementationOnce(async () => {
      data.courses = [];
      return { data: {} };
    });
    renderCourseManagement();
    await user.click(
      within(await loadedCourseRow()).getByTitle('Delete Course'),
    );
    let dialog = await screen.findByRole('dialog', { name: 'Delete Course' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(api.delete).not.toHaveBeenCalled();
    await user.click(
      within(await loadedCourseRow()).getByTitle('Delete Course'),
    );
    dialog = await screen.findByRole('dialog', { name: 'Delete Course' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(
      await screen.findByText(
        'No courses found. Create your first course to get started.',
      ),
    ).toBeInTheDocument();
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/courses/course-1');
  });

  it('adds a student to the selected course and refreshes its roster', async () => {
    const user = userEvent.setup();
    const data = mockManagedCourse();
    api.post.mockImplementationOnce(async (_url, fields) => {
      data.students.push({ _id: 'student-1', ...fields });
      return { data: {} };
    });
    renderCourseManagement();
    const students = await openStudents(user);
    await user.click(
      within(students).getByRole('button', { name: 'Add Student' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Add Student' });
    await user.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(
      await within(dialog).findByText(
        'Student ID, name, and email are required.',
      ),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    // These fields do not test per-keystroke behavior; paste avoids rerendering
    // the large course page for every character while exercising input changes.
    for (const [label, value] of [
      ['Student ID', 'S001'],
      ['Name', 'Synthetic Student'],
      ['Email', 'student@example.com'],
    ]) {
      const input = within(dialog).getByRole('textbox', { name: label });
      await user.click(input);
      await user.paste(value);
    }
    await user.click(within(dialog).getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    const refreshedStudents = await screen.findByRole('dialog', {
      name: /Manage Students for/,
    });
    expect(
      await within(refreshedStudents).findByRole('cell', {
        name: 'student@example.com',
      }),
    ).toBeInTheDocument();
    expect(
      api.get.mock.calls.filter(
        ([url]) => url === '/courses/course-1/students',
      ),
    ).toHaveLength(2);
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/students',
      {
        student_id: 'S001',
        name: 'Synthetic Student',
        email: 'student@example.com',
        group_assignment: '',
      },
    );
  });

  it('uploads the selected CSV as FormData and displays its result', async () => {
    const user = userEvent.setup();
    const data = mockManagedCourse();
    api.post.mockImplementationOnce(async () => {
      data.students = [rosterStudent];
      return {
        data: {
          message: 'Roster imported',
          students: ['student-1'],
          errors: [],
        },
      };
    });
    renderCourseManagement();
    const students = await openStudents(user);
    await user.click(
      within(students).getByRole('button', { name: 'Upload CSV' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Upload Student Roster (CSV)',
    });
    const file = new File(
      ['student_id,name,email\nS001,Synthetic Student,student@example.com'],
      'roster.csv',
      { type: 'text/csv' },
    );
    await user.upload(within(dialog).getByLabelText('Choose CSV File'), file);
    await user.click(within(dialog).getByRole('button', { name: 'Upload' }));
    expect(
      await within(dialog).findByText('Roster imported'),
    ).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/roster',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    expect(api.post.mock.calls[0][1].get('file')).toBe(file);
    expect(api.get).toHaveBeenCalledWith('/courses/course-1/students');
  });

  it('displays CSV processing errors and keeps the selected file for retry', async () => {
    const user = userEvent.setup();
    mockManagedCourse();
    api.post.mockRejectedValueOnce({
      response: {
        data: { error: { message: 'Missing required CSV columns' } },
      },
    });
    renderCourseManagement();
    const students = await openStudents(user);
    await user.click(
      within(students).getByRole('button', { name: 'Upload CSV' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Upload Student Roster (CSV)',
    });
    const file = new File(['invalid'], 'invalid.csv', { type: 'text/csv' });
    await user.upload(within(dialog).getByLabelText('Choose CSV File'), file);
    await user.click(within(dialog).getByRole('button', { name: 'Upload' }));
    expect(
      await within(dialog).findByText('Missing required CSV columns'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Selected: invalid.csv'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Upload' }),
    ).toBeEnabled();
  });

  it('creates a named team and reloads its count', async () => {
    const user = userEvent.setup();
    const data = mockManagedCourse();
    api.post.mockImplementationOnce(async (_url, teams) => {
      data.teams = [{ _id: 'team-1', ...teams[0], student_count: 0 }];
      data.courses[0].team_count = 1;
      return { data: {} };
    });
    renderCourseManagement();
    const teams = await openTeams(user);
    await user.click(
      within(teams).getByRole('button', { name: 'Create Team' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Create New Team',
    });
    expect(
      within(dialog).getByRole('button', { name: 'Create Team' }),
    ).toBeDisabled();
    await user.type(
      within(dialog).getByRole('textbox', { name: /^Team Name/ }),
      'Team Alpha',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Create Team' }),
    );
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/teams',
      [{ team_name: 'Team Alpha', team_status: 'Active' }],
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Create New Team' }),
      ).not.toBeInTheDocument(),
    );
    // Course refresh is behind the team modal; close it before checking the visible dashboard count.
    await user.click(
      within(
        screen.getByRole('dialog', { name: /Manage Teams for/ }),
      ).getByRole('button', { name: 'Close' }),
    );
    const row = await loadedCourseRow();
    expect(within(row).getByRole('cell', { name: '1' })).toBeInTheDocument();
  });
  it('assigns an available student to the selected team and updates membership', async () => {
    const user = userEvent.setup();
    const data = mockManagedCourse({
      students: [{ ...rosterStudent }],
      teams: [
        {
          _id: 'team-1',
          team_name: 'Team Alpha',
          team_status: 'Active',
          student_count: 0,
        },
      ],
    });
    api.post.mockImplementationOnce(async () => {
      data.students[0] = {
        ...rosterStudent,
        team_id: 'team-1',
        group_assignment: 'Team Alpha',
      };
      data.teams[0].student_count = 1;
      return { data: {} };
    });
    renderCourseManagement();
    const teams = await openTeams(user);
    const teamRow = (await within(teams).findByText('Team Alpha')).closest(
      'tr',
    );
    await user.click(within(teamRow).getByTitle('Manage Students'));
    const dialog = await screen.findByRole('dialog', {
      name: 'Manage Students in Team Alpha',
    });
    await user.click(await within(dialog).findByTitle('Add to team'));
    expect(
      await within(dialog).findByText('Students in Team (1)'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Available Students (0)'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Synthetic Student')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      '/courses/course-1/evaluations/status',
    );
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/teams/team-1/students/student-1',
    );
  });

  it('cancels a queued team add when evaluation reset is declined', async () => {
    const user = userEvent.setup();
    mockManagedCourse({
      students: [{ ...rosterStudent }],
      teams: [
        {
          _id: 'team-1',
          team_name: 'Team Alpha',
          team_status: 'Active',
          student_count: 0,
        },
      ],
      evaluationStatus: { evaluations_sent: true },
    });
    renderCourseManagement();
    const teams = await openTeams(user);
    const teamRow = (await within(teams).findByText('Team Alpha')).closest(
      'tr',
    );
    await user.click(within(teamRow).getByTitle('Manage Students'));
    const dialog = await screen.findByRole('dialog', {
      name: 'Manage Students in Team Alpha',
    });
    await user.click(await within(dialog).findByTitle('Add to team'));

    const resetDialog = await screen.findByRole('dialog', {
      name: 'Evaluations Already Sent',
    });
    await user.click(
      within(resetDialog).getByRole('button', { name: 'Cancel' }),
    );

    await waitFor(() => expect(resetDialog).not.toBeInTheDocument());
    expect(api.delete).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(
      within(dialog).getByText('Students in Team (0)'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Available Students (1)'),
    ).toBeInTheDocument();
  });

  it('does not remove a team member when the required evaluation reset fails', async () => {
    const user = userEvent.setup();
    mockManagedCourse({
      students: [
        { ...rosterStudent, team_id: 'team-1', group_assignment: 'Team Alpha' },
      ],
      teams: [{ _id: 'team-1', team_name: 'Team Alpha', student_count: 1 }],
      evaluationStatus: { evaluations_sent: true },
    });
    api.delete.mockRejectedValueOnce({
      response: { data: { message: 'Reset failed' } },
    });
    renderCourseManagement();
    const teams = await openTeams(user);
    const teamRow = (await within(teams).findByText('Team Alpha')).closest(
      'tr',
    );
    await user.click(within(teamRow).getByTitle('Manage Students'));
    const dialog = await screen.findByRole('dialog', {
      name: 'Manage Students in Team Alpha',
    });
    await user.click(await within(dialog).findByTitle('Remove from team'));

    const resetDialog = await screen.findByRole('dialog', {
      name: 'Evaluations Already Sent',
    });
    await user.click(
      within(resetDialog).getByRole('button', { name: 'Continue' }),
    );

    expect(await screen.findByText(/Reset failed/)).toBeInTheDocument();
    expect(api.delete).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/evaluations/reset',
    );
    expect(api.get).not.toHaveBeenCalledWith(
      '/courses/course-1/teams/team-1/students/student-1',
    );
    expect(
      within(dialog).getByText('Students in Team (1)'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Available Students (0)'),
    ).toBeInTheDocument();
  });

  it('removes a student from the selected team and refreshes membership', async () => {
    const user = userEvent.setup();
    const data = mockManagedCourse({
      students: [
        { ...rosterStudent, team_id: 'team-1', group_assignment: 'Team Alpha' },
      ],
      teams: [{ _id: 'team-1', team_name: 'Team Alpha', student_count: 1 }],
    });
    api.delete.mockImplementationOnce(async () => {
      data.students = [{ ...rosterStudent }];
      data.teams[0].student_count = 0;
      return { data: {} };
    });
    renderCourseManagement();
    const teams = await openTeams(user);
    const teamRow = (await within(teams).findByText('Team Alpha')).closest(
      'tr',
    );
    await user.click(within(teamRow).getByTitle('Manage Students'));
    const dialog = await screen.findByRole('dialog', {
      name: 'Manage Students in Team Alpha',
    });
    await user.click(await within(dialog).findByTitle('Remove from team'));
    expect(
      await within(dialog).findByText('Students in Team (0)'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Available Students (1)'),
    ).toBeInTheDocument();
    expect(within(dialog).getByTitle('Add to team')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      '/courses/course-1/evaluations/status',
    );
    expect(api.delete).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/teams/team-1/students/student-1',
    );
  });

  it('sends evaluation invitations to the selected team and confirms success', async () => {
    const user = userEvent.setup();
    mockManagedCourse({
      teams: [{ _id: 'team-1', team_name: 'Team Alpha', student_count: 2 }],
    });
    api.post.mockResolvedValueOnce({ data: {} });
    renderCourseManagement();
    const teams = await openTeams(user);
    const teamRow = (await within(teams).findByText('Team Alpha')).closest(
      'tr',
    );
    await user.click(within(teamRow).getByTitle('Send Evaluations to Team'));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledExactlyOnceWith(
        '/courses/course-1/teams/team-1/evaluations/send',
        {},
      ),
    );
    await user.click(within(teams).getByRole('button', { name: 'Close' }));
    expect(
      await screen.findByText(
        'Evaluation invitations sent to team "Team Alpha".',
      ),
    ).toBeInTheDocument();
  });

  it('launches course evaluations and displays refreshed completion status', async () => {
    const user = userEvent.setup();
    const data = mockManagedCourse();
    api.post.mockImplementationOnce(async () => {
      // The server owns evaluation creation; the frontend must request launch and show its returned status.
      data.evaluationStatus = sentEvaluationStatus;
      return { data: { message: 'Invitations sent', emails_sent: 2 } };
    });
    renderCourseManagement();
    const dialog = await openEvaluationStatus(user);
    expect(
      await within(dialog).findByText('No Sent Invitations Recorded'),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: 'Send Evaluations Now' }),
    );
    expect(api.get).toHaveBeenCalledWith('/health');
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/evaluations/send',
    );
    expect(
      await screen.findByText(
        '✅ Invitations sent - Emails sent to 2 students',
      ),
    ).toBeInTheDocument();
    // Sending schedules a status refresh after one second; await the new dialog content, not the closing dialog instance.
    expect(
      await screen.findByText(
        'Progress: 1/2 evaluations completed',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(
      api.get.mock.calls.filter(
        ([url]) => url === '/courses/course-1/evaluations/status',
      ),
    ).toHaveLength(2);
  });

  it('shows course completion progress and each student status by team', async () => {
    const user = userEvent.setup();
    mockManagedCourse({ evaluationStatus: sentEvaluationStatus });
    renderCourseManagement();
    const dialog = await openEvaluationStatus(user);
    expect(
      await within(dialog).findByText('Progress: 1/2 evaluations completed'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Team Alpha')).toBeInTheDocument();
    // Each status must remain attached to its own student rather than merely appear somewhere in the dialog.
    const completedStudent =
      within(dialog).getByText('Synthetic Student').parentElement.parentElement;
    const pendingStudent =
      within(dialog).getByText('Another Student').parentElement.parentElement;
    expect(within(completedStudent).getByText('Done')).toBeInTheDocument();
    expect(within(pendingStudent).getByText('Pending')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      '/courses/course-1/evaluations/status',
    );
  });

  it('requests reminders for the selected course and refreshes its status', async () => {
    const user = userEvent.setup();
    mockManagedCourse({ evaluationStatus: sentEvaluationStatus });
    api.post.mockResolvedValueOnce({
      data: { message: 'Reminder sent to 1 incomplete student' },
    });
    renderCourseManagement();
    const dialog = await openEvaluationStatus(user);
    await user.click(
      await within(dialog).findByRole('button', { name: 'Send Reminders' }),
    );
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/evaluations/remind',
    );
    await waitFor(() =>
      expect(
        api.get.mock.calls.filter(
          ([url]) => url === '/courses/course-1/evaluations/status',
        ),
      ).toHaveLength(2),
    );
    expect(
      within(dialog).getByText('Progress: 1/2 evaluations completed'),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(
      await screen.findByText('Reminder sent to 1 incomplete student'),
    ).toBeInTheDocument();
  });

  it('does not send invitations when the backend health check fails', async () => {
    const user = userEvent.setup();
    mockManagedCourse();
    const originalGet = api.get.getMockImplementation();
    api.get.mockImplementation((url) =>
      url === '/health'
        ? Promise.reject(new Error('Offline'))
        : originalGet(url),
    );
    renderCourseManagement();
    const dialog = await openEvaluationStatus(user);
    await user.click(
      await within(dialog).findByRole('button', {
        name: 'Send Evaluations Now',
      }),
    );
    expect(api.post).not.toHaveBeenCalled();
    expect(
      within(dialog).getByRole('button', { name: 'Send Evaluations Now' }),
    ).toBeEnabled();
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(
      await screen.findByText(/Cannot connect to backend server/),
    ).toBeInTheDocument();
  });

  it.each([
    [{ code: 'ECONNABORTED' }, /Email sending is taking longer than expected/],
    [{ response: { status: 500 } }, /Server error - check backend logs/],
    [
      { response: { status: 401 } },
      /Authentication failed - please log in again/,
    ],
    [
      {
        response: {
          status: 502,
          data: { message: 'Only one invitation was accepted' },
        },
      },
      /Only one invitation was accepted/,
    ],
    [
      {
        response: {
          status: 400,
          data: { error: { message: 'No eligible recipients' } },
        },
      },
      /No eligible recipients/,
    ],
  ])(
    'retains launch state and displays the invitation error %j',
    async (error, message) => {
      const user = userEvent.setup();
      mockManagedCourse();
      api.post.mockRejectedValueOnce(error);
      renderCourseManagement();
      const dialog = await openEvaluationStatus(user);
      await user.click(
        await within(dialog).findByRole('button', {
          name: 'Send Evaluations Now',
        }),
      );
      expect(api.post).toHaveBeenCalledExactlyOnceWith(
        '/courses/course-1/evaluations/send',
      );
      await waitFor(() =>
        expect(
          within(dialog).getByRole('button', { name: 'Send Evaluations Now' }),
        ).toBeEnabled(),
      );
      expect(
        within(dialog).getByText('No Sent Invitations Recorded'),
      ).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Close' }));
      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.queryByText(/✅.*Emails sent/)).not.toBeInTheDocument();
    },
  );

  it('re-enables team invitations after a failed send without claiming success', async () => {
    const user = userEvent.setup();
    mockManagedCourse({
      teams: [{ _id: 'team-1', team_name: 'Team Alpha', student_count: 2 }],
    });
    api.post.mockRejectedValueOnce({
      userMessage: 'SMTP rejected the invitations',
    });
    renderCourseManagement();
    const dialog = await openTeams(user);
    const row = (await within(dialog).findByText('Team Alpha')).closest('tr');
    await user.click(within(row).getByTitle('Send Evaluations to Team'));
    await waitFor(() =>
      expect(within(row).getByTitle('Send Evaluations to Team')).toBeEnabled(),
    );
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/teams/team-1/evaluations/send',
      {},
    );
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(
      await screen.findByText('SMTP rejected the invitations'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Evaluation invitations sent to team "Team Alpha".'),
    ).not.toBeInTheDocument();
  });

  it('keeps completion status when resetting evaluations fails', async () => {
    const user = userEvent.setup();
    mockManagedCourse({ evaluationStatus: sentEvaluationStatus });
    api.delete.mockRejectedValueOnce({
      response: { data: { message: 'Reset was rejected' } },
    });
    renderCourseManagement();
    const dialog = await openEvaluationStatus(user);
    await user.click(
      await within(dialog).findByRole('button', {
        name: 'Reset Evaluation State',
      }),
    );
    expect(api.delete).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/evaluations/reset',
    );
    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: 'Reset Evaluation State' }),
      ).toBeEnabled(),
    );
    expect(
      within(dialog).getByText('Progress: 1/2 evaluations completed'),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(await screen.findByText(/Reset was rejected/)).toBeInTheDocument();
  });

  it('clears evaluation status after a successful reset and shows server counts', async () => {
    const user = userEvent.setup();
    const data = mockManagedCourse({ evaluationStatus: sentEvaluationStatus });
    api.delete.mockImplementationOnce(async () => {
      data.evaluationStatus = { evaluations_sent: false };
      return {
        data: {
          message: 'Evaluation state reset',
          tokens_cleared: 2,
          evaluations_deleted: 1,
        },
      };
    });
    renderCourseManagement();
    const dialog = await openEvaluationStatus(user);
    await user.click(
      await within(dialog).findByRole('button', {
        name: 'Reset Evaluation State',
      }),
    );
    expect(api.delete).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/evaluations/reset',
    );
    expect(
      await screen.findByText(
        'No Sent Invitations Recorded',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(
      await screen.findByText(/Cleared 2 tokens and 1 evaluations/),
    ).toBeInTheDocument();
  });

  it('shows the refreshed student edit immediately after saving', async () => {
    const user = userEvent.setup();
    const data = mockManagedCourse({ students: [{ ...rosterStudent }] });
    api.put.mockImplementationOnce(async (_url, payload) => {
      data.students = [{ ...data.students[0], ...payload }];
      return { data: {} };
    });
    renderCourseManagement();
    const roster = await openStudents(user);
    await user.click(
      within(
        await within(roster).findByRole('row', { name: /S001/ }),
      ).getByTitle('Edit Student'),
    );
    const edit = await screen.findByRole('dialog', { name: 'Edit Student' });
    const name = within(edit).getByRole('textbox', { name: 'Name' });
    await user.clear(name);
    await user.type(name, 'Updated Student');
    await user.click(within(edit).getByRole('button', { name: 'Save' }));
    expect(api.put).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/students/student-1',
      {
        student_id: 'S001',
        name: 'Updated Student',
        email: rosterStudent.email,
        group_assignment: '',
      },
    );
    expect(
      await within(roster).findByText('Updated Student'),
    ).toBeInTheDocument();
    expect(
      within(roster).queryByText('Synthetic Student'),
    ).not.toBeInTheDocument();
  });

  it('removes the deleted student from the displayed roster after confirmation', async () => {
    const user = userEvent.setup();
    const data = mockManagedCourse({ students: [{ ...rosterStudent }] });
    const confirm = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    api.delete.mockImplementationOnce(async () => {
      data.students = [];
      return { data: {} };
    });
    renderCourseManagement();
    const roster = await openStudents(user);
    const remove = within(
      await within(roster).findByRole('row', { name: /S001/ }),
    ).getByTitle('Delete Student');
    await user.click(remove);
    expect(api.delete).not.toHaveBeenCalled();
    await user.click(remove);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(api.delete).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/students/student-1',
    );
    expect(
      await within(roster).findByText('No students found for this course.'),
    ).toBeInTheDocument();
    expect(
      within(roster).queryByText('Synthetic Student'),
    ).not.toBeInTheDocument();
  });

  it('shows an edited team name immediately after saving', async () => {
    const user = userEvent.setup();
    mockManagedCourse({
      teams: [
        {
          _id: 'team-1',
          team_name: 'Team Alpha',
          team_status: 'Active',
          student_count: 1,
        },
      ],
    });
    api.put.mockResolvedValueOnce({ data: {} });
    renderCourseManagement();
    const teams = await openTeams(user);
    await user.click(
      within(
        (await within(teams).findByText('Team Alpha')).closest('tr'),
      ).getByTitle('Edit Team'),
    );
    const edit = await screen.findByRole('dialog', { name: 'Edit Team' });
    const name = within(edit).getByRole('textbox', { name: 'Team Name' });
    await user.clear(name);
    await user.type(name, 'Team Beta');
    await user.click(
      within(edit).getByRole('button', { name: 'Save Changes' }),
    );
    expect(api.put).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/teams/team-1',
      { team_name: 'Team Beta', team_status: 'Active' },
    );
    expect(await within(teams).findByText('Team Beta')).toBeInTheDocument();
    expect(within(teams).queryByText('Team Alpha')).not.toBeInTheDocument();
  });

  it('clears all teams only after confirmation and displays an empty list', async () => {
    const user = userEvent.setup();
    mockManagedCourse({
      teams: [{ _id: 'team-1', team_name: 'Team Alpha', student_count: 1 }],
    });
    vi.spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    api.delete.mockResolvedValueOnce({
      data: { message: 'All teams cleared' },
    });
    renderCourseManagement();
    const teams = await openTeams(user);
    const clear = await within(teams).findByRole('button', {
      name: 'Clear All Teams',
    });
    await user.click(clear);
    expect(api.delete).not.toHaveBeenCalled();
    await user.click(clear);
    expect(api.delete).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/teams',
    );
    await waitFor(() =>
      expect(within(teams).queryByText('Team Alpha')).not.toBeInTheDocument(),
    );
    expect(clear).toBeDisabled();
  });

  it('requires typed confirmation before deleting all students and clears the roster', async () => {
    const user = userEvent.setup();
    const data = mockManagedCourse({ students: [{ ...rosterStudent }] });
    api.delete.mockImplementationOnce(async () => {
      data.students = [];
      return {
        data: {
          message: 'Roster removed',
          deleted_students: 1,
          deleted_teams: 0,
        },
      };
    });
    renderCourseManagement();
    const roster = await openStudents(user);
    await user.click(
      await within(roster).findByRole('button', {
        name: 'Delete All Students',
      }),
    );
    const confirmation = await screen.findByRole('dialog', {
      name: 'Delete All Students',
    });
    const remove = within(confirmation).getByRole('button', {
      name: 'Delete All Students',
    });
    await user.click(remove);
    expect(api.delete).not.toHaveBeenCalled();
    await user.type(
      within(confirmation).getByPlaceholderText('Type DELETE ALL to confirm'),
      'DELETE ALL',
    );
    await user.click(remove);
    expect(api.delete).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/students',
    );
    expect(
      await within(roster).findByText('No students found for this course.'),
    ).toBeInTheDocument();
  });

  it('filters the student roster by name and restores the list when search is cleared', async () => {
    const user = userEvent.setup();
    mockManagedCourse({
      students: [
        { ...rosterStudent },
        {
          ...rosterStudent,
          _id: 'student-2',
          student_id: 'S002',
          name: 'Another Student',
          email: 'another@example.invalid',
        },
      ],
    });
    renderCourseManagement();
    const roster = await openStudents(user);
    await within(roster).findByText('Synthetic Student');
    await user.click(
      within(roster).getByRole('button', { name: 'Show Search' }),
    );
    await user.type(
      within(roster).getByPlaceholderText('Search by name...'),
      'synthetic',
    );
    expect(within(roster).getByText('Synthetic Student')).toBeInTheDocument();
    expect(
      within(roster).queryByText('Another Student'),
    ).not.toBeInTheDocument();
    await user.click(within(roster).getByRole('button', { name: 'Search' }));
    await user.click(
      within(roster).getByRole('button', { name: 'Clear Search' }),
    );
    expect(
      await within(roster).findByText('Another Student'),
    ).toBeInTheDocument();
  });

  it('removes the deleted team from the displayed list after confirmation', async () => {
    const user = userEvent.setup();
    mockManagedCourse({
      teams: [{ _id: 'team-1', team_name: 'Team Alpha', student_count: 0 }],
    });
    vi.spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    api.delete.mockResolvedValueOnce({ data: {} });
    renderCourseManagement();
    const teams = await openTeams(user);
    const row = (await within(teams).findByText('Team Alpha')).closest('tr');
    const remove = within(row).getByTitle('Delete Team');
    await user.click(remove);
    expect(api.delete).not.toHaveBeenCalled();
    await user.click(remove);
    expect(api.delete).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/teams/team-1',
    );
    await waitFor(() =>
      expect(within(teams).queryByText('Team Alpha')).not.toBeInTheDocument(),
    );
  });
});
