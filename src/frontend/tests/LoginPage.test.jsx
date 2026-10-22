import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    sessionStorage.clear();
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('submits the login form and stores successful login data', async () => {
    const user = userEvent.setup();

    axios.post.mockResolvedValueOnce({
      data: {
        access_token: 'test-access-token',
        professor: {
          email: 'professor@example.com',
          name: 'Test Professor',
        },
      },
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    await user.type(screen.getByLabelText('Email:'), 'professor@example.com');

    await user.type(screen.getByLabelText('Password:'), 'TestPassword123!');

    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/login',
        {
          email: 'professor@example.com',
          password: 'TestPassword123!',
        },
      );
    });

    expect(localStorage.getItem('peer_eval_token')).toBe('test-access-token');

    expect(JSON.parse(localStorage.getItem('user'))).toEqual({
      email: 'professor@example.com',
      name: 'Test Professor',
    });
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

  it('clears fields when switching between login and registration modes', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    await user.type(
      screen.getByLabelText('Email:'),
      'before-switch@example.com',
    );

    await user.type(screen.getByLabelText('Password:'), 'BeforeSwitch123!');

    await user.click(
      screen.getByRole('button', { name: 'New here? Register' }),
    );

    expect(screen.getByLabelText('Email:')).toHaveValue('');
    expect(screen.getByLabelText('Password:')).toHaveValue('');

    await user.type(screen.getByPlaceholderText('Full Name'), 'Test Professor');

    await user.type(
      screen.getByPlaceholderText('Department'),
      'Computer Science',
    );

    await user.type(screen.getByLabelText('Email:'), 'register@example.com');

    await user.type(screen.getByLabelText('Password:'), 'RegisterPassword123!');

    await user.click(
      screen.getByRole('button', {
        name: 'Already have an account? Log in',
      }),
    );

    expect(
      screen.getByRole('heading', { name: 'Professor Login' }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Email:')).toHaveValue('');
    expect(screen.getByLabelText('Password:')).toHaveValue('');

    expect(screen.queryByPlaceholderText('Full Name')).not.toBeInTheDocument();

    expect(screen.queryByPlaceholderText('Department')).not.toBeInTheDocument();
  });

  it('submits the registration form with the correct information', async () => {
    const user = userEvent.setup();

    axios.post.mockResolvedValueOnce({
      data: {
        message: 'Registration successful',
      },
    });

    vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    await user.click(
      screen.getByRole('button', { name: 'New here? Register' }),
    );

    await user.type(screen.getByPlaceholderText('Full Name'), 'Test Professor');

    await user.type(
      screen.getByPlaceholderText('Department'),
      'Computer Science',
    );

    await user.type(screen.getByLabelText('Email:'), 'register@example.com');

    await user.type(screen.getByLabelText('Password:'), 'RegisterPassword123!');

    await user.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/register',
        {
          email: 'register@example.com',
          password: 'RegisterPassword123!',
          name: 'Test Professor',
          department: 'Computer Science',
        },
      );
    });

    expect(window.alert).toHaveBeenCalledWith(
      'Registration successful! You can now log in.',
    );

    expect(
      screen.getByRole('heading', { name: 'Professor Login' }),
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
      {
        email: 'reset-test@example.com',
      },
    );
  });

  it('shows an error message when a password reset request fails', async () => {
    const user = userEvent.setup();

    axios.post.mockRejectedValueOnce(new Error('Request failed'));

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
      await screen.findByText('Failed to send reset instructions.'),
    ).toBeInTheDocument();
  });

  it('closes the password reset dialog when Cancel is clicked', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Forgot Password?' }));

    expect(
      screen.getByRole('heading', { name: 'Reset Password' }),
    ).toBeInTheDocument();

    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('heading', { name: 'Reset Password' }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByPlaceholderText('Enter your email'),
    ).not.toBeInTheDocument();

    expect(axios.post).not.toHaveBeenCalled();
  });
});
