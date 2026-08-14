# Affiliate programme — Tolt integration

## Goal

**Pay affiliates correctly for every sale, regardless of how the customer paid.**

JungleVPN sells through Stripe (EUR, international) and YooKassa (RUB, Russia), with more providers likely. Tolt is the affiliate platform: partners, links, commission rules and payouts live there.

Tolt integrates natively with Stripe and **not at all** with YooKassa — so out of the box, every rouble of Russian revenue earns affiliates nothing. The goal was one attribution and reporting path that works for both providers, and for any provider added later, without Tolt needing to know the processor exists.

Three constraints shaped everything:

1. **Affiliate reporting must never affect a payment.** It runs inside provider webhook handlers. A throw there triggers redelivery and risks double-fulfilment. A missed commission is recoverable; a double-granted subscription is not.
2. **Attribution must outlive the browser.** The click happens in a browser; the payment may settle days later, on another device, or as a renewal with no browser at all.
3. **Commission rules stay in Tolt.** Rates are a business setting, not a deploy.

## Commission rules

| Parameter | Value |
|---|---|
| First payment | 60% of the amount actually paid |
| Renewals | 30%, indefinitely, until the subscription is cancelled |

Both are configured in the **Tolt dashboard** — the API cannot set or even read them. We report revenue; Tolt derives the commission.

## Architecture

One provider-agnostic service. Adding a payment provider is a single call site.

```
LANDING          ?aff=zaira
                     │
                     ▼
              useToltLanding ──► POST /tolt/click (public)
                     │                └─► Tolt POST /v1/clicks ──► partner_id, click_id
                     ▼
        cookies: tolt_referral + tolt_data          (30 days, overwritten each landing)

LOGIN                │
                     ▼
              useToltCapture ──► POST /tolt/referral (authenticated)
                     │
                     ▼
              tolt_referral row                     (overwritable until conversion)

PAYMENT      Stripe webhook ─┐
             YooKassa webhook ┴──► ToltService.reportConversion()
                                        │
                                        ├─ first payment: POST /v1/customers, freeze row
                                        └─ every payment: POST /v1/transactions
                                                              │
                                                     Tolt flow → commission
```

### Components

| File | Responsibility |
|---|---|
| `packages/core/src/utils/tolt.ts` | Read/write attribution cookies in the browser |
| `packages/core/src/hooks/use-tolt-landing.ts` | Record the click on an `?aff=` landing |
| `packages/core/src/hooks/use-tolt-capture.ts` | Send stored attribution once the user is known |
| `apps/payments/src/tolt/tolt.client.ts` | Tolt REST transport — auth, timeouts, retries |
| `apps/payments/src/tolt/tolt.service.ts` | Attribution and reporting logic |
| `apps/payments/src/tolt/fx-rate.service.ts` | RUB → EUR conversion |
| `packages/database/.../tolt-referral.entity.ts` | Persisted attribution, one row per user |

## Attribution logic

**Last click wins — until the user pays. Then it is frozen for life.**

| Stage | Rule |
|---|---|
| Landing | A new `?aff=` always replaces the stored partner |
| Repeat landing, same code | Skipped — no duplicate click recorded |
| Login | Attribution copied to the `tolt_referral` row, overwriting any earlier one |
| First payment | Tolt customer created under that partner; `convertedAt` stamped |
| After conversion | Row immutable — renewals always credit the partner who made the sale |

### Why it works this way

**A Tolt customer's `partner_id` is fixed at creation and cannot be changed.** `PUT /v1/customers/{id}` does not accept it. So creating a customer at signup would permanently award the sale to whoever referred the user first, even if that link had expired long before they bought. Deferring creation until payment means the partner who actually converted them is the one recorded — and there is never anything to reassign.

**Creation and freezing are one atomic update.** The instant the Tolt customer exists its partner is fixed; if the local row stayed overwritable for even one more capture, our database and Tolt would disagree with no way to reconcile.

**`tlt.js` was removed.** Tolt's script is first-touch: while its cookie is alive it *never reads a newer `?aff=`* and fires no click, so a partner who brought a customer back got nothing. We now own the cookie (same names and JSON encoding, so nothing else had to change) and overwrite on every landing.

## Money logic

**Amounts are reported as actually charged**, so promotional discounts flow through to the commission.

`POST /v1/transactions` has **no currency field** — amounts are read in the programme's currency (EUR, verified). YooKassa charges RUB, so conversion is required.

