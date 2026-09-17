import { Module } from '@nestjs/common';
import { PaddleModule } from '@payments/providers/paddle/paddle.module';
import { CommonController } from './common.controller';
import { CommonService } from './common.service';

@Module({
  imports: [PaddleModule],
  controllers: [CommonController],
  providers: [CommonService],
})
export class CommonModule {}
