/**
 * Which addresses count as "you are behind our VPN".
 *
 * The panel exposes two sources per node: the `address` it is reached on, and
 * an `ips[]` inventory that tags each address with a role. Every node in this
 * deployment currently reports `ips: []`, so `address` is the only signal we
 * have — but a bridge/primary topology means a visitor's observed public IP is
 * the *exit* node's address, and every exit node is in the same list. Once the
 * inventory is filled in, OUTBOUND entries are strictly better than `address`
 * and are added alongside it rather than replacing it.
 */

import { describe, expect, it } from 'vitest';
import { collectNodeIps } from './node-ips';

const node = (overrides: Record<string, unknown> = {}) => ({
  address: '1.1.1.1',
  countryCode: 'DE',
  isDisabled: false,
  ips: [],
  ...overrides,
});

describe('collectNodeIps', () => {
  it('maps a node address to the country the panel reports for it', () => {
    const ips = collectNodeIps([node({ address: '152.53.3.94', countryCode: 'AT' })]);

    expect(ips.get('152.53.3.94')).toBe('AT');
  });

  it('includes every node, so a visitor exiting via any of them is recognised', () => {
    const ips = collectNodeIps([
      node({ address: '65.108.214.39', countryCode: 'FI' }),
      node({ address: '152.53.192.146', countryCode: 'US' }),
    ]);

    expect([...ips.keys()]).toEqual(['65.108.214.39', '152.53.192.146']);
  });

  it('leaves out disabled nodes, which nobody can be exiting through', () => {
    const ips = collectNodeIps([node({ address: '9.9.9.9', isDisabled: true })]);

    expect(ips.has('9.9.9.9')).toBe(false);
  });

  it('adds OUTBOUND addresses from the inventory when the panel has them', () => {
    const ips = collectNodeIps([
      node({
        address: '10.0.0.1',
        countryCode: 'NL',
        ips: [{ ip: '203.0.113.7', status: 'OUTBOUND' }],
      }),
    ]);

    expect(ips.get('203.0.113.7')).toBe('NL');
  });

  it('ignores inventory addresses that no longer carry traffic', () => {
    const ips = collectNodeIps([
      node({
        ips: [
          { ip: '203.0.113.8', status: 'BLOCKED' },
          { ip: '203.0.113.9', status: 'DEPRECATED' },
          { ip: '203.0.113.10', status: 'RESERVE' },
        ],
      }),
    ]);

    expect([...ips.keys()]).toEqual(['1.1.1.1']);
  });

  it('normalises IPv6 so a differently-cased address still matches', () => {
    const ips = collectNodeIps([node({ ips: [{ ip: '2001:DB8::CAFE', status: 'OUTBOUND' }] })]);

    expect(ips.has('2001:db8::cafe')).toBe(true);
  });

  it('survives a node whose address the panel left blank', () => {
    const ips = collectNodeIps([node({ address: '' })]);

    expect(ips.size).toBe(0);
  });
});
