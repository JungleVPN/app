/**
 * Pre-upgrade snapshot of the Remnawave uuid -> id mapping.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RUN THIS BEFORE UPGRADING THE PANEL TO v3. It cannot be run afterwards.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Panel v3 removed the user `uuid` field entirely; users are keyed by a numeric
 * `id`. Our own tables persist the v2 uuid as a foreign key in nine places, and
 * v3 exposes no endpoint that resolves a legacy uuid — `/api/users/resolve`
 * accepts only id / shortUuid / username. The moment the panel is upgraded, the
 * correspondence between the two is unrecoverable through the API.
 *
 * This script reads every user from the still-running v2 panel and writes the
 * pairing into `remnawave_user_id_map`, which the accompanying migration then
 * joins against to backfill each userId column.
 *
 * Usage:
 *   REMNAWAVE_PANEL_URL=https://panel.example.com \
 *   REMNAWAVE_API_TOKEN=... \
 *   DATABASE_URL=postgres://... \
 *   pnpm --filter @workspace/database snapshot:remna-ids
 *
 * The script is idempotent: re-running it refreshes the same rows.
 */

import process from 'node:process';
import { Client } from 'pg';

const PAGE_SIZE = 500;

type V2User = {
  uuid: string;
  id?: number | null;
  shortUuid?: string | null;
  username?: string | null;
  telegramId?: number | string | null;
  email?: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function fetchPage(
  baseUrl: string,
  token: string,
  start: number,
): Promise<{ users: V2User[]; total: number }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/users?start=${start}&size=${PAGE_SIZE}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Panel returned ${res.status} ${res.statusText} for ${url}`);
  }

  const body = (await res.json()) as { response?: { users?: V2User[]; total?: number } };
  const users = body.response?.users ?? [];
  const total = body.response?.total ?? users.length;

  return { users, total };
}

async function main(): Promise<void> {
  const baseUrl = requireEnv('REMNAWAVE_PANEL_URL');
  const token = requireEnv('REMNAWAVE_API_TOKEN');
  const databaseUrl = requireEnv('DATABASE_URL');

  const db = new Client({ connectionString: databaseUrl });
  await db.connect();

  await db.query(`
    CREATE TABLE IF NOT EXISTS "remnawave_user_id_map" (
      "legacyUuid" uuid PRIMARY KEY,
      "userId" integer,
      "shortUuid" varchar,
      "username" varchar,
      "telegramId" bigint,
      "email" varchar,
      "capturedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.query(
    `CREATE INDEX IF NOT EXISTS "IDX_remnawave_user_id_map_userId"
       ON "remnawave_user_id_map" ("userId")`,
  );

  let start = 0;
  let captured = 0;
  let missingId = 0;

  for (;;) {
    const { users, total } = await fetchPage(baseUrl, token, start);
    if (users.length === 0) break;

    for (const user of users) {
      if (!user.uuid) continue;
      if (user.id == null) missingId++;

      await db.query(
        `INSERT INTO "remnawave_user_id_map"
           ("legacyUuid", "userId", "shortUuid", "username", "telegramId", "email")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ("legacyUuid") DO UPDATE SET
           "userId"     = EXCLUDED."userId",
           "shortUuid"  = EXCLUDED."shortUuid",
           "username"   = EXCLUDED."username",
           "telegramId" = EXCLUDED."telegramId",
           "email"      = EXCLUDED."email",
           "capturedAt" = now()`,
        [
          user.uuid,
          user.id ?? null,
          user.shortUuid ?? null,
          user.username ?? null,
          user.telegramId != null ? Number(user.telegramId) : null,
          user.email ?? null,
        ],
      );
      captured++;
    }

    console.log(`Captured ${captured}${total ? `/${total}` : ''} users…`);

    if (users.length < PAGE_SIZE) break;
    if (total && captured >= total) break;
    start += PAGE_SIZE;
  }

  console.log(`\nSnapshot complete: ${captured} users written to remnawave_user_id_map.`);

  if (missingId > 0) {
    console.warn(
      `\nWARNING: ${missingId} users had no numeric "id" in the panel response.\n` +
        `Your panel predates the numeric id field. Upgrade the panel to the last\n` +
        `2.x release that exposes both "uuid" and "id", re-run this snapshot, and\n` +
        `only then move to v3 — otherwise those rows cannot be backfilled.`,
    );
    await db.end();
    process.exit(2);
  }

  await db.end();
}

main().catch((err) => {
  console.error('Snapshot failed:', err);
  process.exit(1);
});
