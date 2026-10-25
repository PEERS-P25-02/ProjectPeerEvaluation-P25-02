// These tests cover choosing, creating, and downloading course reports.
// TLDR: mock API responses and browser download behavior while exercising the
//       rendered report page.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Reports from '../pages/Reports';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// A memory router makes the course-in-URL flow deterministic without browser navigation.
function renderReports(entry = '/reports') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Reports />
    </MemoryRouter>,
  );
}

const reportCourse = {
  _id: 'course-1',
  course_code: 'SWE 4724',
  course_name: 'Software Testing',
  course_status: 'Active',
};
const report = {
  summary: {
    totalStudents: 1,
    studentsWithEvaluations: 1,
    averageScore: 87,
    gradeDistribution: { A: 0, B: 1, C: 0, D: 0, F: 0 },
  },
  students: [
    {
      _id: 'student-1',
      student_id: 'S001',
      name: 'Synthetic Student',
      team_id: { team_name: 'Team Alpha' },
      evaluationsReceived: 2,
      originalScore: 82,
      finalScore: 87,
      letterGrade: 'B',
      improvement: 5,
      evaluationDetails: [
        {
          _id: 'evaluation-1',
          overall_feedback: 'Helpful and reliable teammate.',
          submitted_at: '2026-10-22T12:00:00Z',
          ratings: { professionalism: 4 },
        },
      ],
    },
  ],
};

// Centralize the common course and report responses; individual tests override only their scenario.
function mockReportRequests() {
  api.get.mockImplementation(async (url) => {
    if (url === '/courses') return { data: [reportCourse] };
    if (url === '/courses/course-1') return { data: reportCourse };
    if (url.startsWith('/courses/course-1/reports/download?'))
      return {
        data: new Blob(['student_id,score\nS001,87'], { type: 'text/csv' }),
      };
    if (url.startsWith('/courses/course-1/reports?')) return { data: report };
    throw new Error(`Unexpected report request: ${url}`);
  });
}

async function selectReportCourse(user) {
  await user.click(screen.getAllByRole('combobox')[0]);
  await user.click(
    await screen.findByRole('option', { name: 'SWE 4724 - Software Testing' }),
  );
}

async function generateMeanReport(user) {
  mockReportRequests();
  renderReports();
  await selectReportCourse(user);
  await user.click(screen.getByRole('button', { name: 'Generate Report' }));
  await screen.findByText('Report generated successfully');
}

describe('Reports', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
  it('generates the selected report and displays results and peer feedback', async () => {
    const user = userEvent.setup();
    await generateMeanReport(user);
    expect(api.get).toHaveBeenCalledWith(
      '/courses/course-1/reports?gradingMethod=mean&boostFactor=0.5&protectionThreshold=80',
    );
    const row = screen
      .getByRole('cell', { name: 'Synthetic Student' })
      .closest('tr');
    expect(within(row).getByRole('cell', { name: 'S001' })).toBeInTheDocument();
    expect(
      within(row).getByRole('cell', { name: 'Team Alpha' }),
    ).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: '87%' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'B' })).toBeInTheDocument();
    await user.click(
      within(row).getByRole('button', { name: 'View Comments' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('Helpful and reliable teammate.'),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('sends the selected curved-grading settings and displays original and adjusted scores', async () => {
    const user = userEvent.setup();
    mockReportRequests();
    renderReports();
    await selectReportCourse(user);
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Curved Grading' }));
    const boost = screen.getByRole('spinbutton', { name: 'Boost Factor (k)' });
    await user.clear(boost);
    await user.type(boost, '0.7');
    const threshold = screen.getByRole('spinbutton', {
      name: 'Protection Threshold',
    });
    await user.clear(threshold);
    await user.type(threshold, '90');
    await user.click(screen.getByRole('button', { name: 'Generate Report' }));
    await screen.findByText('Report generated successfully');
    expect(api.get).toHaveBeenCalledWith(
      '/courses/course-1/reports?gradingMethod=curved&boostFactor=0.7&protectionThreshold=90',
    );
    const row = screen
      .getByRole('cell', { name: 'Synthetic Student' })
      .closest('tr');
    expect(within(row).getByRole('cell', { name: '82%' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: '87%' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: '+5%' })).toBeInTheDocument();
  });

  it('shows report-generation failures and permits another attempt', async () => {
    const user = userEvent.setup();
    mockReportRequests();
    renderReports();
    await selectReportCourse(user);
    api.get.mockRejectedValueOnce({
      response: { data: { message: 'Report unavailable' } },
    });
    await user.click(screen.getByRole('button', { name: 'Generate Report' }));
    expect(await screen.findByText('Report unavailable')).toBeInTheDocument();
    expect(
      screen.queryByRole('cell', { name: 'Synthetic Student' }),
    ).not.toBeInTheDocument();
    const generate = screen.getByRole('button', { name: 'Generate Report' });
    expect(generate).toBeEnabled();
    await user.click(generate);
    expect(
      await screen.findByRole('cell', { name: 'Synthetic Student' }),
    ).toBeInTheDocument();
  });

  it('downloads a CSV for the selected course and releases its temporary URL', async () => {
    const user = userEvent.setup();
    // jsdom has no download implementation; keep link creation real and capture the browser boundary.
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = vi.fn(() => 'blob:synthetic-report');
        static revokeObjectURL = vi.fn();
      },
    );
    let downloadedLink;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function () {
        downloadedLink = this;
      });
    await generateMeanReport(user);
    await user.click(screen.getByRole('button', { name: 'Download CSV' }));
    expect(
      await screen.findByText('Report downloaded successfully'),
    ).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      '/courses/course-1/reports/download?gradingMethod=mean&boostFactor=0.5&protectionThreshold=80',
      { responseType: 'blob' },
    );
    expect(URL.createObjectURL).toHaveBeenCalledExactlyOnceWith(
      expect.any(Blob),
    );
    expect(click).toHaveBeenCalledOnce();
    expect(downloadedLink.href).toBe('blob:synthetic-report');
    expect(downloadedLink.download).toBe('course_course-1_report.csv');
    expect(downloadedLink).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(
      'blob:synthetic-report',
    );
  });

  it('reports a failed CSV download without claiming success', async () => {
    const user = userEvent.setup();
    await generateMeanReport(user);
    api.get.mockRejectedValueOnce(new Error('Download unavailable'));
    await user.click(screen.getByRole('button', { name: 'Download CSV' }));
    expect(
      await screen.findByText('Failed to download report'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Report downloaded successfully'),
    ).not.toBeInTheDocument();
  });

  it('automatically generates a report for the course in the URL', async () => {
    mockReportRequests();
    renderReports('/reports?course=course-1');
    expect(
      await screen.findByRole('cell', { name: 'Synthetic Student' }),
    ).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/courses/course-1');
    expect(api.get).toHaveBeenCalledWith(
      '/courses/course-1/reports?gradingMethod=mean&boostFactor=0.5&protectionThreshold=80',
    );
  });
});