RUB and EUR price tables are set independently for market reasons — `PRICE_RUB_MONTH_1` is 200 ₽ (≈ €2.10) against `PRICE_EUR_MONTH_1` of €6 — so the tables are **not** a valid conversion basis. Rates come from a live source:

| Source | Role |
|---|---|
| `cbr-xml-daily.ru/daily_json.js` | Primary — CBR data as UTF-8 JSON |
| `cbr.ru/scripts/XML_daily.asp` | Fallback — official, independent infrastructure |
| Persisted `fx_rate` row | Last resort when both are unreachable |

A stale rate is used deliberately and logged with its age: FX moves fractions of a percent per day, while an unresolvable rate means a partner is not paid. If no rate exists at all, reporting is skipped rather than guessed.

### Transaction fields

- `billing_type` is always `subscription` — this is how Tolt knows later charges are renewals, and therefore which rate applies.
- `interval` is sent only where exactly true (1 → `month`, 12 → `year`) and **omitted for 3- and 6-month plans**, which Tolt's two-value vocabulary cannot express. Revenue and commission are unaffected.
- `extra_device` purchases are never reported — they earn no commission.

## Failure behaviour

Every path is best-effort and cannot break a payment.

| Failure | Result |
|---|---|
| Tolt unreachable at landing | No click, no cookie; the next landing retries |
| Capture request fails | Retried on the next page load — nothing is remembered client-side |
| Tolt rejects a transaction | Logged and swallowed; the next payment reports again |
| No FX rate | Reporting skipped; the payment is unaffected |
| Any exception in `reportConversion` | Caught at the top level — webhooks never see it |

**Retries are deliberately timid.** Tolt exposes no idempotency key, so a request is replayed only when it provably never arrived: `429`, `502/503/504`, and connection-level errors. A `500` or a timeout is *not* retried — the write may already have landed, and a duplicate transaction pays a partner twice.

## Fixed along the way

**YooKassa double-fulfilment.** The webhook's replay guard had been removed because it broke renewals: `AutopaymentService` wrote rows with `status: 'succeeded'` **and** `paidAt` already stamped, so the guard mistook every renewal for a duplicate and never extended the subscription. The root cause was pre-stamping fulfilment before it happened. Autopayment now writes `paidAt: null`, and the guard keys solely on `paidAt` — the stamp this handler writes once the work is done. Four tests pin all four combinations.

## Deployment prerequisites

1. Run the migrations — `tolt_referral`, `fx_rate`, then `convertedAt` + `email`.
2. Set `TOLT_API_KEY` (`env_file: .env` covers all deployed services).
3. Configure the **60% / 30% flow** in the Tolt dashboard, recurring duration = lifetime.
4. ⚠️ **Disconnect Tolt's native Stripe integration before this reaches production.** Both reporters active means every Stripe partner is credited twice. YooKassa is unaffected — nothing else reports it.

## Verified against the live API

| Fact | Consequence |
|---|---|
| `partner_id` is immutable on a customer | Customer creation deferred to first payment |
| Identifiers are unique **per programme**, not per partner | One person cannot be a lead for two partners |
| `tlt.js` reuses its cookie and skips the URL param | Replaced with our own last-click cookie |
| Programme currency is `EUR` | RUB conversion is required and correct |
| Commission rules absent from the API | Rates configured in the dashboard only |
| `POST /v1/clicks` resolves `param`+`value` → partner | Landing flow needs no programme id |

## Open items

- **Commission rates are producing 30% on every transaction**, including first payments. Either the dashboard flow lacks a first-payment tier, or `billing_type: 'subscription'` classifies everything as recurring. Needs checking before launch.
- **`POST /tolt/click` is public and unthrottled.** Necessary — the visitor has no account — and the same exposure `tlt.js` had, but worth rate-limiting.
- **Legacy `tlt.js` cookies** hold UUID click ids from a different endpoint than the REST API's `clk_`-prefixed ones. Passing one to `createTransaction` may be rejected and silently cost a commission. Self-heals on the next affiliate landing; a format guard would close it fully.
- **Refunds are not handled.** `POST /v1/transactions/{id}/refund` exists; without it a refunded payment leaves a live commission.
- **Telegram-only users have no email.** `email` is now non-nullable on the entity, but `AuthenticatedEmail` is populated only by the Supabase JWT path.
- **Bot deep-link attribution** (`?start=aff_<code>`) is not implemented — affiliate traffic sent straight to the bot carries no attribution.
- `PUBLIC_TOLT_ID` is now unused and can be removed from the env files.
