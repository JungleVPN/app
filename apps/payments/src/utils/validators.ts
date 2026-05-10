import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentsUtils } from '@payments/utils/utils';

@Injectable()
export class ValidatePaymentRequest {
  constructor(readonly paymentsUtils: PaymentsUtils) {}

  validateAmount(value: string) {
    if (!value) {
      throw new BadRequestException('Amount is required');
    }

    const allowedAmounts = this.paymentsUtils.getAllowedAmounts();

    if (allowedAmounts.length === 0) {
      throw new BadRequestException('ALLOWED_AMOUNTS is not configured');
    }

    const requestedAmount = Number(value);

    if (!allowedAmounts.includes(requestedAmount)) {
      throw new BadRequestException(
        `Invalid amount: ${value}. Allowed values: ${allowedAmounts.join(', ')}`,
      );
    }
  }

  validatePeriod(value: number) {
    const allowedPeriods = this.paymentsUtils.getAllowedPeriods();

    if (allowedPeriods.length === 0) {
      throw new BadRequestException('ALLOWED_PERIODS is not configured');
    }

    if (!allowedPeriods.includes(value)) {
      throw new BadRequestException(
        `Invalid selectedPeriod: ${value}. Allowed values: ${allowedPeriods.join(', ')}`,
      );
    }
  }
}
