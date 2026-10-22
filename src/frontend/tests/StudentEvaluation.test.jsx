import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentEvaluation from '../pages/StudentEvaluation';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function renderStudentEvaluation() {
  return render(
    <MemoryRouter initialEntries={['/evaluate/test-token']}>
      <Routes>
        <Route path="/evaluate/:token" element={<StudentEvaluation />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StudentEvaluation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays evaluation information', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        course: {
          name: 'Software Engineering',
          number: 'SWE 4724',
          section: '01',
          semester: 'Fall 2026',
        },
        evaluator: {
          name: 'Test Student',
          student_id: '123456',
          team: 'Team 1',
        },
        teammates: [
          {
            _id: 'student-2',
            name: 'Teammate Student',
            student_id: '654321',
          },
        ],
        rubric: {
          title: 'Peer Evaluation',
          description: 'Evaluate your teammates.',
          criteria: [
            {
              id: 'professionalism',
              name: 'Professionalism',
              description: 'Rate professionalism.',
              scaleDescriptions: {
                5: 'Excellent',
                4: 'Good',
                3: 'Average',
                2: 'Needs Improvement',
                1: 'Poor',
              },
            },
          ],
          overallFeedback: {
            name: 'Overall Feedback',
            description: 'Give helpful feedback.',
          },
        },
      },
    });

    renderStudentEvaluation();

    expect(api.get).toHaveBeenCalledWith('/evaluate/test-token');

    expect(await screen.findByText('Software Engineering')).toBeInTheDocument();

    expect(screen.getByText(/Test Student/)).toBeInTheDocument();

    expect(screen.getByText('Evaluate: Teammate Student')).toBeInTheDocument();

    expect(screen.getByText('Professionalism')).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Submit Evaluation',
      }),
    ).toBeInTheDocument();
  });

  it('shows an error when the evaluation cannot be loaded', async () => {
    api.get.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Invalid evaluation link',
        },
      },
    });

    renderStudentEvaluation();

    expect(
      await screen.findByText('Invalid evaluation link'),
    ).toBeInTheDocument();
  });

  it('shows the completed screen when the evaluation was already submitted', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        completed: true,
        submitted_at: '2026-10-21T12:00:00.000Z',
      },
    });

    renderStudentEvaluation();

    expect(
      await screen.findByRole('heading', {
        name: 'Evaluation Completed!',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Thank you for completing your peer evaluation/),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Return to Home',
      }),
    ).toBeInTheDocument();
  });
});
