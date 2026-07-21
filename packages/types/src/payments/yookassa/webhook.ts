import type { Payments } from './payment';

/** События для вебхуков */
export enum WebhookEventEnum {
  /** Платёж ожидает подтверждения */
  'payment.waiting_for_capture' = 'payment.waiting_for_capture',
  /** Платёж успешно завершён */
  'payment.succeeded' = 'payment.succeeded',
  /** Платёж отменён */
  'payment.canceled' = 'payment.canceled',
  'payment.method_saved' = 'payment.method_saved',
  'payment.autopayment_failed' = 'payment.autopayment_failed',
  'payment.autopayment_exhausted' = 'payment.autopayment_exhausted',
  'payment.insufficient_funds' = 'payment.insufficient_funds',
  'payment.general_decline' = 'payment.general_decline',
  'payment.no_active_method' = 'payment.no_active_method',
  /** Возврат успешно завершён */
  'refund.succeeded' = 'refund.succeeded',
  /** Выплата успешно завершена */
  'payout.succeeded' = 'payout.succeeded',
  /** Выплата отменена */
  'payout.canceled' = 'payout.canceled',
  /** Сделка закрыта */
  'deal.closed' = 'deal.closed',
}

export type WebhookEvent = `${WebhookEventEnum}`;

/** Вебхук для получения уведомлений о событиях */
export interface IWebhook {
  /** Идентификатор вебхука */
  id: string;
  /** Событие, о котором уведомляет вебхук */
  event: WebhookEvent;
  /** URL для уведомлений */
  url: string;
}

/**
 * Запрос на создание вебхука
 * @see https://yookassa.ru/developers/api#create_webhook
 */
export interface CreateWebhookRequest {
  /** Событие, о котором нужно уведомлять */
  event: WebhookEvent;
  /** URL, на который ЮKassa будет отправлять уведомления */
  url: string;
}

/** Список вебхуков */
export interface WebhookList {
  type: 'list';
  items: IWebhook[];
}

/**
 * Полезная нагрузка webhook-уведомления от ЮKassa.
 *
 * Формат: `{ type: 'notification', event, object }`, где `object` — зависящий
 * от `event` ресурс. Для `payment.*` событий это объект платежа (`Payments.IPayment`).
 * @see https://yookassa.ru/developers/using-api/webhooks
 */
export interface IWebhookNotification<
  TEvent extends WebhookEvent = WebhookEvent,
  TObject = unknown,
> {
  type: 'notification';
  event: TEvent;
  object: TObject;
}

/** Webhook-уведомление о событиях платежа (payment.succeeded / canceled / waiting_for_capture). */
export type PaymentWebhookNotification = IWebhookNotification<WebhookEvent, Payments.IPayment>;
