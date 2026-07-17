import * as process from 'node:process';
import { BotContext, ErrorMessage } from '@bot/bot.types';
import { PaymentPeriod } from '@shared/payments';
import { UserDevice } from '@shared/user.types';
import { decodeAdCode } from '@utils/url';
import { Api, Bot, GrammyError, RawApi } from 'grammy';
import type { Message, MessageEntity } from 'grammy/types';

/** Extract the `other` options parameter from a Bot API method. */
type SendMessageOptions = Parameters<Api<RawApi>['sendMessage']>[2];
type EditMessageTextOptions = Parameters<Api<RawApi>['editMessageText']>[3];
type SendPhotoOptions = Parameters<Api<RawApi>['sendPhoto']>[3];
type EditMessageCaptionOptions = Parameters<Api<RawApi>['editMessageCaption']>[2];

/** Appends session-derived params (`ref`, `ad`) to a TMA URL. */
export const withReferral = (ctx: BotContext, url: string): string => {
  const params = new URLSearchParams();
  if (!ctx.session.startPayload?.value) return url;

  switch (ctx.session.startPayload?.type) {
    case 'referral':
      if (!ctx.session.startPayload.value) return url;
      params.set('ref', ctx.session.startPayload.value);
      break;
    case 'ad':
      params.set('adCode', decodeAdCode(ctx.session.startPayload.value ?? ''));
      break;
  }

  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
};

export const isValidUsername = (username: string | undefined | null): boolean => {
  if (!username) return false;
  const regex = /^[A-Za-z0-9_-]+$/;
  return regex.test(username);
};

export const mapDeviceLabel = (device: UserDevice) => {
  switch (device) {
    case 'ios':
      return '🍏 IOS';
    case 'android':
      return '🤖 Android';
    case 'macOS':
      return '💻 MacOS';
    case 'windows':
      return '🖥 Windows';
    default:
      return device;
  }
};

export const mapToClientAppName = (device: UserDevice) => {
  switch (device) {
    case 'ios':
    case 'android':
    case 'macOS':
      return 'v2RayTun';
    case 'windows':
      return 'Happ';
    default:
      return 'v2RayTun';
  }
};

export const toDateString = (value: Date | string, utc?: boolean) => {
  if (typeof value === 'string') {
    value = new Date(value);
  }
  return value.toLocaleDateString('ru-EU', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: utc ? undefined : 'Europe/Moscow',
  });
};

export const mapPeriodToMonthsNumber = (period: PaymentPeriod | undefined) => {
  switch (period) {
    case 'month_1':
      return 1;
    case 'month_3':
      return 3;
    case 'month_6':
      return 6;
    default:
      return 1;
  }
};

export const mapEURAmountToMonthsNumber = (amount: string | undefined) => {
  switch (amount) {
    case `${process.env.PRICE_EUR_MONTH_1}00`:
      return 1;
    case `${process.env.PRICE_EUR_MONTH_3}00`:
      return 3;
    case `${process.env.PRICE_EUR_MONTH_6}00`:
      return 6;
    default:
      return 1;
  }
};

export const mapToCorrectAmount = (amount: number) => {
  return +amount.toString().slice(0, amount.toString().length - 2);
};

export const mapPeriodLabelToPriceLabel = (period: PaymentPeriod) => {
  switch (period) {
    case 'month_1':
      return 'payment-period-button-label-1';
    case 'month_3':
      return 'payment-period-button-label-2';
    case 'month_6':
      return 'payment-period-button-label-3';
  }
};

export async function safeSendMessage(
  bot: Bot<BotContext, Api<RawApi>>,
  userId: number,
  content: string,
  options?: SendMessageOptions,
): Promise<Message.TextMessage | ErrorMessage> {
  try {
    return await bot.api.sendMessage(userId, content, {
      parse_mode: 'HTML',
      ...options,
    });
  } catch (err) {
    const error = err as GrammyError;
    return error.description;
  }
}

export async function safeReplyMessage(
  ctx: BotContext,
  text: string,
): Promise<Message.TextMessage | ErrorMessage> {
  try {
    return await ctx.reply(text, {
      parse_mode: 'HTML',
    });
  } catch (err) {
    const error = err as GrammyError;
    return error.description;
  }
}

