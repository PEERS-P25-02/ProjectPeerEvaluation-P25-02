import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Reports from '../pages/Reports';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

function renderReports() {
  return render(
    <MemoryRouter>
      <Reports />
    </MemoryRouter>,
  );
}

describe('Reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the Reports page and requests the course list', async () => {
    api.get.mockResolvedValueOnce({
      data: [
        {
          _id: 'course-1',
          course_code: 'SWE 4724',
          course_name: 'Software Testing',
          course_status: 'Active',
        },
      ],
    });

    renderReports();

    expect(
      screen.getByRole('heading', {
        name: /Evaluation Reports/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('Report Configuration')).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/courses');
    });
  });

  it('shows only active courses in the course selection list', async () => {
    const user = userEvent.setup();

    api.get.mockResolvedValueOnce({
      data: [
        {
          _id: 'course-1',
          course_code: 'SWE 4724',
          course_name: 'Software Testing',
          course_status: 'Active',
        },
        {
          _id: 'course-2',
          course_code: 'SWE 9999',
          course_name: 'Old Course',
          course_status: 'Inactive',
        },
      ],
    });

    renderReports();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/courses');
    });

    const courseSelect = screen.getAllByRole('combobox')[0];

    await user.click(courseSelect);

    expect(
      await screen.findByText('SWE 4724 - Software Testing'),
    ).toBeInTheDocument();

    expect(screen.queryByText('SWE 9999 - Old Course')).not.toBeInTheDocument();
  });

  it('shows an error message when courses cannot be loaded', async () => {
    api.get.mockRejectedValueOnce(new Error('Request failed'));

    renderReports();

    expect(
      await screen.findByText('Failed to load courses'),
    ).toBeInTheDocument();
  });
});
