import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserNotConnectedListener } from './user-not-connected.listener';

const mockSendMessage = vi.fn().mockResolvedValue(undefined);

vi.mock('@bot/utils/utils', () => ({
  safeSendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));

function buildBotService() {
  return { bot: { api: { sendMessage: vi.fn() } } };
}

function buildLocalService() {
  return { i18n: { t: vi.fn((_locale: string, key: string) => key) } };
}

function buildRemnaService(lang: string | null = 'en') {
  return { getUserLang: vi.fn().mockResolvedValue(lang) };
}

function buildZohoEmailService() {
  return {
    hasCredentials: true,
    sendEmail: vi.fn().mockResolvedValue(undefined),
    describeError: vi.fn((err: unknown) => String(err)),
  };
}

const basePayload = (overrides: Record<string, unknown> = {}, expirationHours = 24) => ({
  event: 'user.not_connected',
  meta: { expiration: expirationHours },
  data: {
    id: 1,
    telegramId: 555,
    email: 'user@example.com',
    ...overrides,
  },
  timestamp: '2026-01-01T00:00:00.000Z',
});

describe('UserNotConnectedListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the 24h bot message and email when just under the 48h threshold', async () => {
    const localService = buildLocalService();
    const zohoEmailService = buildZohoEmailService();
    const listener = new UserNotConnectedListener(
      buildBotService() as any,
      localService as any,
      buildRemnaService() as any,
      zohoEmailService as any,
    );

    await listener.listenToUserNotConnectedEvent(basePayload({}, 24) as any);

    expect(mockSendMessage).toHaveBeenCalledWith(
      listener.bot,
      555,
      'user-not-connected-24',
      expect.anything(),
    );
    expect(zohoEmailService.sendEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.any(String),
      expect.any(String),
    );
  });

  it('sends the 48h bot message and email once the threshold is reached', async () => {
    const localService = buildLocalService();
    const zohoEmailService = buildZohoEmailService();
    const listener = new UserNotConnectedListener(
      buildBotService() as any,
      localService as any,
      buildRemnaService() as any,
      zohoEmailService as any,
    );

    await listener.listenToUserNotConnectedEvent(basePayload({}, 48) as any);

    expect(mockSendMessage).toHaveBeenCalledWith(
      listener.bot,
      555,
      'user-not-connected-48',
      expect.anything(),
    );
    expect(zohoEmailService.sendEmail).toHaveBeenCalled();
  });

  it('skips bot notifications when telegramId is missing', async () => {
    const zohoEmailService = buildZohoEmailService();
    const listener = new UserNotConnectedListener(
      buildBotService() as any,
      buildLocalService() as any,
      buildRemnaService() as any,
      zohoEmailService as any,
    );

    await listener.listenToUserNotConnectedEvent(basePayload({ telegramId: null }, 24) as any);

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(zohoEmailService.sendEmail).toHaveBeenCalled();
  });

  it('skips the email when the user has no email address', async () => {
    const zohoEmailService = buildZohoEmailService();
    const listener = new UserNotConnectedListener(
      buildBotService() as any,
      buildLocalService() as any,
      buildRemnaService() as any,
      zohoEmailService as any,
    );

    await listener.listenToUserNotConnectedEvent(basePayload({ email: null }, 24) as any);

    expect(mockSendMessage).toHaveBeenCalled();
    expect(zohoEmailService.sendEmail).not.toHaveBeenCalled();
  });

  it('skips the email when Zoho credentials are not configured', async () => {
    const zohoEmailService = { ...buildZohoEmailService(), hasCredentials: false };
    const listener = new UserNotConnectedListener(
      buildBotService() as any,
      buildLocalService() as any,
      buildRemnaService() as any,
      zohoEmailService as any,
    );

    await listener.listenToUserNotConnectedEvent(basePayload({}, 24) as any);

    expect(zohoEmailService.sendEmail).not.toHaveBeenCalled();
  });

  it('writes the 24h and 48h emails in different subjects with a common meaning', async () => {
    const zohoEmailService = buildZohoEmailService();
    const listener = new UserNotConnectedListener(
      buildBotService() as any,
      buildLocalService() as any,
      buildRemnaService() as any,
      zohoEmailService as any,
    );

    await listener.listenToUserNotConnectedEvent(basePayload({}, 24) as any);
    const [, subject24] = zohoEmailService.sendEmail.mock.calls[0];

    zohoEmailService.sendEmail.mockClear();
    await listener.listenToUserNotConnectedEvent(basePayload({}, 48) as any);
    const [, subject48] = zohoEmailService.sendEmail.mock.calls[0];

    expect(subject24).not.toEqual(subject48);
  });
});
