export interface LlmsTxtOptions {
  /** RU domains don't serve /en, /ar or /tr, so those links would 404 there. */
  ruOnly: boolean;
}

/** Builds the /llms.txt body (llmstxt.org format) for a given origin. */
export function buildLlmsTxt(origin: string, { ruOnly }: LlmsTxtOptions): string {
  const landingLinks = ruOnly
    ? [`- [Home](${origin}/): JungleVPN overview and plans`]
    : [
        `- [Home](${origin}/): JungleVPN overview and plans`,
        `- [English](${origin}/en): English landing page`,
        `- [Arabic](${origin}/ar): Arabic landing page`,
        `- [Turkish](${origin}/tr): Turkish landing page`,
      ];

  return [
    '# JungleVPN',
    '',
    '> JungleVPN is a fast, secure VPN with unlimited traffic and support for every device — for home, travel, and public Wi-Fi.',
    '',
    '## Product',
    '',
    ...landingLinks,
    `- [Get a Subscription](${origin}/subscribe): Compare and purchase VPN plans`,
    `- [Affiliates](${origin}/affiliates): JungleVPN's affiliate program`,
    `- [Sign in](${origin}/login): Customer sign-in`,
    '',
    '## Legal',
    '',
    `- [Terms of Service](${origin}/terms)`,
    `- [Privacy Policy](${origin}/privacy)`,
    '',
  ].join('\n');
}
