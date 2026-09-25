import type {
  TSubscriptionPageBlockConfig,
  TSubscriptionPageButtonConfig,
  TSubscriptionPageLanguageCode,
  TSubscriptionPageLocalizedText,
  TSubscriptionPagePlatformKey,
} from '@workspace/types';
import { getLocalizedText } from '../../utils';

/** Resolves an i18n key, returning `fallback` when the locale files lack it. */
export type TTranslate = (key: string, fallback: string) => string;

export type TGuideButton = TSubscriptionPageButtonConfig & { label: string };

export type TGuideBlock = {
  title: string;
  description: string;
  svgIconKey: string;
  svgIconColor: TSubscriptionPageBlockConfig['svgIconColor'];
  buttons: TGuideButton[];
};

const STEP_ROLE_BY_ICON: Partial<Record<string, string>> = {
  DownloadIcon: 'install',
  Gear: 'instructions',
  CloudDownload: 'addSubscription',
  Check: 'connect',
};

const toKeySegment = (text: string) =>
  (text.match(/[A-Za-z0-9]+/g) ?? [])
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : word[0]?.toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join('');

const MISSING_KEY = 'subscriptionPage.__missing__';

export function translateGuideBlocks({
  platform,
  appName,
  blocks,
  panelLang,
  translate,
}: {
  platform: TSubscriptionPagePlatformKey;
  appName: string;
  blocks: TSubscriptionPageBlockConfig[];
  panelLang: TSubscriptionPageLanguageCode;
  translate: TTranslate;
}): TGuideBlock[] {
  const fromPanel = (text: TSubscriptionPageLocalizedText) => getLocalizedText(text, panelLang);
  const app = toKeySegment(appName);

  return blocks.map((block) => {
    const role = STEP_ROLE_BY_ICON[block.svgIconKey];
    const titleKey = role ? `subscriptionPage.guide.steps.${role}` : MISSING_KEY;
    const descriptionKey = role
      ? `subscriptionPage.guide.apps.${app}.${platform}.${role}`
      : MISSING_KEY;

    return {
      title: translate(titleKey, fromPanel(block.title)),
      description: translate(descriptionKey, fromPanel(block.description)),
      svgIconKey: block.svgIconKey,
      svgIconColor: block.svgIconColor,
      buttons: block.buttons.map((button) => {
        const segment = toKeySegment(button.text.en ?? '');
        const labelKey = segment ? `subscriptionPage.guide.buttons.${segment}` : MISSING_KEY;
        return { ...button, label: translate(labelKey, fromPanel(button.text)) };
      }),
    };
  });
}

export function translatePlatformName({
  platform,
  displayName,
  panelLang,
  translate,
}: {
  platform: TSubscriptionPagePlatformKey;
  displayName: TSubscriptionPageLocalizedText;
  panelLang: TSubscriptionPageLanguageCode;
  translate: TTranslate;
}): string {
  return translate(
    `subscriptionPage.platforms.${platform}`,
    getLocalizedText(displayName, panelLang),
  );
}
