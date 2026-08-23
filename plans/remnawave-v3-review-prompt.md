# Review prompt: Remnawave panel v3 upgrade

Paste everything below the line into a fresh session in `/Users/rittiev/Projects/backend`.

---

I need an independent, adversarial review of an in-progress upgrade of this monorepo's Remnawave panel integration. Another agent did the work; I want you to find what it got wrong. Do not take its conclusions at face value — verify against the actual contract package and the actual code.

## Reference material

- **Remnawave changelog (authoritative for breaking changes):** https://f.docs.rw/t/topic/354#p-799-h-1
- **Installed contract to inspect directly:** `node_modules/.pnpm/@remnawave+backend-contract@3.4.2/node_modules/@remnawave/backend-contract/build/backend/` — read the `.d.ts` and `.js` files here rather than trusting the changelog, which is incomplete in at least one known respect (see below).
- **Previous version, for diffing behavior:** `npm pack @remnawave/backend-contract@2.8.35` into a scratch dir and compare schemas.

## State of the work

All changes are in the panel-version3 branch. Use `git diff` and `git status` to see the change set. Two files are untracked and are the highest-risk part of the work:

- `packages/database/src/scripts/snapshot-remnawave-user-ids.ts`
- `packages/database/src/migrations/1791000000000-RemnawaveV3NumericUserId.ts`

Reported status: `pnpm test` = 18/18 tasks, 712 tests passing; `tsc --noEmit` = 0 errors across all 12 packages; `pnpm build` clean. **Re-run these yourself** — do not assume.

## What was changed and why

### 1. Contract upgrade

`@remnawave/backend-contract` `2.8.35` → `3.4.2` in `packages/types`. This crosses the 3.0.0 major.

Five imported symbols no longer exist in 3.4.2 and were remapped:

| Removed | Replacement |
|---|---|
| `GetUserByUuidCommand` | `GetUserByIdCommand` |
| `GetUserByTelegramIdCommand` | `GetUsersStreamCommand` with `telegramId` filter |
| `GetUserByEmailCommand` | `GetUsersStreamCommand` with `email` filter |
| `GetAllUsersCommand` | `GetUsersStreamCommand` (cursor-paginated) |
| `GetSubscriptionPageConfigCommand` | `GetSubpageConfigCommand` |

Also `Command.Request` was renamed to `Command.RequestBody` throughout. **This is not in the changelog** — it was found by reading the tarball. Assume there may be other undocumented changes of the same kind and go looking.

### 2. Identifier model: uuid → numeric id

Panel v3 removed the user `uuid` field entirely. Users are keyed by numeric `id`; `shortUuid` survives only as the subscription-link identifier. A `RemnaUserId = number` alias was introduced in `packages/types/src/remnawave/index.ts` and threaded end to end: panel client → services → controllers → auth guards → domain events → database → UI.

Other shape changes to verify: user traffic fields moved into a nested `userTraffic` object; HWID commands moved from `userUuid: string` to `userId: number`.

### 3. Database migration (highest risk — scrutinize hardest)

**11 columns across 10 tables** converted from varchar to int:

`referrals` (`inviterId` + `invitedId`), `yookassa_payments`, `stripe_payments`, `telegram_stars_payments`, `promo_redemptions`, `saved_payment_methods`, `analytics_events`, `user_attribution`, `tolt_referral`, `tolt_transaction`.

The constraint that drove the design: v3 has **no endpoint that resolves a legacy uuid** (`/api/users/resolve` accepts only id / shortUuid / username). The uuid→id pairing exists only in a still-running v2 panel. v2.8.35 user responses carry *both* `uuid` and `id`, which is what makes a snapshot possible.

So the flow is: run `pnpm --filter @workspace/database snapshot:remna-ids` against the **v2 panel before upgrading it** → upgrade panel → `migration:run`. The migration throws if `remnawave_user_id_map` is absent or empty, and quarantines unmappable rows into `*_orphaned_v2` tables rather than deleting them.

