import { act, render, screen } from '@testing-library/react';
import type { IpStatusDto } from '@workspace/types';
import { describe, expect, it, vi } from 'vitest';
import { IpStatusBar } from './IpStatusBar';

const { getIpStatus } = vi.hoisted(() => ({ getIpStatus: vi.fn() }));

vi.mock('../../api', () => ({
  useRemnawaveApi: () => ({ getIpStatus }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { ip?: string }) => (params?.ip ? `${key} ${params.ip}` : key),
    i18n: { language: 'en' },
  }),
}));

function ipStatus(overrides: Partial<IpStatusDto> = {}): IpStatusDto {
  return {
    ip: '81.84.17.141',
    countryCode: 'PT',
    city: null,
    isp: null,
    latitude: null,
    longitude: null,
    protected: false,
    ...overrides,
  };
}

function heightClasses(element: Element): string[] {
  return [...element.classList].filter((token) => /^(h|min-h|max-h)-/.test(token));
}

describe('IpStatusBar', () => {
  it('makes no protection claim while the answer is unknown', () => {
    getIpStatus.mockReturnValue(new Promise(() => {}));

    render(<IpStatusBar />);

    expect(screen.queryByText(/ipStatus\.(protected|unprotected)/)).toBeNull();
  });

  it.each([
    ['protection could not be determined', ipStatus({ protected: null })],
    ['the IP could not be determined', ipStatus({ ip: null })],
  ])('makes no protection claim when %s', async (_case, status) => {
    getIpStatus.mockResolvedValue(status);

    render(<IpStatusBar />);
    await act(() => Promise.resolve());

    expect(screen.queryByText(/ipStatus\.(protected|unprotected)/)).toBeNull();
  });

  it('reserves exactly the height the bar takes once the answer lands', async () => {
    getIpStatus.mockReturnValue(new Promise(() => {}));
    const pending = render(<IpStatusBar />);
    const placeholder = pending.container.firstElementChild?.cloneNode();
    pending.unmount();

    getIpStatus.mockResolvedValue(ipStatus());
    render(<IpStatusBar />);
    const bar = await screen.findByRole('status');

    expect(placeholder).not.toBeNull();
    expect(heightClasses(bar)).toHaveLength(1);
    expect(heightClasses(placeholder as Element)).toEqual(heightClasses(bar));
  });

  it('tells a visitor behind the VPN that they are protected', async () => {
    getIpStatus.mockResolvedValue(ipStatus({ protected: true }));

    render(<IpStatusBar />);

    expect(await screen.findByText(/ipStatus\.protected/)).toBeTruthy();
  });
});
