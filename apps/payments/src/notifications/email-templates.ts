export type EmailLocale = 'en' | 'ru';
export type ExpiryEmailLocale = EmailLocale;

// ── Shared shell ──────────────────────────────────────────────────────────────

interface EmailShellParams {
  locale: EmailLocale;
  kicker: string;
  headline: string;
  bodyCopy: string;
  detailLabel: string;
  detailValue: string;
  ctaLabel: string;
  ctaUrl: string;
  supportPrompt: string;
  supportLinkLabel: string;
  supportUrl: string;
  signOff: string;
  footerNotice: string;
}

function renderEmailShell(params: EmailShellParams): string {
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
<span style="display:block;font-family:'Archivo',Arial,sans-serif;font-weight:800;font-size:34px;line-height:1.1;color:#201e1d;letter-spacing:-0.01em;">${params.headline}</span>
</td>
</tr>

<tr>
<td style="padding:24px 8px 8px;">
<span style="display:block;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#605d5d;font-family:'Archivo',Arial,sans-serif;">${params.detailLabel}</span>
</td>
</tr>
<tr>
<td style="padding:6px 8px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td style="padding:16px;font-family:'Archivo',Arial,sans-serif;font-weight:800;font-size:20px;color:#201e1d;">${params.detailValue}</td></tr>
</table>
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
<td bgcolor="linear-gradient(to right, #8b5cf6, #fbbf24);" style="border-radius:32px;background: linear-gradient(to right, #8b5cf6, #fbbf24);">
<a href="${params.ctaUrl}" target="_blank" rel="noopener" style="display:block;padding:16px 20px;font-family:'Archivo',Arial,sans-serif;font-weight:800;font-size:14px;letter-spacing:0.02em;text-transform:uppercase;color:#f3f2f2;text-decoration:none;text-align:left;">${params.ctaLabel}</a>
</td>
</tr>
</table>
</td>
</tr>

<tr><td style="padding:0 8px;"><div style="height:2px;line-height:2px;font-size:0;background:#a6a5a5;">&nbsp;</div></td></tr>

<tr>
<td style="padding:24px 8px 4px;font-size:14px;color:#201e1d;">
${params.supportPrompt} <a href="${params.supportUrl}" style="color:#ae1800;text-decoration:underline;">${params.supportLinkLabel}</a>
</td>
</tr>
<tr>
<td style="padding:16px 8px 24px;font-family:'Archivo',Arial,sans-serif;font-weight:800;font-size:15px;color:#201e1d;">${params.signOff}</td>
</tr>

<tr>
<td style="padding:20px 8px 0;font-size:11px;line-height:1.7;color:#605d5d;">
${params.footerNotice}<br>
</td>
</tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}

const SIGN_OFF: Record<EmailLocale, string> = {
  en: '— JungleVPN 🌴',
  ru: '— JungleVPN 🌴',
};

const SUPPORT_COPY: Record<EmailLocale, { prompt: string; linkLabel: string }> = {
  en: { prompt: 'Questions about your account?', linkLabel: 'Contact support' },
  ru: { prompt: 'Вопросы по аккаунту?', linkLabel: 'Написать в поддержку' },
};

const FOOTER_NOTICE: Record<EmailLocale, string> = {
  en: "You're receiving this because you have a Jungle VPN account.",
  ru: 'Ты получил это письмо, потому что у тебя есть аккаунт Jungle VPN.',
};

// ── Expiry reminder ──────────────────────────────────────────────────────────

export interface ExpiryEmailParams {
  locale: EmailLocale;
  days: number;
  expireDate: string;
  paymentUrl: string;
  supportUrl: string;
}

interface ExpiryEmailCopy {
  subject: (days: number) => string;
  kicker: string;
  headline: (days: number) => string;
  planEndsLabel: string;
  bodyCopy: string;
  ctaLabel: string;
}

const EXPIRY_COPY: Record<EmailLocale, ExpiryEmailCopy> = {
  en: {
    subject: (days) => `Your subscription expires in ${days} day${days === 1 ? '' : 's'}`,
    kicker: 'Subscription status',
    headline: (days) => `Expires in ${days} day${days === 1 ? '' : 's'}`,
    planEndsLabel: 'Plan ends',
    bodyCopy: 'Renew before this date to stay connected without interruption.',
    ctaLabel: 'Renew subscription',
  },
  ru: {
    subject: (days) => `Твоя подписка закончится через ${days} ${days === 1 ? 'день' : 'дня'}`,
    kicker: 'Статус подписки',
    headline: (days) => `Закончится через ${days} ${days === 1 ? 'день' : 'дня'}`,
    planEndsLabel: 'Действует до',
    bodyCopy:
      'Продли подписку до этой даты, чтобы все серверы и устройства остались подключены без перерыва.',
    ctaLabel: 'Продлить подписку',
  },
};

export function buildExpirySubject(locale: EmailLocale, days: number): string {
  return EXPIRY_COPY[locale].subject(days);
}

export function buildExpiryEmailHtml(params: ExpiryEmailParams): string {
  const copy = EXPIRY_COPY[params.locale];

  return renderEmailShell({
    locale: params.locale,
    kicker: copy.kicker,
    headline: copy.headline(params.days),
    detailLabel: copy.planEndsLabel,
    detailValue: params.expireDate,
    bodyCopy: copy.bodyCopy,
    ctaLabel: copy.ctaLabel,
    ctaUrl: params.paymentUrl,
    supportPrompt: SUPPORT_COPY[params.locale].prompt,
    supportLinkLabel: SUPPORT_COPY[params.locale].linkLabel,
    supportUrl: params.supportUrl,
    signOff: SIGN_OFF[params.locale],
    footerNotice: FOOTER_NOTICE[params.locale],
  });
}

