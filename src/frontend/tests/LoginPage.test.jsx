import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    default: {
      ...actual.default,
      post: vi.fn(),
    },
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('shows the professor login form on the initial route', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'Professor Login' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email:')).toBeInTheDocument();
    expect(screen.getByLabelText('Password:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('lets the user type an email and password', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'TestPassword123!');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('TestPassword123!');
  });

  it('switches from login to registration mode', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    await user.click(
      screen.getByRole('button', { name: 'New here? Register' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Professor Registration' }),
    ).toBeInTheDocument();

    expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Department')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Register' }),
    ).toBeInTheDocument();
  });

  it('shows a success message after a password reset request', async () => {
    const user = userEvent.setup();

    axios.post.mockResolvedValueOnce({ data: {} });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Forgot Password?' }));

    await user.type(
      screen.getByPlaceholderText('Enter your email'),
      'reset-test@example.com',
    );

    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    expect(
      await screen.findByText(
        'If your email is registered, you will receive password reset instructions.',
      ),
    ).toBeInTheDocument();

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:5000/api/auth/reset-password',
      { email: 'reset-test@example.com' },
    );
  });
});
