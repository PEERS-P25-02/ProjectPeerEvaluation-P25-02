// These tests check how the app remembers who is signed in.
// TLDR: render a small consumer of AuthContext and verify login, logout, saved-user
//       restoration, and malformed-data cleanup.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Expose context state and actions as visible UI so tests exercise the provider contract.
function TestAuthComponent() {
  const { currentUser, login, logout } = useAuth();

  return (
    <div>
      <p>
        {currentUser ? `Logged in as ${currentUser.name}` : 'No user logged in'}
      </p>

      <button
        type="button"
        onClick={() =>
          login({
            name: 'Test Professor',
            email: 'professor@example.com',
          })
        }
      >
        Test Login
      </button>

      <button type="button" onClick={logout}>
        Test Logout
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores the user when login is called', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>,
    );

    expect(screen.getByText('No user logged in')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Test Login' }));

    expect(screen.getByText('Logged in as Test Professor')).toBeInTheDocument();

    expect(JSON.parse(localStorage.getItem('user'))).toEqual({
      name: 'Test Professor',
      email: 'professor@example.com',
    });
  });

  it('loads an existing user from localStorage', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        name: 'Saved Professor',
        email: 'saved@example.com',
      }),
    );

    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>,
    );

    expect(
      await screen.findByText('Logged in as Saved Professor'),
    ).toBeInTheDocument();
  });

  it('clears malformed stored user data without breaking the provider', async () => {
    localStorage.setItem('user', '{malformed-json');

    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>,
    );

    expect(await screen.findByText('No user logged in')).toBeInTheDocument();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('removes the user when logout is called', async () => {
    const user = userEvent.setup();

    localStorage.setItem(
      'user',
      JSON.stringify({
        name: 'Test Professor',
        email: 'professor@example.com',
      }),
    );

    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>,
    );

    expect(
      await screen.findByText('Logged in as Test Professor'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Test Logout' }));

    expect(screen.getByText('No user logged in')).toBeInTheDocument();

    expect(localStorage.getItem('user')).toBeNull();
  });
});
