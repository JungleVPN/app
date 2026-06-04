import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsUtils {
  constructor(readonly configService: ConfigService) {}

  getAllowedAmounts() {
    const envValue = this.configService.get<string>('ALLOWED_AMOUNTS', '');
    return (envValue || '')
      .split(',')
      .map((p) => p.trim())
      .filter((n) => Number(n) > 0);
  }

  getAllowedStarsAmounts() {
    const envValue = this.configService.get<string>('ALLOWED_STARS_AMOUNTS', '');
    return (envValue || '')
      .split(',')
      .map((p) => Number(p.trim()))
      .filter((n) => n > 0);
  }

  getAllowedPeriods(): number[] {
    const envValue = this.configService.get<string>('ALLOWED_PERIODS', '');
    return (envValue || '')
      .split(',')
      .map((p) => Number(p.trim()))
      .filter((p) => p > 0);
  }

  getExtraDevicePrice(): string {
    return this.configService.get<string>('EXTRA_DEVICE_PRICE', this.getAllowedAmounts()[0] ?? '0');
  }

  getExtraDeviceStarsAmount(): number {
    const val = Number(this.configService.get<string>('EXTRA_DEVICE_STARS_AMOUNT', '0'));
    return val > 0 ? val : (this.getAllowedStarsAmounts()[0] ?? 0);
  }
}
