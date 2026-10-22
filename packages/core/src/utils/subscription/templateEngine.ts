import type { TSubscriptionPageTemplateKey } from '@remnawave/subscription-page-types';

type TemplateValues = {
  [key in TSubscriptionPageTemplateKey]: number | string | undefined;
};

export class TemplateEngine {
  static formatWithMetaInfo(
    template: string,
    metaInfo: { subscriptionUrl: string; username: string },
  ): string {
    return TemplateEngine.replace(template, {
      USERNAME: metaInfo.username,
      SUBSCRIPTION_LINK: metaInfo.subscriptionUrl,
      HAPP_CRYPT3_LINK: undefined,
      HAPP_CRYPT4_LINK: undefined,
    });
  }

  static replace(template: string, values: TemplateValues): string {
    let hasReplacement = false;
    const result = template.replace(
      /\{\{(\w+)\}\}/g,
      (match, key: TSubscriptionPageTemplateKey) => {
        if (values[key] !== undefined) {
          hasReplacement = true;
          return values[key]?.toString() || '';
        }
        return match;
      },
    );

    return hasReplacement ? result : template;
  }
}
