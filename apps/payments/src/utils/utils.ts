import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsUtils {
  constructor(readonly configService: ConfigService) {}

  getAllowedStarsAmounts() {
    const envValue = this.configService.get<string>('PUBLIC_ALLOWED_AMOUNT_STARS', '');
    return (envValue || '')
      .split(',')
      .map((p) => Number(p.trim()))
      .filter((n) => n > 0);
  }

  getExtraDevicePriceRUB(): string {
    return this.configService.get<string>('PUBLIC_EXTRA_DEVICE_PRICE_RUB', '');
  }

  getExtraDeviceStarsAmount(): number {
    const val = Number(this.configService.get<string>('PUBLIC_EXTRA_DEVICE_PRICE_STARS', '0'));
    return val > 0 ? val : (this.getAllowedStarsAmounts()[0] ?? 0);
  }
}
