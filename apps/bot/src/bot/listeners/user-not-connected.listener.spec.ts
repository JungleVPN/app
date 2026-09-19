import 'reflect-metadata';
import * as process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function buildRemnaService(
  lang: string | null = 'en',
  user: unknown = { id: 1, activeInternalSquads: [] },
  scope: 'ru' | 'global' | null = 'global',
) {
  return {
    getUserLang: vi.fn().mockResolvedValue(lang),
    getUserById: vi.fn().mockResolvedValue(user),
    getUserScope: vi.fn().mockResolvedValue(scope),
  };
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

  describe("email site URL from the user's scope", () => {
    beforeEach(() => {
      process.env.PUBLIC_DOMAIN_RU = 'ru-jungle.example';
      process.env.PUBLIC_DOMAIN_GLOBAL = 'jungle-vpn.com';
    });

    afterEach(() => {
      delete process.env.PUBLIC_DOMAIN_RU;
      delete process.env.PUBLIC_DOMAIN_GLOBAL;
    });

    const emailHtmlFor = async (
      scope: 'ru' | 'global' | null,
      lang: string | null = 'en',
    ): Promise<string> => {
      const zohoEmailService = buildZohoEmailService();
      const listener = new UserNotConnectedListener(
        buildBotService() as any,
        buildLocalService() as any,
        buildRemnaService(lang, { id: 1, activeInternalSquads: [] }, scope) as any,
        zohoEmailService as any,
      );

      await listener.listenToUserNotConnectedEvent(basePayload({}, 24) as any);

      const [, , html] = zohoEmailService.sendEmail.mock.calls[0];
      return html as string;
    };

    it("links to the RU domain for a user whose scope is 'ru'", async () => {
      expect(await emailHtmlFor('ru')).toContain('https://ru-jungle.example');
    });

    it("links to the global domain for a user whose scope is 'global'", async () => {
      expect(await emailHtmlFor('global')).toContain('https://jungle-vpn.com');
    });

    // The bug this whole change exists for: a paying RU customer whose panel squads
    // say anything other than "RU only" — an admin, an extra access squad, none at
    // all — used to be sent to the global storefront. The stored scope is the answer.
    it("links to the RU domain for an 'ru' user regardless of their squads", async () => {
      const html = await emailHtmlFor('ru');

      expect(html).toContain('https://ru-jungle.example');
      expect(html).not.toContain('jungle-vpn.com');
    });

    it("links to the global domain for a 'global' user whose lang is \"ru\"", async () => {
      const html = await emailHtmlFor('global', 'ru');

      expect(html).toContain('https://jungle-vpn.com');
      expect(html).not.toContain('ru-jungle.example');
    });

    // PUBLIC_DOMAIN_RU holds every host the RU storefront answers on; pasting the raw
    // value into a URL yields https://a,b,c/… , which no mail client will open.
    it('links to the first RU host when PUBLIC_DOMAIN_RU lists several', async () => {
      process.env.PUBLIC_DOMAIN_RU = 'jungle.community,thejungle.pro,web.thejungle.pro';

      const html = await emailHtmlFor('ru');

      expect(html).toContain('https://jungle.community');
      expect(html).not.toContain('thejungle.pro');
    });

    // The scope lookup can fail; an unreachable panel must not silently reroute an
    // RU customer, but a link has to point somewhere — global is the safe default.
    it('falls back to the global domain when the scope cannot be read', async () => {
      expect(await emailHtmlFor(null)).toContain('https://jungle-vpn.com');
    });

    it('still picks the email language from the user lang', async () => {
      expect(await emailHtmlFor('global', 'ru')).toContain('lang="ru"');
    });

    // The panel ships `user.not_connected` with activeInternalSquads always empty
    // for performance, so nothing about the storefront can be read off the payload:
    // the scope is asked for by user id.
    it('asks the service for the scope of the user the event names', async () => {
      const zohoEmailService = buildZohoEmailService();
      const remnaService = buildRemnaService('en', { id: 1, activeInternalSquads: [] }, 'ru');
      const listener = new UserNotConnectedListener(
        buildBotService() as any,
        buildLocalService() as any,
        remnaService as any,
        zohoEmailService as any,
      );

      await listener.listenToUserNotConnectedEvent(
        basePayload({ activeInternalSquads: [] }, 24) as any,
      );

      expect(remnaService.getUserScope).toHaveBeenCalledWith(1);
      const [, , html] = zohoEmailService.sendEmail.mock.calls[0];
      expect(html).toContain('https://ru-jungle.example');
    });
  });
});
