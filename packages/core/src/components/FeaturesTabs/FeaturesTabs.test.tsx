import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type FeaturesTab, FeaturesTabs } from './FeaturesTabs';

const buildTabs = (): FeaturesTab[] => [
  {
    id: 'privacy',
    label: 'Privacy',
    items: [
      { title: 'Mask your IP', description: 'Hides your real IP address.' },
      { title: 'No-logs policy', description: 'Keeps no logs.' },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    items: [{ title: 'Strong Protocols', description: 'VLESS and WireGuard.' }],
  },
];

describe('FeaturesTabs', () => {
  it('shows a tab for every group', () => {
    render(<FeaturesTabs tabs={buildTabs()} ariaLabel='Features' />);

    expect(screen.getByRole('tab', { name: 'Privacy' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Security' })).toBeDefined();
  });

  it('shows the cards of the first tab by default', () => {
    render(<FeaturesTabs tabs={buildTabs()} ariaLabel='Features' />);

    expect(screen.getByRole('heading', { name: 'Mask your IP' })).toBeDefined();
    expect(screen.getByText('Keeps no logs.')).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Strong Protocols' })).toBeNull();
  });

  it('shows the cards of the selected tab', () => {
    render(<FeaturesTabs tabs={buildTabs()} ariaLabel='Features' />);

    fireEvent.click(screen.getByRole('tab', { name: 'Security' }));

    expect(screen.getByRole('heading', { name: 'Strong Protocols' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Mask your IP' })).toBeNull();
  });
});
