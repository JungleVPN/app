import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PaddlePayment,
  StripePayment,
  TelegramStarsPayment,
  YookassaPayment,
} from '@workspace/database';
import { InterServiceGuard } from '../guards/inter-service.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([YookassaPayment, TelegramStarsPayment, StripePayment, PaddlePayment]),
  ],
  controllers: [AdminController],
  providers: [AdminService, InterServiceGuard],
  exports: [AdminService],
})
export class AdminModule {}
