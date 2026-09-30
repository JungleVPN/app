import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentCard } from './ContentCard';

describe('ContentCard compact variant', () => {
  it('shows the title, description and icon', () => {
    render(
      <ContentCard
        variant='compact'
        title='Mask your IP'
        description='Hides your real IP address.'
        icon={<svg aria-label='ghost' />}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Mask your IP' })).toBeDefined();
    expect(screen.getByText('Hides your real IP address.')).toBeDefined();
    expect(screen.getByLabelText('ghost')).toBeDefined();
  });
});
