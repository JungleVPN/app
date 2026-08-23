/**
 * Connection settings for the standalone scripts.
 *
 * These have to agree with datasource.ts, because the snapshot writes the
 * uuid→id map that `migration:run` later reads. Configuring them differently
 * makes it possible to snapshot one database and migrate another — and the
 * migration cannot tell, it only checks that the map table is non-empty.
 */

import { describe, expect, it } from 'vitest';
import { resolveDbConfig } from './db-config';

describe('resolveDbConfig', () => {
  const POSTGRES = {
    POSTGRES_HOST: 'stage-jungle-database',
    POSTGRES_PORT: '5432',
    POSTGRES_USER: 'postgres',
    POSTGRES_PASSWORD: 'secret',
    POSTGRES_DB: 'postgres',
  };

  it('uses the same POSTGRES_* variables the datasource uses', () => {
    expect(resolveDbConfig(POSTGRES)).toEqual({
      host: 'stage-jungle-database',
      port: 5432,
      user: 'postgres',
      password: 'secret',
      database: 'postgres',
    });
  });

  it('defaults the host and port the way the datasource does', () => {
    const config = resolveDbConfig({ POSTGRES_USER: 'postgres', POSTGRES_DB: 'postgres' });

    expect(config).toMatchObject({ host: 'localhost', port: 5432 });
  });

  it('ignores a non-numeric port rather than passing NaN to the driver', () => {
    expect(resolveDbConfig({ ...POSTGRES, POSTGRES_PORT: 'nope' })).toMatchObject({ port: 5432 });
  });

  it('prefers DATABASE_URL when a deployment supplies one', () => {
    const config = resolveDbConfig({ ...POSTGRES, DATABASE_URL: 'postgres://u:p@db:5432/app' });

    expect(config).toEqual({ connectionString: 'postgres://u:p@db:5432/app' });
  });

  it('falls through to POSTGRES_* when DATABASE_URL is present but blank', () => {
    const config = resolveDbConfig({ ...POSTGRES, DATABASE_URL: '' });

    expect(config).toMatchObject({ host: 'stage-jungle-database' });
  });

  it('reports what is missing instead of connecting to a half-configured database', () => {
    expect(() => resolveDbConfig({ POSTGRES_HOST: 'db' })).toThrow(/POSTGRES_USER/);
    expect(() => resolveDbConfig({ POSTGRES_HOST: 'db' })).toThrow(/POSTGRES_DB/);
  });

  it('names every missing variable at once, not just the first', () => {
    expect(() => resolveDbConfig({})).toThrow(
      /POSTGRES_USER.*POSTGRES_DB|POSTGRES_DB.*POSTGRES_USER/s,
    );
  });

  it('accepts an empty password, which is valid for trust auth', () => {
    const config = resolveDbConfig({ ...POSTGRES, POSTGRES_PASSWORD: '' });

    expect(config).toMatchObject({ password: '' });
  });
});
