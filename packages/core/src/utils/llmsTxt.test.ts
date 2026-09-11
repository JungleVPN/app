import { describe, expect, it } from 'vitest';
import { buildLlmsTxt } from './llmsTxt';

describe('buildLlmsTxt', () => {
  it('links the global landing languages when the host is not RU-only', () => {
    const output = buildLlmsTxt('https://jungle-vpn.com', { ruOnly: false });

    expect(output).toContain('# JungleVPN');
    expect(output).toContain('[Home](https://jungle-vpn.com/)');
    expect(output).toContain('[English](https://jungle-vpn.com/en)');
    expect(output).toContain('[Arabic](https://jungle-vpn.com/ar)');
    expect(output).toContain('[Turkish](https://jungle-vpn.com/tr)');
  });

  it('omits the per-language landing links on an RU-only host', () => {
    const output = buildLlmsTxt('https://thejungle.pro', { ruOnly: true });

    expect(output).not.toContain('/en');
    expect(output).not.toContain('/ar');
    expect(output).not.toContain('/tr');
    expect(output).toContain('[Home](https://thejungle.pro/)');
  });

  it('always links the shared product and legal pages', () => {
    const output = buildLlmsTxt('https://jungle-vpn.com', { ruOnly: false });

    expect(output).toContain('[Get a Subscription](https://jungle-vpn.com/subscribe)');
    expect(output).toContain('[Affiliates](https://jungle-vpn.com/affiliates)');
    expect(output).toContain('[Sign in](https://jungle-vpn.com/login)');
    expect(output).toContain('[Terms of Service](https://jungle-vpn.com/terms)');
    expect(output).toContain('[Privacy Policy](https://jungle-vpn.com/privacy)');
  });
});
