import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StripePayment, TelegramStarsPayment, YookassaPayment } from '@workspace/database';
import type { AdminPaymentDto } from '@workspace/types';
import { Brackets, IsNull, Not, Repository } from 'typeorm';

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

  /**
   * Whether `q` may be compared against the int columns (`userId`, `telegramId`).
   *
   * `Number('')` is 0, so a blank query would otherwise search for user 0.
   */
  private static asNumeric(q: string): number | null {
    if (q.trim() === '') return null;
    const parsed = Number(q);
    return Number.isInteger(parsed) ? parsed : null;
  }

  /**
   * The OR group of a free-text search, wrapped in Brackets.
   *
   * Brackets is load-bearing: TypeORM concatenates conditions with no
   * parentheses, and AND binds tighter than OR, so an unbracketed group lets
   * every OR alternative escape the `status != 'pending'` conjunct the callers
   * add next. That is how pre-checkout placeholder rows reach a user's own
   * transaction list via GET /payments/my-transactions.
   */
  private static matchesQuery(
    q: string,
    numQ: number | null,
    columns: { text: string[]; numeric: string[] },
  ): Brackets {
    return new Brackets((where) => {
      columns.text.forEach((column, i) => {
        if (i === 0) {
          where.where(`${column} = :q`, { q });
        } else {
          where.orWhere(`${column} = :q`, { q });
        }
      });
      if (numQ !== null) {
        for (const column of columns.numeric) {
          where.orWhere(`${column} = :numQ`, { numQ });
        }
      }
    });
  }

  private async searchYookassa(q: string): Promise<AdminPaymentDto[]> {
    // userId is an int column since panel v3, so it is only compared when the
    // query is an integer — a text comparison is a Postgres type error.
    const rows = await this.yookassaRepo
      .createQueryBuilder('p')
      .where(
        AdminService.matchesQuery(q, AdminService.asNumeric(q), {
          text: ['p.id'],
          numeric: ['p.userId', 'p.telegramId'],
        }),
      )
      // Drop the pre-checkout placeholder rows — only settled records are shown.
      .andWhere('p.status != :pending', { pending: 'pending' })
      .orderBy('p.createdAt', 'DESC')
      .getMany();

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
    const rows = await this.starsRepo
      .createQueryBuilder('p')
      .where(
        AdminService.matchesQuery(q, AdminService.asNumeric(q), {
          text: ['CAST(p.id AS text)'],
          numeric: ['p.userId', 'p.telegramId'],
        }),
      )
      .andWhere('p.status != :pending', { pending: 'pending' })
      .orderBy('p.createdAt', 'DESC')
      .getMany();

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

    const rows = await this.stripeRepo
      .createQueryBuilder('p')
      .where(
        AdminService.matchesQuery(q, AdminService.asNumeric(q), {
          text: ['p.id', 'p.customer'],
          numeric: ['p.userId'],
        }),
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
