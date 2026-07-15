export type WebHookEvent =
  | 'user.expired'
  | 'user.expiration'
  | 'user.not_connected'
  | 'payment.succeeded'
  | 'payment.canceled'
  | 'payment.waiting_for_capture';
