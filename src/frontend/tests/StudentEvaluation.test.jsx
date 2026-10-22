import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// All six supported criteria are needed to exercise the real submission validation.
const ratingValues = {
  professionalism: 5,
  communication: 4,
  work_ethic: 3,
  content_knowledge_skills: 2,
  overall_contribution: 1,
  participation: 4,
};

function evaluationForm(
  teammates = [
    { _id: 'student-2', name: 'Teammate Student', student_id: '654321' },
  ],
) {
  return {
    course: {
      name: 'Software Engineering',
      number: 'SWE 4724',
      section: '01',
      semester: 'Fall 2026',
    },
    evaluator: { name: 'Test Student', student_id: '123456', team: 'Team 1' },
    teammates,
    rubric: {
      title: 'Peer Evaluation',
      description: 'Evaluate your teammates.',
      criteria: Object.keys(ratingValues).map((id) => ({
        id,
        name: id === 'professionalism' ? 'Professionalism' : id,
        description: `Rate ${id}.`,
        scaleDescriptions:
          id === 'participation'
            ? {
                4: 'Full participation',
                3: 'Some participation',
                2: 'No participation',
                1: 'Hindered the group',
              }
            : {
                5: 'Excellent',
                4: 'Good',
                3: 'Average',
                2: 'Needs Improvement',
                1: 'Poor',
              },
      })),
      overallFeedback: {
        name: 'Overall Feedback',
        description: 'Give helpful feedback.',
      },
    },
  };
}

async function rateTeammate(user, name, ratings = ratingValues) {
  // The existing cards have no region label; scope repeated controls to the intended teammate.
  const card = screen.getByText(`Evaluate: ${name}`).closest('.MuiCard-root');
  const groups = within(card).getAllByRole('radiogroup');
  for (const [index, value] of Object.values(ratings).entries()) {
    await user.click(
      within(groups[index]).getByRole('radio', {
        name: new RegExp(`^${value} `),
      }),
    );
  }
  return within(card).getByPlaceholderText(
    'Provide constructive feedback for this team member...',
  );
}

function renderStudentEvaluation() {
  return render(
    <MemoryRouter initialEntries={['/evaluate/test-token']}>
      <Routes>
        <Route path="/evaluate/:token" element={<StudentEvaluation />} />
        <Route path="/" element={<h1>Evaluation home</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StudentEvaluation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads and displays evaluation information', async () => {
    api.get.mockResolvedValueOnce({ data: evaluationForm() });

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
  it('rejects missing ratings without sending a submission', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValueOnce({ data: evaluationForm() });
    renderStudentEvaluation();
    await user.click(
      await screen.findByRole('button', { name: 'Submit Evaluation' }),
    );
    expect(
      await screen.findByText(/Please provide a rating for professionalism/),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejects feedback shorter than ten characters without sending a submission', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValueOnce({ data: evaluationForm() });
    renderStudentEvaluation();
    await screen.findByText('Evaluate: Teammate Student');
    const feedback = await rateTeammate(user, 'Teammate Student');
    await user.type(feedback, 'Short');
    await user.click(screen.getByRole('button', { name: 'Submit Evaluation' }));
    expect(
      await screen.findByText(
        'Please provide overall feedback (at least 10 characters) for all team members.',
      ),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits each teammate with numeric ratings and their own feedback', async () => {
    const user = userEvent.setup();
    const teammates = [
      { _id: 'student-2', name: 'Teammate Student', student_id: '654321' },
      { _id: 'student-3', name: 'Another Teammate', student_id: '654322' },
    ];
    const secondRatings = {
      professionalism: 1,
      communication: 2,
      work_ethic: 3,
      content_knowledge_skills: 4,
      overall_contribution: 5,
      participation: 1,
    };
    api.get.mockResolvedValueOnce({ data: evaluationForm(teammates) });
    api.post.mockResolvedValueOnce({ data: { message: 'Submitted' } });
    renderStudentEvaluation();
    await screen.findByText('Evaluate: Teammate Student');
    await user.type(
      await rateTeammate(user, 'Teammate Student'),
      'Reliable and helpful.',
    );
    await user.type(
      await rateTeammate(user, 'Another Teammate', secondRatings),
      'Communicated clearly.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit Evaluation' }));
    expect(
      await screen.findByRole('heading', { name: 'Evaluation Completed!' }),
    ).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/evaluate/test-token', {
      evaluations: [
        {
          student_id: 'student-2',
          ratings: ratingValues,
          overall_feedback: 'Reliable and helpful.',
        },
        {
          student_id: 'student-3',
          ratings: secondRatings,
          overall_feedback: 'Communicated clearly.',
        },
      ],
    });
    await user.click(screen.getByRole('button', { name: 'Return to Home' }));
    expect(
      await screen.findByRole('heading', { name: 'Evaluation home' }),
    ).toBeInTheDocument();
  });

  it('preserves entered evaluations after a failed submission and permits retry', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValueOnce({ data: evaluationForm() });
    api.post.mockRejectedValueOnce({
      response: {
        data: { error: { message: 'Please retry your submission' } },
      },
    });
    api.post.mockResolvedValueOnce({ data: { message: 'Submitted' } });
    renderStudentEvaluation();
    await screen.findByText('Evaluate: Teammate Student');
    const feedback = await rateTeammate(user, 'Teammate Student');
    await user.type(feedback, 'Reliable and helpful.');
    await user.click(screen.getByRole('button', { name: 'Submit Evaluation' }));
    expect(
      await screen.findByText('Please retry your submission'),
    ).toBeInTheDocument();
    expect(feedback).toHaveValue('Reliable and helpful.');
    const submit = screen.getByRole('button', { name: 'Submit Evaluation' });
    await waitFor(() => expect(submit).toBeEnabled());
    expect(
      screen.queryByRole('heading', { name: 'Evaluation Completed!' }),
    ).not.toBeInTheDocument();
    await user.click(submit);
    expect(
      await screen.findByRole('heading', { name: 'Evaluation Completed!' }),
    ).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.post.mock.calls[1]).toEqual(api.post.mock.calls[0]);
  });
});
