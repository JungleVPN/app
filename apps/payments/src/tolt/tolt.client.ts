import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  ToltCreateCustomerInput,
  ToltCreateTransactionInput,
  ToltCustomer,
  ToltEnvelope,
  ToltTransaction,
} from './tolt.types';

export const TOLT_CONFIG = Symbol('TOLT_CONFIG');

export type ToltClientConfig = {
  apiKey: string;
  baseUrl: string;
};

const TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 300;

/**
 * Statuses worth a retry.
 *
 * Deliberately excludes 500: an application-level error may have committed the
 * write before failing, and re-posting a transaction would credit a partner
 * twice. Gateway failures (502/503/504) and rate limits (429) are safe — the
 * request never reached the handler, or was rejected before doing work.
 */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

/** Connection-level failures that prove the request never reached the server. */
const RETRYABLE_CAUSE_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET']);

export class ToltApiError extends Error {
  readonly name = 'ToltApiError';

  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Transport for the Tolt REST API. Auth, timeouts, retries and envelope
 * unwrapping only — no domain decisions, which live in `ToltService`.
 *
 * Retries are conservative because these calls create money-bearing records and
 * Tolt exposes no idempotency key: a request is only replayed when it provably
 * never reached the server. An ambiguous failure (timeout, 500) surfaces to the
 * caller, which treats reporting as best-effort rather than risking a double
 * commission.
 */
@Injectable()
export class ToltClient {
  private readonly logger = new Logger(ToltClient.name);
  private readonly baseUrl: string;

  constructor(
    @Inject(TOLT_CONFIG) private readonly config: ToltClientConfig,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly sleep: (ms: number) => Promise<void> = delay,
  ) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
  }

  /** Registers a customer against a partner. Also used to record a lead. */
  createCustomer(input: ToltCreateCustomerInput): Promise<ToltCustomer> {
    return this.post<ToltCustomer>('/v1/customers', input);
  }

  /**
   * Records revenue. Tolt's program flow derives the commission from this —
   * we never post commissions directly.
   */
  createTransaction(input: ToltCreateTransactionInput): Promise<ToltTransaction> {
    return this.post<ToltTransaction>('/v1/transactions', input);
  }

  private async post<T>(path: string, body: object): Promise<T> {
    let lastError: ToltApiError | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.attempt<T>(path, body);
      } catch (error) {
        lastError = error as ToltApiError;
        if (!lastError.retryable || attempt === MAX_ATTEMPTS) break;

        // Exponential backoff with jitter, so concurrent webhooks don't
        // synchronise their retries into a second burst against a struggling API.
        const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1);
        await this.sleep(backoff + Math.floor(Math.random() * BASE_BACKOFF_MS));
        this.logger.warn(
          `Tolt ${path} attempt ${attempt} failed (${lastError.message}) — retrying`,
        );
      }
    }

    throw lastError ?? new ToltApiError(`Tolt ${path} failed`, null, false);
  }

  private async attempt<T>(path: string, body: object): Promise<T> {
    const response = await this.send(path, body);
    const payload = await this.readEnvelope<T>(response, path);

    if (!response.ok) {
      const message = this.messageFrom(payload) ?? response.statusText;
      throw new ToltApiError(
        `Tolt ${path} responded ${response.status}: ${message}`,
        response.status,
        RETRYABLE_STATUSES.has(response.status),
      );
    }

    if (payload?.success === false) {
      throw new ToltApiError(
        `Tolt ${path} reported failure: ${this.messageFrom(payload) ?? 'no message'}`,
        response.status,
        false,
      );
    }

    const record = payload?.data?.[0];
    if (!record) {
      throw new ToltApiError(`Tolt ${path} returned no record`, response.status, false);
    }

    return record;
  }

  private async send(path: string, body: object): Promise<Response> {
    try {
      return await this.fetchFn(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        // Undefined values are dropped by JSON.stringify, so optional fields are
        // omitted rather than sent as nulls Tolt would persist.
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw this.toTransportError(error, path);
    }
  }

  /**
   * Tolt serves HTML error pages with a 200 often enough that the body cannot be
   * trusted to be JSON. A parse failure on an otherwise-OK response is an error,
   * not an empty envelope.
   */
  private async readEnvelope<T>(
    response: Response,
    path: string,
  ): Promise<(ToltEnvelope<T> & { message?: string }) | null> {
    const text = await response.text().catch(() => '');
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      if (response.ok) {
        throw new ToltApiError(`Tolt ${path} returned a non-JSON body`, response.status, false);
      }
      return null;
    }
  }

  private messageFrom(payload: { message?: string } | null): string | null {
    return payload?.message ?? null;
  }

  /** Maps a fetch rejection onto a ToltApiError, deciding retryability. */
  private toTransportError(error: unknown, path: string): ToltApiError {
    const err = error as Error & { cause?: { code?: string } };
    const code = err?.cause?.code;

    // A timeout is ambiguous: the request may have been fully processed and only
    // the response lost. Never replayed — a duplicate transaction is worse than
    // a missing one, which the next payment will re-report anyway.
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    const retryable = !isTimeout && !!code && RETRYABLE_CAUSE_CODES.has(code);

    return new ToltApiError(`Tolt ${path} transport error: ${err?.message}`, null, retryable);
  }
}
