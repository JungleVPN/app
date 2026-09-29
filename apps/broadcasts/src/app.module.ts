import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Broadcast, BroadcastMessage, dataSourceOptions } from '@workspace/database';
import { BroadcastController } from './main/broadcast.controller';
import { BroadcastService } from './main/broadcast.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '../../.env.public', '../../.env.payments', '../../.env.secrets'],
      expandVariables: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    TypeOrmModule.forFeature([Broadcast, BroadcastMessage]),
  ],
  controllers: [BroadcastController],
  providers: [BroadcastService],
})
export class AppModule {}
