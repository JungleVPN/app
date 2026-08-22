import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StripePayment, TelegramStarsPayment, YookassaPayment } from '@workspace/database';
import type { AdminPaymentDto } from '@workspace/types';
import { IsNull, Not, Repository } from 'typeorm';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(YookassaPayment)
    private readonly yookassaRepo: Repository<YookassaPayment>,
    @InjectRepository(TelegramStarsPayment)
    private readonly starsRepo: Repository<TelegramStarsPayment>,
    @InjectRepository(StripePayment)
    private readonly stripeRepo: Repository<StripePayment>,
  ) {}

  async hasEverPaid(userId: number): Promise<boolean> {
    const settled = { purpose: 'subscription', paidAt: Not(IsNull()) } as const;
    const [yookassa, stars, stripe] = await Promise.all([
      this.yookassaRepo.exists({ where: { userId, ...settled } }),
      this.starsRepo.exists({ where: { userId, ...settled } }),
      this.stripeRepo.exists({ where: { userId, ...settled } }),
    ]);
    return yookassa || stars || stripe;
  }

  async search(q: string): Promise<AdminPaymentDto[]> {
    const [yookassaResults, starsResults, stripeResults] = await Promise.all([
      this.searchYookassa(q),
      this.searchStars(q),
      this.searchStripe(q),
    ]);

    const results = [...yookassaResults, ...starsResults, ...stripeResults];

    // Sort newest first
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return results;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async searchYookassa(q: string): Promise<AdminPaymentDto[]> {
    const qb = this.yookassaRepo.createQueryBuilder('p');

    // Match on paymentId, and on userId/telegramId only when q is an integer —
    // userId is an int column since panel v3, so a text comparison would error.
    const numericQ = Number(q);
    const isNumeric = q.trim() !== '' && Number.isInteger(numericQ);

    qb.where('p.id = :q', { q }).andWhere('p.status != :pending', {
      pending: 'pending',
    });

    if (isNumeric) {
      qb.orWhere('p.userId = :numQ', { numQ: numericQ });
      qb.orWhere('p.telegramId = :numQ', { numQ: numericQ });
    }

    const rows = await qb.orderBy('p.createdAt', 'DESC').getMany();

    return rows.map(
      (p): AdminPaymentDto => ({
        paymentId: p.id,
        provider: 'yookassa',
        userId: p.userId,
        telegramId: p.telegramId,
        status: p.status,
        purpose: p.purpose,
        amount: p.amount,
        currency: p.currency,
        selectedPeriod: p.selectedPeriod,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      }),
    );
  }

  private async searchStars(q: string): Promise<AdminPaymentDto[]> {
    const numericQ = Number(q);
    const isNumeric = q.trim() !== '' && Number.isInteger(numericQ);

    const qb = this.starsRepo
      .createQueryBuilder('p')
      .where('CAST(p.id AS text) = :q', { q })
      .andWhere('p.status != :pending', { pending: 'pending' });

    if (isNumeric) {
      qb.orWhere('p.userId = :numQ', { numQ: numericQ });
      qb.orWhere('p.telegramId = :numQ', { numQ: numericQ });
    }

    const rows = await qb.orderBy('p.createdAt', 'DESC').getMany();

    return rows.map(
      (p): AdminPaymentDto => ({
        paymentId: p.id,
        provider: 'telegram_stars',
        userId: p.userId,
        telegramId: p.telegramId,
        status: p.status,
        purpose: p.purpose,
        starsAmount: p.starsAmount,
        selectedPeriod: p.selectedPeriod,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      }),
    );
  }

  private async searchStripe(q: string): Promise<AdminPaymentDto[]> {
    const selectedPeriod = Number(process.env.ALLOWED_PERIOD ?? 1);

    const numericQ = Number(q);
    const isNumeric = q.trim() !== '' && Number.isInteger(numericQ);

    const rows = await this.stripeRepo
      .createQueryBuilder('p')
      .where(
        isNumeric
          ? '(p.id = :q OR p.customer = :q OR p.userId = :numQ)'
          : '(p.id = :q OR p.customer = :q)',
        { q, numQ: numericQ },
      )
      // Drop the pre-checkout placeholder rows — only settled records are shown.
      .andWhere('p.status != :pending', { pending: 'pending' })
      .orderBy('p.createdAt', 'DESC')
      .getMany();

    return rows.map(
      (p): AdminPaymentDto => ({
        paymentId: p.id,
        provider: 'stripe',
        userId: p.userId ?? 0,
        telegramId: null,
        status: p.status,
        purpose: p.purpose,
        amount: p.amount != null ? String(p.amount) : undefined,
        currency: p.currency,
        selectedPeriod,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      }),
    );
  }
}