export async function safeEditMessage(
  bot: Bot<BotContext, Api<RawApi>>,
  userId: number | string,
  messageId: number,
  text: string,
  options?: EditMessageTextOptions,
) {
  try {
    return await bot.api.editMessageText(Number(userId), messageId, text, {
      parse_mode: 'HTML',
      ...options,
    });
  } catch (err) {
    return err as GrammyError;
  }
}

export async function safeSendPhoto(
  bot: Bot<BotContext, Api<RawApi>>,
  userId: number,
  photo: string,
  caption?: string,
  options?: SendPhotoOptions,
): Promise<Message.PhotoMessage | ErrorMessage> {
  try {
    return await bot.api.sendPhoto(userId, photo, {
      caption,
      parse_mode: 'HTML',
      ...options,
    });
  } catch (err) {
    const error = err as GrammyError;
    return error.description;
  }
}

export async function safeEditMessageCaption(
  bot: Bot<BotContext, Api<RawApi>>,
  userId: number | string,
  messageId: number,
  caption: string,
  options?: EditMessageCaptionOptions,
) {
  try {
    return await bot.api.editMessageCaption(Number(userId), messageId, {
      caption,
      parse_mode: 'HTML',
      ...options,
    });
  } catch (err) {
    return err as GrammyError;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Converts Telegram message entities to HTML markup.
 * Supports: bold, italic, underline, strikethrough, code, pre, text_link, blockquote, expandable_blockquote, spoiler
 */
export function convertEntitiesToHtml(text: string, entities?: MessageEntity[]): string {
  if (!entities || entities.length === 0) return escapeHtml(text);

  // Sort entities by ascending offset; skip overlapping ones
  const sortedEntities = [...entities].sort((a, b) => a.offset - b.offset);

  let result = '';
  let pos = 0;

  for (const entity of sortedEntities) {
    const start = entity.offset;
    const end = entity.offset + entity.length;

    if (start < pos) continue; // skip overlapping entity

    result += escapeHtml(text.substring(pos, start));

    const entityText = escapeHtml(text.substring(start, end));

    switch (entity.type) {
      case 'bold':
        result += `<b>${entityText}</b>`;
        break;
      case 'italic':
        result += `<i>${entityText}</i>`;
        break;
      case 'underline':
        result += `<u>${entityText}</u>`;
        break;
      case 'strikethrough':
        result += `<s>${entityText}</s>`;
        break;
      case 'code':
        result += `<code>${entityText}</code>`;
        break;
      case 'pre':
        if ('language' in entity && entity.language) {
          result += `<pre><code class="language-${entity.language}">${entityText}</code></pre>`;
        } else {
          result += `<pre>${entityText}</pre>`;
        }
        break;
      case 'text_link':
        if ('url' in entity) {
          result += `<a href="${entity.url}">${entityText}</a>`;
        } else {
          result += entityText;
        }
        break;
      case 'blockquote':
        result += `<blockquote>${entityText}</blockquote>`;
        break;
      case 'expandable_blockquote':
        result += `<blockquote expandable>${entityText}</blockquote>`;
        break;
      case 'spoiler':
        result += `<tg-spoiler>${entityText}</tg-spoiler>`;
        break;
      default:
        result += entityText;
    }

    pos = end;
  }

  result += escapeHtml(text.substring(pos));

  return result;
}

export const getAppUrl = (device: UserDevice | undefined): string | undefined => {
  switch (device) {
    case 'ios':
      return process.env.V2RAYTUN_IOS_APP_URL;
    case 'macOS':
      return process.env.V2RAYTUN_MACOS_APP_URL;
    case 'android':
      return process.env.V2RAYTUN_ANDROID_APP_URL;
    case 'windows':
      return process.env.HAPP_WINDOWS_APP_URL;
    default:
      return process.env.IOS_APP_DOWNLOAD_URL;
  }
};

export const getRedirectUrl = (device: UserDevice | undefined, subUrl: string) => {
  switch (device) {
    case 'ios':
    case 'macOS':
    case 'android':
      return `${process.env.V2RAYTUN_REDIRECT_URL}/${subUrl}` || 'https://example.com/ios';
    case 'windows':
      return `${process.env.HAPP_REDIRECT_URL}/${subUrl}` || 'https://example.com/windows';
  }
};
