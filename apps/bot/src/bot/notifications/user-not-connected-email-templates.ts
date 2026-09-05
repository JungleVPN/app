export type NotConnectedEmailLocale = 'en' | 'ru';
export type NotConnectedEmailStage = 24 | 48;

interface NotConnectedEmailCopy {
  subject: string;
  kicker: string;
  headline: string;
  bodyCopy: string;
  ctaLabel: string;
}

const COPY: Record<
  NotConnectedEmailLocale,
  Record<NotConnectedEmailStage, NotConnectedEmailCopy>
> = {
  en: {
    24: {
      subject: "Having trouble connecting to Jungle? We're here to help",
      kicker: 'Still not connected',
      headline: "Haven't connected yet?",
      bodyCopy:
        "We noticed you haven't connected to Jungle yet. Running into any difficulties setting things up? Reply to this email or reach out to support and we'll help you get online.",
      ctaLabel: 'Open the app',
    },
    48: {
      subject: "48 hours in and still not connected — let's fix that",
      kicker: 'Need a hand?',
      headline: 'Still not connected',
      bodyCopy:
        "It's been 48 hours and your account still isn't connected. If something isn't working, tell us what's going on — we'll sort it out with you, it usually takes less than a minute.",
      ctaLabel: 'Get help now',
    },
  },
  ru: {
    24: {
      subject: 'Не получается подключиться к Jungle? Мы поможем',
      kicker: 'Все еще не подключен',
      headline: 'Еще не подключился?',
      bodyCopy:
        'Заметили, что ты еще не подключился к Jungle. Есть какие-то сложности с настройкой? Ответь на это письмо или напиши в поддержку — поможем разобраться.',
      ctaLabel: 'Открыть приложение',
    },
    48: {
      subject: 'Прошло 48 часов, а подключения все еще нет — давай разберемся',
      kicker: 'Нужна помощь?',
      headline: 'Все еще не подключен',
      bodyCopy:
        'Прошло уже 48 часов, а аккаунт так и не подключен. Если что-то не работает — расскажи что именно, поможем разобраться, обычно это занимает меньше минуты.',
      ctaLabel: 'Получить помощь',
    },
  },
};

function renderEmailHtml(params: {
  locale: NotConnectedEmailLocale;
  kicker: string;
  headline: string;
  bodyCopy: string;
  ctaLabel: string;
  ctaUrl: string;
  supportUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="${params.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr>
<td style="padding:0 8px 16px;">
<span style="font-family:'Archivo',Arial,sans-serif;font-weight:800;font-size:18px;color:#201e1d;letter-spacing:0.01em;">JUNGLE&nbsp;🌴</span>
</td>
</tr>
<tr>
<td style="padding:28px 8px 4px;">
<span style="display:block;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#ae1800;font-family:'Archivo',Arial,sans-serif;">${params.kicker}</span>
</td>
</tr>
<tr>
<td style="padding:8px 8px 24px;">
<span style="display:block;font-family:'Archivo',Arial,sans-serif;font-weight:800;font-size:30px;line-height:1.15;color:#201e1d;letter-spacing:-0.01em;">${params.headline}</span>
</td>
</tr>
<tr>
<td style="padding:0 8px 24px;font-size:15px;line-height:1.6;color:#201e1d;">
${params.bodyCopy}
</td>
</tr>
<tr>
<td style="padding:0 8px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td style="border-radius:32px;background: linear-gradient(to right, #8b5cf6, #fbbf24);">
<a href="${params.ctaUrl}" target="_blank" rel="noopener" style="display:block;padding:16px 20px;font-family:'Archivo',Arial,sans-serif;font-weight:800;font-size:14px;letter-spacing:0.02em;text-transform:uppercase;color:#f3f2f2;text-decoration:none;text-align:left;">${params.ctaLabel}</a>
</td>
</tr>
</table>
</td>
</tr>
<tr><td style="padding:0 8px;"><div style="height:2px;line-height:2px;font-size:0;background:#a6a5a5;">&nbsp;</div></td></tr>
<tr>
<td style="padding:24px 8px 24px;font-size:14px;color:#201e1d;">
<a href="${params.supportUrl}" style="color:#ae1800;text-decoration:underline;">${params.locale === 'ru' ? 'Написать в поддержку' : 'Contact support'}</a>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function buildNotConnectedEmailSubject(
  locale: NotConnectedEmailLocale,
  stage: NotConnectedEmailStage,
): string {
  return COPY[locale][stage].subject;
}

export function buildNotConnectedEmailHtml(params: {
  locale: NotConnectedEmailLocale;
  stage: NotConnectedEmailStage;
  appUrl: string;
  supportUrl: string;
}): string {
  const copy = COPY[params.locale][params.stage];

  return renderEmailHtml({
    locale: params.locale,
    kicker: copy.kicker,
    headline: copy.headline,
    bodyCopy: copy.bodyCopy,
    ctaLabel: copy.ctaLabel,
    ctaUrl: params.appUrl,
    supportUrl: params.supportUrl,
  });
}
