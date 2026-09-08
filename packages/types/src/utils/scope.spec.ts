import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isGlobalOrigin } from './scope';

describe('isGlobalOrigin', () => {
  const ORIGINAL_RU = process.env.PUBLIC_DOMAIN_RU;

  beforeEach(() => {
    process.env.PUBLIC_DOMAIN_RU = 'thejungle.ru';
  });

  afterEach(() => {
    process.env.PUBLIC_DOMAIN_RU = ORIGINAL_RU;
  });

  it('is false when the origin host matches PUBLIC_DOMAIN_RU', () => {
    expect(isGlobalOrigin('https://thejungle.ru')).toBe(false);
  });

  it('is false for a www. variant of PUBLIC_DOMAIN_RU', () => {
    expect(isGlobalOrigin('https://www.thejungle.ru')).toBe(false);
  });

  it('is false for PUBLIC_DOMAIN_RU carrying a port', () => {
    expect(isGlobalOrigin('https://thejungle.ru:8443')).toBe(false);
  });

  it('is false regardless of case', () => {
    expect(isGlobalOrigin('https://THEJUNGLE.RU')).toBe(false);
  });

  it('is false for a host with the `ru` prefix convention, even off PUBLIC_DOMAIN_RU', () => {
    expect(isGlobalOrigin('https://ru-web.development-env.uk')).toBe(false);
  });

  it('is true for the production global domain', () => {
    expect(isGlobalOrigin('https://thejungle.pro')).toBe(true);
  });

  it('is true for a per-environment preview host that is not RU', () => {
    expect(isGlobalOrigin('https://eu-web.development-env.uk')).toBe(true);
  });

  it('is true for localhost', () => {
    expect(isGlobalOrigin('http://localhost:7080')).toBe(true);
  });

  it('is true for any non-RU host when PUBLIC_DOMAIN_RU is unset', () => {
    delete process.env.PUBLIC_DOMAIN_RU;
    expect(isGlobalOrigin('https://thejungle.ru')).toBe(true);
  });

  it('is false for null', () => {
    expect(isGlobalOrigin(null)).toBe(false);
  });

  it('is false for undefined', () => {
    expect(isGlobalOrigin(undefined)).toBe(false);
  });

  it('is false for an empty string', () => {
    expect(isGlobalOrigin('')).toBe(false);
  });

  it('is false for an unparseable origin', () => {
    expect(isGlobalOrigin('not-a-url')).toBe(false);
  });
});
