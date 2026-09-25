import { Module } from '@nestjs/common';
import { PlanModule } from '@payments/catalog/plan.module';
import { PaddleModule } from '@payments/providers/paddle/paddle.module';
import { CommonController } from './common.controller';
import { CommonService } from './common.service';

@Module({
  imports: [PaddleModule, PlanModule],
  controllers: [CommonController],
  providers: [CommonService],
})
export class CommonModule {}
