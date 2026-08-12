# Tolt affiliate integration — Stripe + YooKassa

Program: `prg_AndmyvDpekv5Wr8sQUtWUCDF` (JungleVPN's Affiliate Program)

## Decisions (agreed)

| Decision | Choice |
|---|---|
| Tracking mode | **Hybrid** — `tlt.js` for click/lead capture, **all** conversions reported server-side via Tolt API |
| Commission calculation | **Tolt program flows** (60% first / 30% recurring configured in the dashboard) |
| TMA attribution | Deferred — bot deep link `?start=aff_<code>` is **low priority**, last step |
| Currency | Post **EUR minor units**, converted from RUB via **live FX** (CBR primary, open.er-api fallback) |
| Stripe reporting | **Env-gated, OFF at launch** — enabled only once the native Stripe integration is disconnected in Tolt |

## What already exists (verified)

- `tlt.js` is loaded in `apps/web/index.html` and `apps/tma/index.html` with `PUBLIC_TOLT_ID`.
- **`tlt.js` already reads `?aff=`** natively — its param list is `tolt, ref, aff, via, lmref, fpr, tap_s, afmc, f2f-ref, join, ali`. No change needed for the URL param.
- On an affiliate hit it POSTs `/clicks` and sets:
  - `window.tolt_referral` = the partner's **referral code**
  - `window.tolt_data` = `{ click_id, partner_id, program_id, cookie_duration, customer_id }`
  - a `tolt_referral` cookie on the registrable domain, 30 days, `samesite=none; secure`
- `useStripePayment.ts:75` sends `toltReferralId: window.tolt_referral` → `stripe.provider.ts` stamps it into Checkout Session + subscription metadata as `tolt_referral`.
- Tolt's **native Stripe integration is connected** — 3 transactions / 2 customers exist from real test payments.
- YooKassa has **no** Tolt path at all.
- Both providers already compute `isFirstPayment` and both route renewals through the same success handler:
  - `StripeWebhookService.handleInvoiceSuccess` (initial + every renewal invoice)
  - `YookassaService.handlePaymentSucceeded` (initial + autopayment charges)
- `apps/bot` already has a signed `/start` payload chain: `decodeStartPayload` (`ref_`, `adCode_`) → `ctx.session.startPayload` → `withReferral()` appends query params to the TMA URL.

## Gaps this plan closes

1. YooKassa payments produce no affiliate credit at all.
2. Attribution is captured only in the browser at the moment of Stripe checkout — nothing is persisted, so a user who clicks an affiliate link and pays later (or via YooKassa, or from the bot) is lost.
3. Affiliate traffic sent to the Telegram bot carries no attribution.
4. Two attribution mechanisms (Stripe-native + API) would double-count if both stay on.
5. `apps/tma/vite-env.d.ts`, `apps/web/vite-env.d.ts` and `packages/core/vite-env.d.ts` declare only `window.tolt_referral`; `window.tolt_data` is undeclared.

## Architecture

One provider-agnostic service. Adding a third provider (Overpay, etc.) is a single call site — Tolt needs no integration with the processor.

```
                 capture                                report
  web / TMA ──► POST /tolt/referral ──┐        ┌── StripeWebhookService.handleInvoiceSuccess
  bot ?start=aff_<code> ──► ?aff= ────┤        ├── YookassaService.handlePaymentSucceeded
                                      ▼        │
                             tolt_referral ────┴──► ToltService.reportConversion()
                              (DB, per userId)              │
                                                            ├─ POST /v1/customers  (once)
                                                            └─ POST /v1/transactions (every charge)
                                                                     │
                                                            Tolt program flow → commission
```

### New files (`apps/payments/src/tolt/`)

| File | Responsibility |
|---|---|
| `tolt.client.ts` | HTTP client for `https://api.tolt.com` — Bearer auth, timeout, bounded retry. No domain logic. |
| `tolt.service.ts` | `captureReferral()` + `reportConversion()`. Provider-agnostic. |
| `tolt.controller.ts` | `POST /tolt/referral`, behind the existing `ClientUserGuard`. |
| `tolt.module.ts` | Wiring. |
| `tolt.types.ts` | Request/response types for the three endpoints used. |

### New entity — `packages/database/src/entities/tolt-referral.entity.ts`

```
userId          varchar  PK      remnawave uuid
referralCode    varchar          window.tolt_referral
partnerId       varchar          window.tolt_data.partner_id
clickId         varchar  null    window.tolt_data.click_id
toltCustomerId  varchar  null    set at capture by registering a Tolt `lead`
createdAt       timestamptz
updatedAt       timestamptz
```

Write-once on `userId` — the **first** affiliate wins, matching the "attribute only on first payment" rule already in `stripe.provider.ts:40`. Plus a migration in `packages/database/src/migrations/`.

### `ToltService.reportConversion(input)`

```ts
type ReportConversionInput = {
  userId: string;
  provider: 'stripe' | 'yookassa';
  chargeId: string;        // invoice.id | yookassa payment id — idempotency key
  amountMinor: number;     // EUR cents
  periodMonths: number;
  isFirstPayment: boolean;
  email?: string | null;
};
```

Behaviour:
1. Look up `tolt_referral` by `userId`. No row → return (not an affiliate conversion). This is the common path and must be cheap.
2. `toltCustomerId` is normally already set by the capture step. If it is null — lead registration failed earlier — register the customer now and persist the id, so a capture-time outage costs funnel visibility but never a commission.
3. `POST /v1/transactions` with `customer_id`, `amount` (EUR cents), `billing_type: 'subscription'`, `charge_id`, `click_id`, `source: provider`, `interval`, `product_name`.
4. Tolt's program flow derives the 60% / 30% commission. We never call `/v1/commissions`.

### Lead registration (at capture)

`POST /tolt/referral` registers the user with Tolt immediately rather than waiting for money:

`POST /v1/customers` with `partner_id`, `click_id`, `customer_id: userId`, `status: 'lead'`, and `email` — falling back to `userId` when the user has no email, since Tolt's `email` field is really an identifier (`tolt.signup()` accepts "email or user ID").

This gives partners a click → lead → conversion funnel, and moves the failure-prone registration call off the payment path onto one where retrying is free.

Failures are logged and swallowed — affiliate reporting must never block subscription fulfilment or cause a webhook retry that double-extends a subscription. `charge_id` gives Tolt-side idempotency if a webhook is genuinely replayed.

### Currency — live FX

`POST /v1/transactions` has **no currency field** — amounts are interpreted in the program's currency. YooKassa charges RUB, so RUB cents must be converted to EUR cents before posting.

The RUB and EUR price tables are set independently for market reasons, so they are **not** a valid conversion basis. Rates must come from a live source.

Providers evaluated (2026-08-12):

| Source | RUB support | API key | 1 EUR = |
|---|---|---|---|
| **CBR official** `https://www.cbr.ru/scripts/XML_daily.asp` | yes | none | 95.1834 |
| **open.er-api.com** `/v6/latest/EUR` | yes | none | 95.350475 |
| Frankfurter / ECB | **no** — ECB stopped publishing RUB in 2022 | — | — |
| exchangerate.host | yes | **required now** | — |

**Primary: CBR.** Authoritative for RUB, no key, no rate limit, and it is the rate that RUB revenue is accounted at. Response is `windows-1251` XML, but every field we read (`CharCode`, `Nominal`, `VunitRate`) is ASCII, so it parses without an encoding or XML dependency. Note decimal comma: `95,1834`.

**Fallback: open.er-api.com.** Independent infrastructure, JSON, no key. The two agree within 0.18%.

`FxRateService` contract:
- 12h in-memory cache, keyed by date.
- On primary failure → fallback provider. On both failing → last-good rate persisted in the `tolt_referral` migration's sibling `fx_rate_cache` table.
- If no rate can be resolved at all, **skip Tolt reporting and log an error** — never block or fail the payment webhook, and never guess a rate.
- Stripe is already EUR: `invoice.amount_paid` is used directly, no conversion.

> Verify before shipping: the Tolt program's currency must be set to EUR. The MCP renders amounts with `$`, which may be formatting rather than actual USD.

### Bot deep link

Extend the existing chain, no new machinery:

- `apps/bot/src/utils/url.ts` — `decodeStartPayload` gains an `aff_` branch returning `{ type: 'affiliate', value }`. **Unsigned**, unlike `ref_`: a partner code is public by design, and `tlt.js` will validate it against Tolt anyway. Sanitise to `[A-Za-z0-9_-]{1,64}`.
- `packages/shared/user.types` — add `'affiliate'` to `StartPayload`.
- `apps/bot/src/bot/utils/utils.ts` — `withReferral` sets `params.set('aff', value)` for the new type.
- Partner link becomes `https://t.me/<bot>?start=aff_<code>`; the TMA opens with `?aff=<code>`, `tlt.js` fires `/clicks` and populates `window.tolt_referral` + `window.tolt_data` exactly as on the web.

### Frontend capture

- Declare `window.tolt_data` in the three `vite-env.d.ts` files.
- New `packages/core/src/hooks/useToltCapture.ts`: once the authenticated user is known and `window.tolt_data` is present, `POST /tolt/referral` with `{ referralCode, partnerId, clickId }`. Fire-and-forget, once per session.
- `tlt.js` populates these **asynchronously** (after its `/clicks` round-trip), so the hook must wait for the value rather than read it once on mount.
- Keep `toltReferralId` in the Stripe DTO as a fallback capture path — harmless, and it covers a user who pays before the capture call lands.

## Manual dashboard steps

Blocked on the Tolt plan upgrade (trial ended), so **Stripe reporting ships disabled**:

1. Configure the program flow: **60% first payment, 30% recurring, recurring duration = lifetime**.
2. Confirm program currency = **EUR**.
3. Create a `TOLT_API_KEY` (Settings → Integrations) and add it to the payments service env.
4. **Later, on upgrade:** disconnect the native Stripe integration in Tolt, *then* flip `TOLT_REPORT_STRIPE=true`. Doing either alone is wrong — both off means Stripe affiliates earn nothing; both on means every Stripe conversion is counted twice.

`TOLT_REPORT_STRIPE` defaults to `false`. YooKassa reporting is unconditional — Tolt has no native YooKassa path, so there is nothing to double-count.

## Implementation order (TDD, one step per review cycle)

| # | Step | Files |
|---|---|---|
| 1 | `tolt_referral` + `fx_rate_cache` entities + migration | `packages/database/` |
| 2 | `FxRateService` — CBR primary, open.er-api fallback, cache, last-good | `apps/payments/src/tolt/` |
| 3 | `ToltClient` — auth header, timeout, bounded retry, error shape | `apps/payments/src/tolt/` |
| 4 | `ToltService.reportConversion` — the domain logic | `apps/payments/src/tolt/` |
| 5 | `POST /tolt/referral` capture endpoint + module wiring | `apps/payments/src/tolt/` |
| 6 | Hook into `YookassaService.handlePaymentSucceeded` | `apps/payments/src/providers/yookassa/` |
| 7 | Hook into `StripeWebhookService.handleInvoiceSuccess`, env-gated | `apps/payments/src/providers/stripe/` |
| 8 | Frontend capture hook + `vite-env.d.ts` declarations | `packages/core/`, `apps/web`, `apps/tma` |
| 9 | *(low priority)* Bot `aff_` deep-link payload | `apps/bot/` |
| 10 | Mutation run over `apps/payments/src/tolt/`, kill survivors | — |

Each step is test-first and left green before the next begins. Stop for review after every step.

### Transaction field constraints

- **`billing_type` is always `subscription`.** Extra-device purchases earn no commission and are never reported, so `one_time` is unreachable and not representable in the input type. The value matters beyond bookkeeping: it is how Tolt decides that a customer's later charges are renewals, and therefore which of the 60% / 30% rates applies.
- **`interval` cannot express 3- and 6-month plans.** Tolt accepts only `month` or `year`. Sent only where exactly correct (1 → `month`, 12 → `year`) and omitted for 3 and 6, since the field is optional and a wrong interval would make Tolt project renewals that never happen. Revenue and commission are unaffected either way — the amount carries the real value.

## Open items to confirm during build

- **`extra_device` purchases**: excluded from commission in this plan (the stated rules are per-plan). Say if affiliates should earn on them.
- **Refunds/chargebacks**: `POST /v1/transactions/{id}/refund` exists. Not in scope here; without it a refunded YooKassa payment leaves a live commission. Worth a follow-up slice.
- **Promo-discounted payments**: rules say commission is on "the amount actually paid", so we post the actual charged amount, not list price. For YooKassa this means a discounted RUB amount may not map cleanly through `amountToMonths` — the service must fall back to the record's stored `selectedPeriod` rather than throwing.
