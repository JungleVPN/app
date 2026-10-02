import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionExpired } from './SessionExpired';

const { closeMiniApp, phCapture } = vi.hoisted(() => ({
  closeMiniApp: vi.fn(),
  phCapture: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tma.js/sdk-react', () => ({ miniApp: { close: closeMiniApp } }));
vi.mock('../../utils', () => ({ phCapture }));
vi.mock('../../ui', () => ({
  Container: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Heading: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  Paragraph: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

describe('SessionExpired', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('tells the user to reopen the app', () => {
    render(<SessionExpired />);

    expect(screen.getByRole('heading', { name: 'sessionExpired.title' })).toBeTruthy();
    expect(screen.getByText('sessionExpired.description')).toBeTruthy();
  });

  // Telegram only issues fresh launch data when the app is opened again;
  // reloading the page in place would send the same expired data.
  it('closes the mini app so it can be opened again', () => {
    render(<SessionExpired />);

    fireEvent.click(screen.getByRole('button', { name: 'sessionExpired.close' }));

    expect(closeMiniApp).toHaveBeenCalledTimes(1);
  });

  it('reports once that the user was asked to reopen the app', () => {
    const { rerender } = render(<SessionExpired />);
    rerender(<SessionExpired />);

    expect(phCapture).toHaveBeenCalledTimes(1);
    expect(phCapture).toHaveBeenCalledWith('session_expired_viewed');
  });
});
