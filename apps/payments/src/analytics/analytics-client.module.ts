import * as process from 'node:process';
import { Module } from '@nestjs/common';
import axios from 'axios';
import { ANALYTICS_HTTP_CLIENT, AnalyticsClientService } from './analytics-client.service';

@Module({
  providers: [
    {
      provide: ANALYTICS_HTTP_CLIENT,
      useFactory: () =>
        axios.create({
          baseURL: process.env.ANALYTICS_URL ?? 'http://localhost:3007/analytics',
          timeout: 5_000,
          headers: {
            'Content-Type': 'application/json',
            'x-service-secret': process.env.INTER_SERVICE_SECRET,
          },
        }),
    },
    AnalyticsClientService,
  ],
  exports: [AnalyticsClientService],
})
export class AnalyticsClientModule {}