### 4. Deliberate behavior changes

- **Panel client** (`apps/remnawave/src/common/remna-panel.client.ts`): previously threw on any response lacking a `{response}` envelope, which would break against v3's `204 No Content` deletes and `202 Accepted` background ops. Now returns `undefined` for those and throws on `>= 400`.
- **Referral deep links**: `decodeReferralCode` now validates a positive integer. Codes minted before the migration encode a uuid and **fail closed by design** (return null) rather than coercing to `NaN` or an unrelated user. Confirm this is actually fail-closed and not exploitable.
- **Internal routes kept**: the remnawave service still exposes `/users/by-telegram-id` and `/users/by-email` to downstream services; they are now backed by the stream endpoint.
- **String-typed wire boundaries** now convert explicitly: Stripe metadata (`Record<string,string>`), Tolt `customer_id`, PostHog `distinctId`, and the `ref` cookie via a new `getReferralUserId()` in `packages/core/src/utils/referral.ts`.
- **Admin free-text search** (`apps/payments/src/admin/admin.service.ts`): `userId` is now an int column, so text comparisons would raise a Postgres type error. The query now guards numerically. Verify every branch.

## What I want from you

Work through these in order and report concrete findings with file:line, not general impressions.

1. **Verify the contract claims.** Read the 3.4.2 `.d.ts` files. Did the agent miss any removed, renamed, or reshaped export that this codebase touches? Diff 2.8.35 against 3.4.2 for every symbol imported in `packages/types/src/remnawave/index.ts`.

2. **Audit the migration for data loss.** This runs once against production payment and referral data. Check: is the quarantine predicate correct for nullable vs non-nullable columns? Does the `CREATE TABLE ... (LIKE ... INCLUDING ALL)` + `DELETE ... RETURNING` + `INSERT` pattern actually preserve every row? Are the dropped constraints and indexes all restored, with the same names and semantics as the entity definitions? Is `down()` genuinely reversible? Are the table names right (note `tolt_referral` and `tolt_transaction` are singular while the rest are plural)?

3. **Check the snapshot script.** Does it page correctly? Is it genuinely idempotent? Does it fail loudly when the panel returns users without a numeric `id`? Could it silently capture a partial snapshot that the migration would then accept as valid?

4. **Hunt for missed conversion sites**, especially where TypeScript could not catch them: untyped axios bodies, `as any` / `as unknown as` casts, `Record<string, unknown>` payloads, event emitter payloads, raw SQL and query builders, and anything crossing a service boundary over HTTP. The agent found one real bug this way (`inviterId` was still a string flowing into a service expecting a number, invisible to `tsc` because the hop went through an untyped axios body). Assume there is at least one more.

5. **Check the numeric-vs-string boundaries** are converted in *both* directions and consistently — Stripe metadata, Tolt, PostHog, the `ref` cookie, route params (`ParseIntPipe` usage), and query strings.

6. **Review test quality, not just test count.** Many fixtures were rewritten from string ids to numeric ones by scripted sweeps. Look for assertions that were weakened, made tautological, or silently changed meaning — particularly in `apps/referrals/src/tests/`, `apps/payments/src/tests/`, and `packages/core/src/pages/getSubscription/useGetSubscriptionPage.test.ts`. Two security-oriented specs were rewritten (`apps/bot/src/utils/url.spec.ts`, the `security-audit.spec.ts` files); confirm their original intent survived.

7. **Known gap to assess:** nothing was tested against a live v3 panel. The stream pagination loop and the 204/202 handling are correct against the contract and a reading of the API, but unverified against a running server. Tell me what could realistically break in production and what the highest-value staging checks would be.

Be specific and skeptical. If something is fine, say so briefly and move on; spend your effort on what is wrong or unverifiable. Flag anything where you think the *approach* is wrong, not just the implementation.
