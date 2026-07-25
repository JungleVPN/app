import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions, UserAttribution } from '@workspace/database';
import { EventsController } from './events/events.controller';
import { EventsService } from './events/events.service';
import { InterServiceGuard } from './guards/inter-service.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.development', '../../.env'],
      expandVariables: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    TypeOrmModule.forFeature([UserAttribution]),
  ],
  controllers: [EventsController],
  providers: [EventsService, InterServiceGuard],
})
export class AppModule {}
