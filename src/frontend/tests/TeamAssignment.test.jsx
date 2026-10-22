import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TeamAssignment from '../pages/TeamAssignment';

describe('TeamAssignment', () => {
  it('shows the Team Assignment page', () => {
    render(<TeamAssignment />);

    expect(screen.getByText('Team Assignment Page')).toBeInTheDocument();
  });
});