// ── Payment issue (autopayment failure) ─────────────────────────────────────

export type PaymentIssueReason = 'no_active_method' | 'insufficient_funds';

export interface PaymentIssueEmailParams {
  locale: EmailLocale;
  reason: PaymentIssueReason;
  expireDate: string;
  paymentUrl: string;
  supportUrl: string;
}

interface PaymentIssueCopy {
  subject: string;
  kicker: string;
  headline: string;
  detailLabel: string;
  bodyCopy: string;
  ctaLabel: string;
}

const PAYMENT_ISSUE_COPY: Record<EmailLocale, Record<PaymentIssueReason, PaymentIssueCopy>> = {
  en: {
    no_active_method: {
      subject: "We couldn't renew your subscription — you dont have any active payment method",
      kicker: 'Payment failed',
      headline: 'No active payment method',
      detailLabel: 'Access ends',
      bodyCopy:
        "You don't have a saved payment method, so we couldn't renew your subscription automatically. Renew your subscription to avoid losing access.",
      ctaLabel: 'Renew subscription',
    },
    insufficient_funds: {
      subject: "We couldn't renew your subscription — insufficient funds",
      kicker: 'Payment failed',
      headline: 'Renewal payment failed',
      detailLabel: 'Access ends',
      bodyCopy:
        "We tried to charge your saved payment method but there weren't enough funds. Update your balance or payment method before the date below to avoid losing access.",
      ctaLabel: 'Update payment method',
    },
  },
  ru: {
    no_active_method: {
      subject: 'Не удалось продлить подписку — нет способа оплаты',
      kicker: 'Ошибка оплаты',
      headline: 'Нет сохранённого способа оплаты',
      detailLabel: 'Доступ закончится',
      bodyCopy:
        'У тебя нет сохранённого способа оплаты, поэтому мы не смогли продлить подписку автоматически. Добавь его до указанной даты, чтобы не потерять доступ.',
      ctaLabel: 'Добавить способ оплаты',
    },
    insufficient_funds: {
      subject: 'Не удалось продлить подписку — недостаточно средств',
      kicker: 'Ошибка оплаты',
      headline: 'Платёж за продление не прошёл',
      detailLabel: 'Доступ закончится',
      bodyCopy:
        'Мы попытались списать средства с сохранённого способа оплаты, но их не хватило. Пополни баланс или обнови способ оплаты до указанной даты, чтобы не потерять доступ.',
      ctaLabel: 'Обновить способ оплаты',
    },
  },
};

export function buildPaymentIssueSubject(locale: EmailLocale, reason: PaymentIssueReason): string {
  return PAYMENT_ISSUE_COPY[locale][reason].subject;
}

// ── Payment success ──────────────────────────────────────────────────────────

export interface PaymentSuccessEmailParams {
  locale: EmailLocale;
  expireDate: string;
  paymentUrl: string;
  supportUrl: string;
}

interface PaymentSuccessCopy {
  subject: string;
  kicker: string;
  headline: string;
  detailLabel: string;
  bodyCopy: string;
  ctaLabel: string;
}

const PAYMENT_SUCCESS_COPY: Record<EmailLocale, PaymentSuccessCopy> = {
  en: {
    subject: 'Payment received — your subscription is active',
    kicker: 'Payment successful',
    headline: 'Subscription is active',
    detailLabel: 'Active until',
    bodyCopy: 'Thanks for your payment! Your subscription is active and ready to use.',
    ctaLabel: 'Manage subscription',
  },
  ru: {
    subject: 'Оплата прошла — подписка активна',
    kicker: 'Оплата прошла успешно',
    headline: 'Подписка активна',
    detailLabel: 'Действует до',
    bodyCopy: 'Спасибо за оплату! Подписка активна и готова к использованию.',
    ctaLabel: 'Управлять подпиской',
  },
};

export function buildPaymentSuccessSubject(locale: EmailLocale): string {
  return PAYMENT_SUCCESS_COPY[locale].subject;
}

export function buildPaymentSuccessEmailHtml(params: PaymentSuccessEmailParams): string {
  const copy = PAYMENT_SUCCESS_COPY[params.locale];

  return renderEmailShell({
    locale: params.locale,
    kicker: copy.kicker,
    headline: copy.headline,
    detailLabel: copy.detailLabel,
    detailValue: params.expireDate,
    bodyCopy: copy.bodyCopy,
    ctaLabel: copy.ctaLabel,
    ctaUrl: params.paymentUrl,
    supportPrompt: SUPPORT_COPY[params.locale].prompt,
    supportLinkLabel: SUPPORT_COPY[params.locale].linkLabel,
    supportUrl: params.supportUrl,
    signOff: SIGN_OFF[params.locale],
    footerNotice: FOOTER_NOTICE[params.locale],
  });
}

export function buildPaymentIssueEmailHtml(params: PaymentIssueEmailParams): string {
  const copy = PAYMENT_ISSUE_COPY[params.locale][params.reason];

  return renderEmailShell({
    locale: params.locale,
    kicker: copy.kicker,
    headline: copy.headline,
    detailLabel: copy.detailLabel,
    detailValue: params.expireDate,
    bodyCopy: copy.bodyCopy,
    ctaLabel: copy.ctaLabel,
    ctaUrl: params.paymentUrl,
    supportPrompt: SUPPORT_COPY[params.locale].prompt,
    supportLinkLabel: SUPPORT_COPY[params.locale].linkLabel,
    supportUrl: params.supportUrl,
    signOff: SIGN_OFF[params.locale],
    footerNotice: FOOTER_NOTICE[params.locale],
  });
}
