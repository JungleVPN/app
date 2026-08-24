import { I18nFlavor } from '@grammyjs/i18n';
import { PaymentPeriod, PaymentProvider } from '@shared/payments';
import { StartPayload, UserDevice } from '@shared/user.types';
import { UserDto } from '@workspace/types';
import { Context, SessionFlavor as GrammySessionFlavor } from 'grammy';

export type BotContext = Context & SessionFlavor & I18nFlavor;
export type ErrorMessage = string;

export interface ClientApp {
  name: 'v2raytun' | 'happ';
  url: string;
  appUrl: string;
  platforms?: UserDevice[];
}

export interface SessionData {
  userId: number | undefined;
  lang: string | undefined;
  paymentUrl: string | undefined;
  paymentId: string | undefined;
  clientApp: Array<ClientApp> | undefined;
  redirectUrl?: string;
  subscriptionUrl?: string;
  selectedDevice?: UserDevice;
  selectedProvider?: PaymentProvider;
  selectedPeriod?: PaymentPeriod;
  billingPortalUrl?: string;
  hasActiveSubscription?: boolean;
  activeSavedMethodId?: string;
  startPayload?: StartPayload;
  metadata?: {
    messageId?: number;
  };
  user: Partial<UserDto>;
}

export type SessionFlavor = GrammySessionFlavor<SessionData>;

export const initialSession = (): SessionData => {
  return {
    userId: undefined,
    lang: undefined,
    paymentUrl: undefined,
    paymentId: undefined,
    selectedDevice: undefined,
    selectedPeriod: undefined,
    subscriptionUrl: undefined,
    clientApp: [],
    metadata: {
      messageId: undefined,
    },
    billingPortalUrl: undefined,
    hasActiveSubscription: false,
    activeSavedMethodId: undefined,
    startPayload: undefined,
    user: {
      id: undefined,
      telegramId: undefined,
      username: undefined,
      expireAt: undefined,
      subscriptionUrl: undefined,
    },
  };
};
