import { BotContext, SessionData } from '@bot/bot.types';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { MainMenuService } from '@bot/navigation/features/main/main.service';
import { RemnaService } from '@remna/remna.service';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../../analytics/analytics.service';
import { StartCommand } from './start.command';

function buildSession(): SessionData {
  return {
    userId: undefined,
    lang: undefined,
    paymentUrl: undefined,
    paymentId: undefined,
    clientApp: [],
    startPayload: undefined,
    user: {},
  } as SessionData;
}

function buildCtx(match = ''): BotContext {
  return {
    from: { id: 777_000, language_code: 'en' },
    match,
    session: buildSession(),
    react: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
    t: vi.fn().mockReturnValue('text'),
    api: {
      setChatMenuButton: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as BotContext;
}

function buildCommand({ getUserByTgIdResult = null as object | null } = {}) {
  const remnaService = {
    getUserByTgId: vi.fn().mockResolvedValue(getUserByTgIdResult ? [getUserByTgIdResult] : null),
    getUserLang: vi.fn().mockResolvedValue(null),
    upsertUserLang: vi.fn().mockResolvedValue(undefined),
  } as unknown as RemnaService;

  const mainMenu = {
    build: vi.fn().mockReturnValue({}),
  } as unknown as MainMenu;

  const mainMenuService = {
    init: vi.fn().mockResolvedValue(undefined),
  } as unknown as MainMenuService;

  const analyticsService = {
    trackBotStarted: vi.fn().mockResolvedValue(undefined),
  } as unknown as AnalyticsService;

  const command = new StartCommand(mainMenu, mainMenuService, remnaService, analyticsService);

  return { command, analyticsService, remnaService };
}

describe('StartCommand.handle — bot_started tracking', () => {
  it('records a new user with isReturningUser false', async () => {
    const { command, analyticsService } = buildCommand({ getUserByTgIdResult: null });

    await command.handle(buildCtx());

    expect(analyticsService.trackBotStarted).toHaveBeenCalledWith(
      expect.objectContaining({ telegramId: 777_000, isReturningUser: false }),
    );
  });

  it('records a returning user with isReturningUser true', async () => {
    const { command, analyticsService } = buildCommand({
      getUserByTgIdResult: { id: 1000 },
    });

    await command.handle(buildCtx());

    expect(analyticsService.trackBotStarted).toHaveBeenCalledWith(
      expect.objectContaining({ telegramId: 777_000, isReturningUser: true }),
    );
  });

  it('passes the decoded adCode for an ad deep-link', async () => {
    const { command, analyticsService } = buildCommand();

    await command.handle(buildCtx('adCode_channel_42'));

    expect(analyticsService.trackBotStarted).toHaveBeenCalledWith(
      expect.objectContaining({ adCode: 'channel_42' }),
    );
  });

  it('passes adCode as undefined for an organic user with no deep-link', async () => {
    const { command, analyticsService } = buildCommand();

    await command.handle(buildCtx(''));

    expect(analyticsService.trackBotStarted).toHaveBeenCalledWith(
      expect.objectContaining({ adCode: undefined }),
    );
  });

  it('passes adCode as undefined for a referral deep-link', async () => {
    const { command, analyticsService } = buildCommand();

    await command.handle(buildCtx('ref_dXNlci11dWlkLTEyMw'));

    expect(analyticsService.trackBotStarted).toHaveBeenCalledWith(
      expect.objectContaining({ adCode: undefined }),
    );
  });
});
