import path from 'node:path';
import * as process from 'node:process';
import { config } from 'dotenv';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { Broadcast } from './entities/broadcast.entity';
import { BroadcastMessage } from './entities/broadcast-message.entity';
import { FxRate } from './entities/fx-rate.entity';
import { Promo } from './entities/promo.entity';
import { PromoRedemption } from './entities/promo-redemption.entity';
import { Referral } from './entities/referral.entity';
import { SavedPaymentMethod } from './entities/saved-payment-method.entity';
import { StripePayment } from './entities/stripe-payment.entity';
import { TelegramStarsPayment } from './entities/telegram-stars-payment.entity';
import { ToltReferral } from './entities/tolt-referral.entity';
import { ToltTransaction } from './entities/tolt-transaction.entity';
import { UserAttribution } from './entities/user-attribution.entity';
import { YookassaPayment } from './entities/yookassa-payment.entity';

config({ path: path.resolve(process.cwd(), '.env.development') });
config({ path: path.resolve(process.cwd(), '../../.env.development') });
config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '../../.env') });

const migrationsDir = path.join(__dirname, 'migrations', '*.js');

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  host: process.env.POSTGRES_HOST || 'localhost',
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [
    AnalyticsEvent,
    Promo,
    PromoRedemption,
    Referral,
    SavedPaymentMethod,
    StripePayment,
    TelegramStarsPayment,
    YookassaPayment,
    Broadcast,
    BroadcastMessage,
    UserAttribution,
    ToltReferral,
    ToltTransaction,
    FxRate,
  ],
  migrations: [migrationsDir],
  migrationsRun: false,
  synchronize: false,
  logging: false,
};

// Default export is what TypeORM CLI expects.
// It is NOT initialized eagerly — call .initialize() yourself when needed.
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
