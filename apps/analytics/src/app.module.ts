import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsEvent, dataSourceOptions, UserAttribution } from '@workspace/database';
import { EventsController } from './events/events.controller';
import { EventsService } from './events/events.service';
import { PostHogService } from './posthog/posthog.service';
import { PostHogExceptionFilter } from './posthog/posthog-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.development', '../../.env'],
      expandVariables: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    TypeOrmModule.forFeature([AnalyticsEvent, UserAttribution]),
  ],
  controllers: [EventsController],
  providers: [
    EventsService,
    PostHogService,
    { provide: APP_FILTER, useClass: PostHogExceptionFilter },
  ],
})
export class AppModule {}
