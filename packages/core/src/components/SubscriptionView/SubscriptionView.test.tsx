import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSubscriptionInfoStore } from '../../stores';
import { SubscriptionView } from './SubscriptionView';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../hooks', () => ({ useNavigation: () => vi.fn() }));
vi.mock('../InstallationGuide', () => ({ InstallationGuideConnector: () => null }));
vi.mock('./components/SubscriptionInfoSection', () => ({ SubscriptionInfoSection: () => null }));
vi.mock('../Loading/Loading', () => ({ Loading: () => <p>loading</p> }));
vi.mock('../LoadError/LoadError', () => ({
  LoadError: ({ reason, onRetry }: { reason: string; onRetry: () => void }) => (
    <button type='button' data-reason={reason} onClick={onRetry}>
      retry
    </button>
  ),
}));

describe('SubscriptionView', () => {
  afterEach(() => {
    cleanup();
    useSubscriptionInfoStore.getState().actions.resetState();
  });

  it('shows a spinner while the subscription is still loading', () => {
    render(<SubscriptionView shortUuid='sub-1' load={{ error: null, retry: vi.fn() }} />);

    expect(screen.getByText('loading')).toBeTruthy();
  });

  it('offers a retry instead of a spinner once loading has failed', () => {
    const retry = vi.fn();
    render(<SubscriptionView shortUuid='sub-1' load={{ error: 'ERR_FATCH_USER', retry }} />);

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));

    expect(screen.queryByText('loading')).toBeNull();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['ERR_FATCH_USER', 'subscription'],
    ['ERR_GET_SUB_LINK', 'subscription_missing'],
    ['ERR_PARSE_APPCONFIG', 'subscription_page_config'],
  ] as const)('reports a %s failure as %s', (error, reason) => {
    render(<SubscriptionView shortUuid='sub-1' load={{ error, retry: vi.fn() }} />);

    expect(screen.getByRole('button', { name: 'retry' }).getAttribute('data-reason')).toBe(reason);
  });
});
