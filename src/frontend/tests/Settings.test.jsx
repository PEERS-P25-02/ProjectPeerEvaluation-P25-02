import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from '../pages/Settings';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays the current flagged words', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        words: ['lazy', 'rude'],
      },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'AI Flagged Words Settings' }),
    ).toBeInTheDocument();

    expect(api.get).toHaveBeenCalledWith('/professor/ai-words');

    expect(await screen.findByText('lazy')).toBeInTheDocument();
    expect(await screen.findByText('rude')).toBeInTheDocument();
  });

  it('adds a new flagged word', async () => {
    const user = userEvent.setup();

    api.get.mockResolvedValueOnce({
      data: {
        words: ['lazy'],
      },
    });

    api.post.mockResolvedValueOnce({
      data: {
        words: ['lazy', 'disrespectful'],
      },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await screen.findByText('lazy');

    const input = screen.getByLabelText('Add new word');

    await user.type(input, 'disrespectful');

    await user.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/professor/ai-words', {
        action: 'add',
        word: 'disrespectful',
      });
    });

    expect(await screen.findByText('disrespectful')).toBeInTheDocument();

    expect(input).toHaveValue('');
  });

  it('shows an error when the flagged words cannot be loaded', async () => {
    api.get.mockRejectedValueOnce(new Error('Request failed'));

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Failed to load words')).toBeInTheDocument();
  });
});
