import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramStarsPayment, YookassaPayment } from '@workspace/database';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([YookassaPayment, TelegramStarsPayment])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
