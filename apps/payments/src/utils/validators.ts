import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentsUtils } from '@payments/utils/utils';

@Injectable()
export class ValidatePaymentRequest {
  constructor(readonly paymentsUtils: PaymentsUtils) {}

  validateAmount(value: string) {
    if (!value) {
      throw new BadRequestException('Amount is required');
    }

    const allowedAmount = this.paymentsUtils.getAllowedAmounts();

    if (allowedAmount.length === 0) {
      throw new BadRequestException('YOOKASSA_AMOUNT is not configured');
    }

    if (!allowedAmount.includes(value)) {
      throw new BadRequestException(
        `Invalid amount: ${value}. Allowed values: ${allowedAmount.join(', ')}`,
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
