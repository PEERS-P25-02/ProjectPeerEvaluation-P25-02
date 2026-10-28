import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const course = {
  _id: 'course-1',
  course_name: 'Software Testing',
  course_number: 'SWE 4724',
  course_section: '01',
  semester: 'Fall 2026',
  course_status: 'Active',
  student_count: 0,
  team_count: 1,
};
const student = {
  _id: 'student-1',
  student_id: 'S001',
  name: 'Synthetic Student',
  email: 'student@example.invalid',
  group_assignment: 'Team Alpha',
  team_id: 'team-1',
};
const team = {
  _id: 'team-1',
  team_name: 'Team Alpha',
  team_status: 'Active',
  student_count: 1,
};

function setup(initiallyAssigned = true) {
  const data = {
    students: [
      {
        ...student,
        ...(initiallyAssigned ? {} : { group_assignment: '', team_id: null }),
      },
    ],
    teams: [{ ...team, student_count: initiallyAssigned ? 1 : 0 }],
  };
  api.get.mockImplementation(async (url) => {
    if (url === '/health') return { data: { status: 'ok' } };
    if (url.startsWith('/courses?')) return { data: [{ ...course }] };
    if (url === '/courses/course-1/teams') return { data: data.teams };
    if (url === '/courses/course-1/students') return { data: data.students };
    if (url === '/courses/course-1/evaluations/status')
      return { data: { evaluations_sent: true } };
    throw new Error(`Unexpected request: ${url}`);
  });
  getCourseById.mockResolvedValue({ ...course });
  render(
    <MemoryRouter>
      <AuthProvider>
        <CourseManagement />
      </AuthProvider>
    </MemoryRouter>,
  );
  return data;
}

async function openMembership(user) {
  const row = (
    await screen.findByRole('cell', { name: 'Software Testing' })
  ).closest('tr');
  await user.click(within(row).getByTitle('Manage Teams'));
  const teamsDialog = await screen.findByRole('dialog', {
    name: /Manage Teams for/,
  });
  const teamRow = (await within(teamsDialog).findByText('Team Alpha')).closest(
    'tr',
  );
  await user.click(within(teamRow).getByTitle('Manage Students'));
  return screen.findByRole('dialog', { name: 'Manage Students in Team Alpha' });
}

async function confirmReset(user) {
  const resetDialog = await screen.findByRole('dialog', {
    name: 'Evaluations Already Sent',
  });
  await user.click(
    within(resetDialog).getByRole('button', { name: 'Continue' }),
  );
}

describe('CourseManagement reset sequencing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('does not add membership when evaluation reset fails and retains the membership UI', async () => {
    const user = userEvent.setup();
    await setup(false);
    const dialog = await openMembership(user);
    await user.click(within(dialog).getByTitle('Add to team'));
    api.delete.mockRejectedValueOnce({
      response: { data: { message: 'Reset was rejected' } },
    });

    await confirmReset(user);

    expect(await screen.findByText(/Reset was rejected/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.delete).toHaveBeenCalledExactlyOnceWith(
      '/courses/course-1/evaluations/reset',
    );
    expect(
      within(dialog).getByText('Students in Team (0)'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Available Students (1)'),
    ).toBeInTheDocument();
    expect(within(dialog).getByTitle('Add to team')).toBeInTheDocument();
  });

  it.each(['add', 'remove'])(
    'waits for reset success before performing the pending %s',
    async (action) => {
      const user = userEvent.setup();
      const data = setup(action === 'remove');
      const dialog = await openMembership(user);
      await user.click(
        within(dialog).getByTitle(
          action === 'add' ? 'Add to team' : 'Remove from team',
        ),
      );
      let resolveReset;
      // Keep reset pending to ensure the team mutation waits for its successful response.
      api.delete.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveReset = resolve;
          }),
      );
      if (action === 'add') {
        api.post.mockImplementationOnce(async () => {
          data.students[0] = { ...student };
          data.teams[0].student_count = 1;
          return { data: {} };
        });
      } else {
        api.delete.mockImplementationOnce(async () => {
          data.students[0] = {
            ...student,
            group_assignment: '',
            team_id: null,
          };
          data.teams[0].student_count = 0;
          return { data: {} };
        });
      }

      await confirmReset(user);

      const membershipUrl = '/courses/course-1/teams/team-1/students/student-1';
      const membershipCalls = () =>
        [
          ...api.post.mock.calls.map(([url]) => ['post', url]),
          ...api.delete.mock.calls.map(([url]) => ['delete', url]),
        ].filter(([, url]) => url === membershipUrl);
      expect(api.delete).toHaveBeenCalledExactlyOnceWith(
        '/courses/course-1/evaluations/reset',
      );
      expect(membershipCalls()).toEqual([]);
      resolveReset({
        data: {
          message: 'Reset complete',
          tokens_cleared: 1,
          evaluations_deleted: 1,
        },
      });
      expect(
        await within(dialog).findByText(
          action === 'add' ? 'Students in Team (1)' : 'Students in Team (0)',
        ),
      ).toBeInTheDocument();
      expect(membershipCalls()).toEqual([
        [action === 'add' ? 'post' : 'delete', membershipUrl],
      ]);
    },
  );
});
