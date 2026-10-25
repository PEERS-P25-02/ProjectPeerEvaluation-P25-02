// These tests check that the team assignment page appears.
// TLDR: mount the page component and assert its main heading.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TeamAssignment from '../pages/TeamAssignment';

describe('TeamAssignment', () => {
  it('shows the Team Assignment page', () => {
    render(<TeamAssignment />);

    expect(screen.getByText('Team Assignment Page')).toBeInTheDocument();
  });
});
