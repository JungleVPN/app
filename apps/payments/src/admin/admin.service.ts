import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PaddlePayment,
  StripePayment,
  TelegramStarsPayment,
  WhopPayment,
  YookassaPayment,
} from '@workspace/database';
import type { AdminPaymentDto } from '@workspace/types';
import { Brackets, IsNull, Not, Repository } from 'typeorm';
import { RemnaUserResolverService } from '../auth/remna-user-resolver.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(YookassaPayment)
    private readonly yookassaRepo: Repository<YookassaPayment>,
    @InjectRepository(TelegramStarsPayment)
    private readonly starsRepo: Repository<TelegramStarsPayment>,
    @InjectRepository(StripePayment)
    private readonly stripeRepo: Repository<StripePayment>,
    @InjectRepository(PaddlePayment)
    private readonly paddleRepo: Repository<PaddlePayment>,
    @InjectRepository(WhopPayment)
    private readonly whopRepo: Repository<WhopPayment>,
    private readonly remnaUserResolver: RemnaUserResolverService,
  ) {}

  async hasEverPaid(userId: number): Promise<boolean> {
    const settled = { purpose: 'subscription', paidAt: Not(IsNull()) } as const;
    // Whop only sells subscriptions, so its table has no `purpose` to filter on.
    // Paddle's result is left out of the answer, as it was before Whop.
    const [yookassa, stars, stripe, , whop] = await Promise.all([
      this.yookassaRepo.exists({ where: { userId, ...settled } }),
      this.starsRepo.exists({ where: { userId, ...settled } }),
      this.stripeRepo.exists({ where: { userId, ...settled } }),
      this.paddleRepo.exists({ where: { userId, ...settled } }),
      this.whopRepo.exists({ where: { userId, paidAt: Not(IsNull()) } }),
    ]);
    return yookassa || stars || stripe || whop;
  }

  /**
   * Whether a YooKassa or Whop payment is its payer's first paid subscription,
   * for reporting new customers to Google Ads. Only YooKassa and Whop payments
   * count as having paid before; the payment itself is left out, so the answer
   * holds whether or not its webhook has stamped it yet. A payment with no
   * payer yet is never reported as a first.
   */
  async isFirstPayment({
    provider,
    paymentId,
  }: {
    provider: 'yookassa' | 'whop';
    paymentId: string;
  }): Promise<boolean> {
    const payment =
      provider === 'yookassa'
        ? await this.yookassaRepo.findOneBy({ id: paymentId })
        : await this.whopRepo.findOneBy({ id: paymentId });
    const userId = payment?.userId;
    if (userId == null) return false;

    const otherPaid = { userId, paidAt: Not(IsNull()), id: Not(paymentId) };
    const [yookassa, whop] = await Promise.all([
      this.yookassaRepo.exists({ where: { ...otherPaid, purpose: 'subscription' } }),
      this.whopRepo.exists({ where: otherPaid }),
    ]);
    return !yookassa && !whop;
  }

  /**
   * Free-text payment search. An email is not stored on any payment row, so it
   * is resolved to its Remnawave user id first and the search runs on that id.
   */
  async search(q: string): Promise<AdminPaymentDto[]> {
    if (!q.includes('@')) return this.searchAll(q);

    const userId = await this.remnaUserResolver.findByEmail(q);
    return userId === null ? [] : this.searchAll(String(userId));
  }

  private async searchAll(q: string): Promise<AdminPaymentDto[]> {
    const [yookassaResults, starsResults, stripeResults, paddleResults, whopResults] =
      await Promise.all([
        this.searchYookassa(q),
        this.searchStars(q),
        this.searchStripe(q),
        this.searchPaddle(q),
        this.searchWhop(q),
      ]);

    const results = [
      ...yookassaResults,
      ...starsResults,
      ...stripeResults,
      ...paddleResults,
      ...whopResults,
    ];

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
   * Statuses that are not a settled payment, and so never belong in a result.
   *
   * `pending` is the placeholder written before checkout. `completed` is
   * Stripe-only and just as provisional: `checkout.session.completed` fires
   * when the session finishes, but the money lands on a later
   * `invoice.payment_succeeded`, which writes its own `paid` row. Both rows
   * carry the same userId, so leaving `completed` in showed one purchase twice
   * in the caller's history — once with a null paidAt.
   */
  private static readonly UNSETTLED_STATUSES = ['pending', 'completed'];

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
          // CAST is load-bearing: `userId` is int and `telegramId` is bigint,
          // and both branches share one parameter. Postgres resolves an untyped
          // parameter once, from its first use, so an uncast placeholder is
          // pinned to integer by the userId branch — and every modern Telegram
          // id is above 2^31, which then fails the whole query with "value out
          // of range for type integer" before a row is read.
          where.orWhere(`${column} = CAST(:numQ AS bigint)`, { numQ });
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
      .andWhere('p.status NOT IN (:...unsettled)', {
        unsettled: AdminService.UNSETTLED_STATUSES,
      })
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
      .andWhere('p.status NOT IN (:...unsettled)', {
        unsettled: AdminService.UNSETTLED_STATUSES,
      })
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
    const rows = await this.stripeRepo
      .createQueryBuilder('p')
      .where(
        AdminService.matchesQuery(q, AdminService.asNumeric(q), {
          text: ['p.id', 'p.customer'],
          numeric: ['p.userId'],
        }),
      )
      .andWhere('p.status NOT IN (:...unsettled)', {
        unsettled: AdminService.UNSETTLED_STATUSES,
      })
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
        selectedPeriod: 0,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      }),
    );
  }

  private async searchPaddle(q: string): Promise<AdminPaymentDto[]> {
    const rows = await this.paddleRepo
      .createQueryBuilder('p')
      .where(
        AdminService.matchesQuery(q, AdminService.asNumeric(q), {
          text: ['p.id', 'p.customer'],
          numeric: ['p.userId'],
        }),
      )
      .andWhere('p.status NOT IN (:...unsettled)', {
        unsettled: AdminService.UNSETTLED_STATUSES,
      })
      .orderBy('p.createdAt', 'DESC')
      .getMany();

    return rows.map(
      (p): AdminPaymentDto => ({
        paymentId: p.id,
        provider: 'paddle',
        userId: p.userId ?? 0,
        telegramId: null,
        status: p.status,
        purpose: p.purpose,
        amount: p.amount != null ? String(p.amount) : undefined,
        currency: p.currency ?? undefined,
        selectedPeriod: 0,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      }),
    );
  }

  private async searchWhop(q: string): Promise<AdminPaymentDto[]> {
    const rows = await this.whopRepo
      .createQueryBuilder('p')
      .where(
        AdminService.matchesQuery(q, AdminService.asNumeric(q), {
          text: ['p.id', 'p.customer'],
          numeric: ['p.userId'],
        }),
      )
      .andWhere('p.status NOT IN (:...unsettled)', {
        unsettled: AdminService.UNSETTLED_STATUSES,
      })
      .orderBy('p.createdAt', 'DESC')
      .getMany();

    return rows.map(
      (p): AdminPaymentDto => ({
        paymentId: p.id,
        provider: 'whop',
        userId: p.userId ?? 0,
        telegramId: null,
        status: p.status,
        // Whop only sells subscriptions, so its table stores no purpose.
        purpose: 'subscription',
        amount: p.amount != null ? String(p.amount) : undefined,
        currency: p.currency ?? undefined,
        selectedPeriod: 0,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      }),
    );
  }
}
