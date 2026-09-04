import type { TSubscriptionPageButtonConfig } from '@workspace/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlockButton } from './BlockButton';

const { phCapture } = vi.hoisted(() => ({ phCapture: vi.fn() }));

vi.mock('../../../../utils', () => ({
  getIconFromLibrary: () => '<svg />',
  TemplateEngine: {
    formatWithMetaInfo: (link: string, meta: { username: string; subscriptionUrl: string }) =>
      link.replace('{subscriptionUrl}', meta.subscriptionUrl).replace('{username}', meta.username),
  },
  phCapture,
}));

function fakeButton(overrides: Partial<TSubscriptionPageButtonConfig> = {}) {
  return {
    type: 'external',
    link: 'https://apps.apple.com/app/id123',
    text: { en: 'Download' },
    svgIconKey: 'apple',
    ...overrides,
  } as TSubscriptionPageButtonConfig;
}

function renderButton(overrides: Partial<TSubscriptionPageButtonConfig> = {}) {
  const onCopy = vi.fn().mockResolvedValue(undefined);
  render(
    <BlockButton
      button={fakeButton(overrides)}
      variant={'secondary'}
      username={'user1'}
      subscriptionUrl={'https://sub.example.com/abc'}
      svgLibrary={{}}
      onCopy={onCopy}
      t={(text) => text.en ?? ''}
    />,
  );
  return { onCopy };
}

describe('BlockButton', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('captures app_download_clicked when an external (install) button is pressed', () => {
    renderButton({ type: 'external', link: 'https://apps.apple.com/app/id123' });

    fireEvent.click(screen.getByRole('button'));

    expect(phCapture).toHaveBeenCalledWith('app_download_clicked', {
      link: 'https://apps.apple.com/app/id123',
    });
  });

  it('captures app_connect_clicked when a subscriptionLink (deep link) button is pressed', () => {
    renderButton({
      type: 'subscriptionLink',
      link: 'v2rayng://install-sub?url={subscriptionUrl}',
    });

    fireEvent.click(screen.getByRole('button'));

    expect(phCapture).toHaveBeenCalledWith('app_connect_clicked', {
      link: 'v2rayng://install-sub?url=https://sub.example.com/abc',
    });
  });

  it('captures app_connect_clicked when a copyButton (manual add) button is pressed', () => {
    renderButton({ type: 'copyButton', link: '{subscriptionUrl}' });

    fireEvent.click(screen.getByRole('button'));

    expect(phCapture).toHaveBeenCalledWith('app_connect_clicked', {
      link: 'https://sub.example.com/abc',
    });
  });
});
