import path from 'node:path';
import * as process from 'node:process';
import { config } from 'dotenv';
import type { ClientConfig } from 'pg';

/**
 * Loads the same env files datasource.ts does, in the same order.
 *
 * Standalone scripts are run by hand, often from the repo root and often
 * against a database whose credentials only live in `.env`. Requiring them to
 * be re-supplied inline is how a script ends up pointed somewhere unintended.
 */
export function loadEnvFiles(cwd: string = process.cwd()): void {
  for (const file of ['.env.development', '../../.env.development', '.env', '../../.env']) {
    config({ path: path.resolve(cwd, file) });
  }
}

/**
 * Postgres connection settings for the standalone scripts.
 *
 * Deliberately reads the same POSTGRES_* variables as datasource.ts. The
 * snapshot writes the uuid→id map that `migration:run` later reads, and the
 * migration only checks that the map table is non-empty — it cannot tell that
 * the map was captured into a different database, so the two must not be
 * configurable in different ways.
 *
 * DATABASE_URL still wins when a deployment supplies one.
 */
export function resolveDbConfig(env: NodeJS.ProcessEnv = process.env): ClientConfig {
  if (env.DATABASE_URL) {
    return { connectionString: env.DATABASE_URL };
  }

  const missing = (['POSTGRES_USER', 'POSTGRES_DB'] as const).filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing database configuration: ${missing.join(', ')}. ` +
        `Set the POSTGRES_* variables (as in .env, the same ones the migrations use), ` +
        `or supply a single DATABASE_URL.`,
    );
  }

  return {
    host: env.POSTGRES_HOST || 'localhost',
    port: Number(env.POSTGRES_PORT) || 5432,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
  };
}

/** How the resolved settings should be described in logs — never the password. */
export function describeDbConfig(config: ClientConfig): string {
  if (config.connectionString) {
    return config.connectionString.replace(/:\/\/([^:@/]+):[^@]*@/, '://$1:***@');
  }
  return `${config.user}@${config.host}:${config.port}/${config.database}`;
}
