import { Module } from '@nestjs/common';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';
import { PaddleClientService } from './paddle-client.service';
import { PaddleController } from './paddle.controller';
import { PaddleProvider } from './paddle.provider';

@Module({
  controllers: [PaddleController],
  exports: [PaddleProvider],
  providers: [PaddleClientService, PaddleProvider, PublicCheckoutRateLimitGuard],
})
export class PaddleModule {}
