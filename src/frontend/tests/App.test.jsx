import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  // Initial test for issue #28
  it('shows the professor login form on the initial route', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(
      screen.getByRole('heading', { name: 'Professor Login' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email:')).toBeInTheDocument();
    expect(screen.getByLabelText('Password:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });
});