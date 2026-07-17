import * as process from 'node:process';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeClientService {
  readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_API_KEY || '');
  }

  async retrieveCustomer(customerId: string | null) {
    if (!customerId) return null;
    return await this.stripe.customers.retrieve(customerId);
  }
}
