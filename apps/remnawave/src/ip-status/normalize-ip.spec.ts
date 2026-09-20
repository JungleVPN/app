/**
 * The two addresses being compared arrive from very different places — one from
 * a human typing into the panel's node form, one from a dual-stack socket
 * behind Caddy — so they need flattening to a common form before an equality
 * check means anything.
 */

import { describe, expect, it } from 'vitest';
import { normalizeIp } from './normalize-ip';

describe('normalizeIp', () => {
  it('leaves a plain IPv4 address alone', () => {
    expect(normalizeIp('152.53.3.94')).toBe('152.53.3.94');
  });

  it('unwraps the IPv4-mapped form a dual-stack socket reports', () => {
    expect(normalizeIp('::ffff:152.53.3.94')).toBe('152.53.3.94');
  });

  it('lowercases IPv6 so panel-entered and socket-reported forms agree', () => {
    expect(normalizeIp('2001:DB8::1')).toBe('2001:db8::1');
  });

  it('drops a port from an IPv4 address', () => {
    expect(normalizeIp('152.53.3.94:51820')).toBe('152.53.3.94');
  });

  it('drops the brackets and port from an IPv6 address', () => {
    expect(normalizeIp('[2001:db8::1]:443')).toBe('2001:db8::1');
  });

  it('keeps a bare IPv6 address whole rather than reading its colons as a port', () => {
    expect(normalizeIp('2001:db8::1')).toBe('2001:db8::1');
  });

  it('drops a link-local zone index, which means nothing off the originating host', () => {
    expect(normalizeIp('fe80::1%eth0')).toBe('fe80::1');
  });

  it('trims surrounding whitespace left in a panel field', () => {
    expect(normalizeIp('  10.0.0.1  ')).toBe('10.0.0.1');
  });

  it.each([undefined, null, '', '   '])('reports %p as no address at all', (input) => {
    expect(normalizeIp(input as string)).toBeNull();
  });
});
