import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConnectEmailPage from './ConnectEmailPage';

const { connectEmail } = vi.hoisted(() => ({
  connectEmail: {
    email: '',
    error: null,
    hasError: false,
    isLoading: false,
    isConnecting: false,
    connectFailed: false,
    retryConnect: vi.fn(),
    handleEmailChange: vi.fn(),
    handleSubmit: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../ui', () => ({
  Block: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));
vi.mock('../../ui/Paragraph', () => ({
  Paragraph: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));
vi.mock('./useConnectEmail', () => ({ useConnectEmail: () => connectEmail }));
vi.mock('../../components', () => ({
  Loading: () => <p>loading</p>,
  LoadError: ({ reason, onRetry }: { reason: string; onRetry: () => void }) => (
    <button type='button' data-reason={reason} onClick={onRetry}>
      retry
    </button>
  ),
}));

describe('ConnectEmailPage', () => {
  afterEach(() => {
    cleanup();
    connectEmail.isConnecting = false;
    connectEmail.connectFailed = false;
  });

  it('shows a spinner while the account is being created', () => {
    connectEmail.isConnecting = true;

    render(<ConnectEmailPage />);

    expect(screen.getByText('loading')).toBeTruthy();
  });

  it('offers a retry once creating the account has failed', () => {
    connectEmail.connectFailed = true;
    render(<ConnectEmailPage />);
    expect(screen.getByRole('button', { name: 'retry' }).getAttribute('data-reason')).toBe(
      'connect_email_to_tg',
    );

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));

    expect(connectEmail.retryConnect).toHaveBeenCalledTimes(1);
  });
});
