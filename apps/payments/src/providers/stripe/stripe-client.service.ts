import * as process from 'node:process';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeClientService {
  readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_API_KEY || '');
  }

  async findCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
    const { data } = await this.stripe.customers.list({ email, limit: 1 });
    return data[0] ?? null;
  }

  async retrieveCustomer(customerId: string | null) {
    if (!customerId) return null;
    return await this.stripe.customers.retrieve(customerId);
  }
}
