import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoadError } from './LoadError';

const { phCapture } = vi.hoisted(() => ({ phCapture: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../ui', () => ({
  Heading: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  Paragraph: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));
vi.mock('../../utils', () => ({ phCapture }));
vi.mock('../SupportWidget/SupportButton', () => ({
  SupportButton: ({ label }: { label?: string }) => <button type='button'>{label}</button>,
}));

describe('LoadError', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('tells the user the page could not be loaded', () => {
    render(<LoadError reason='plans' onRetry={() => {}} />);

    expect(screen.getByRole('heading', { name: 'loadError.title' })).toBeTruthy();
    expect(screen.getByText('loadError.description')).toBeTruthy();
  });

  it('tries again when the user asks to', () => {
    const onRetry = vi.fn();
    render(<LoadError reason='plans' onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'loadError.retry' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers a way to reach support when retrying does not help', () => {
    render(<LoadError reason='plans' onRetry={() => {}} />);

    expect(screen.getByRole('button', { name: 'loadError.support' })).toBeTruthy();
  });

  // How often each load fails, and whether retrying helps, is otherwise
  // invisible: the screen replaced spinners nobody could measure either.
  describe('analytics', () => {
    it('reports once that the screen was shown, with what failed to load', () => {
      const { rerender } = render(<LoadError reason='account' onRetry={() => {}} />);
      rerender(<LoadError reason='account' onRetry={() => {}} />);

      expect(phCapture).toHaveBeenCalledTimes(1);
      expect(phCapture).toHaveBeenCalledWith('load_error_viewed', { reason: 'account' });
    });

    it('reports a retry with what failed to load', () => {
      render(<LoadError reason='plans' onRetry={() => {}} />);

      fireEvent.click(screen.getByRole('button', { name: 'loadError.retry' }));

      expect(phCapture).toHaveBeenLastCalledWith('load_error_retry_clicked', { reason: 'plans' });
    });
  });
});
