import { render, screen, waitFor } from '@testing-library/react';
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

function renderCourseManagement() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CourseManagement />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('CourseManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('loads and displays the active courses', async () => {
    const course = {
      _id: 'course-1',
      course_name: 'Software Testing',
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
});
