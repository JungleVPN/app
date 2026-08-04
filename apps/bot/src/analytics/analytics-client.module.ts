import * as process from 'node:process';
import { Module } from '@nestjs/common';
import { createBackendClient } from '@utils/http-client';
import { ANALYTICS_HTTP_CLIENT, AnalyticsClientService } from './analytics-client.service';

@Module({
  providers: [
    {
      provide: ANALYTICS_HTTP_CLIENT,
      useFactory: () =>
        createBackendClient(
          process.env.PUBLIC_ANALYTICS_URL ?? 'http://localhost:3007/analytics',
        ),
    },
    AnalyticsClientService,
  ],
  exports: [AnalyticsClientService],
})
export class AnalyticsClientModule {}
