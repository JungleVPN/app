import { Module } from '@nestjs/common';
import { PaymentsUtils } from '@payments/utils/utils';
import { CommonController } from './common.controller';
import { CommonService } from './common.service';

@Module({
  controllers: [CommonController],
  providers: [CommonService, PaymentsUtils],
})
export class CommonModule {}
