import type { TSubscriptionPageBlockConfig } from '@workspace/types';
import i18next from 'i18next';
import { describe, expect, it } from 'vitest';
import en from '../../core/i18n/locales/en.json';
import pt from '../../core/i18n/locales/pt.json';
import ru from '../../core/i18n/locales/ru.json';
import { translateGuideBlocks, translatePlatformName } from './guideText';

async function translatorFor(lng: 'en' | 'pt' | 'ru') {
  const instance = i18next.createInstance();
  await instance.init({
    lng,
    resources: { en: { translation: en }, pt: { translation: pt }, ru: { translation: ru } },
  });
  return (key: string, fallback: string) => instance.t(key, { defaultValue: fallback });
}

function panelBlock(overrides: Partial<TSubscriptionPageBlockConfig> = {}) {
  return {
    svgIconKey: 'DownloadIcon',
    svgIconColor: 'violet',
    title: { en: 'Panel title', ru: 'Заголовок панели' },
    description: { en: 'Panel description', ru: 'Описание панели' },
    buttons: [],
    ...overrides,
  } as TSubscriptionPageBlockConfig;
}

describe('translateGuideBlocks', () => {
  it('reads step titles and descriptions from the locale files, not the panel', async () => {
    const [block] = translateGuideBlocks({
      platform: 'android',
      appName: 'Happ',
      blocks: [panelBlock({ svgIconKey: 'CloudDownload' })],
      panelLang: 'ru',
      translate: await translatorFor('pt'),
    });

    expect(block?.title).toBe(pt.subscriptionPage.guide.steps.addSubscription);
    expect(block?.description).toBe(pt.subscriptionPage.guide.apps.happ.android.addSubscription);
  });

  it('translates buttons by their English panel label', async () => {
    const [block] = translateGuideBlocks({
      platform: 'android',
      appName: 'Happ',
      blocks: [
        panelBlock({
          buttons: [
            {
              type: 'external',
              link: 'https://example.com/happ.apk',
              svgIconKey: 'ExternalLink',
              text: { en: 'Download APK', ru: 'Скачать APK' },
            },
          ],
        }),
      ],
      panelLang: 'ru',
      translate: await translatorFor('pt'),
    });

    expect(block?.buttons[0]?.label).toBe(pt.subscriptionPage.guide.buttons.downloadApk);
    expect(block?.buttons[0]?.link).toBe('https://example.com/happ.apk');
  });

  it('falls back to panel text in the panel language for content the locale files do not know', async () => {
    const [block] = translateGuideBlocks({
      platform: 'ios',
      appName: 'Brand New App',
      blocks: [
        panelBlock({
          svgIconKey: 'Sparkles',
          buttons: [
            {
              type: 'external',
              link: 'https://example.com',
              svgIconKey: 'ExternalLink',
              text: { en: 'Something unseen', ru: 'Что-то новое' },
            },
          ],
        }),
      ],
      panelLang: 'ru',
      translate: await translatorFor('en'),
    });

    expect(block?.title).toBe('Заголовок панели');
    expect(block?.description).toBe('Описание панели');
    expect(block?.buttons[0]?.label).toBe('Что-то новое');
  });

  it('keeps the panel-provided icon and color', async () => {
    const [block] = translateGuideBlocks({
      platform: 'ios',
      appName: 'Happ',
      blocks: [panelBlock({ svgIconKey: 'Check', svgIconColor: 'teal' })],
      panelLang: 'en',
      translate: await translatorFor('ru'),
    });

    expect(block).toMatchObject({ svgIconKey: 'Check', svgIconColor: 'teal' });
    expect(block?.title).toBe(ru.subscriptionPage.guide.steps.connect);
  });
});

describe('translatePlatformName', () => {
  it('reads the platform name from the locale files', async () => {
    const name = translatePlatformName({
      platform: 'androidTV',
      displayName: { en: 'Panel TV' },
      panelLang: 'en',
      translate: await translatorFor('ru'),
    });

    expect(name).toBe(ru.subscriptionPage.platforms.androidTV);
  });
});
