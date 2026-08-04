import type { TSubscriptionPageLanguageCode, TSubscriptionPageRawConfig } from '@workspace/types';
import LanguageDetector from 'i18next-browser-languagedetector';
import { create } from 'zustand';

const detector = new LanguageDetector();
detector.init({
  order: ['localStorage', 'navigator', 'htmlTag'],
  caches: ['localStorage'],
});

/**
 * Maps i18n language codes to their subpage-config equivalents when the panel
 * uses a different key. E.g. the panel stores Arabic under "fa" since it
 * predates first-class "ar" support.
 */
const SUBPAGE_LANG_ALIASES: Partial<Record<string, TSubscriptionPageLanguageCode>> = {
  ar: 'fa' as TSubscriptionPageLanguageCode,
};

function resolveSubpageLang(
  lang: string | undefined,
  supportedLocales: TSubscriptionPageLanguageCode[],
): TSubscriptionPageLanguageCode | undefined {
  if (!lang) return undefined;
  if (supportedLocales.includes(lang as TSubscriptionPageLanguageCode)) {
    return lang as TSubscriptionPageLanguageCode;
  }
  const alias = SUBPAGE_LANG_ALIASES[lang];
  if (alias && supportedLocales.includes(alias)) {
    return alias;
  }
  return undefined;
}

function detectLanguage(
  supportedLocales: TSubscriptionPageLanguageCode[],
): TSubscriptionPageLanguageCode {
  const detected = detector.detect();

  const lang = Array.isArray(detected) ? detected[0] : detected;
  const shortLang = lang?.split('-')[0];

  const resolved = resolveSubpageLang(shortLang, supportedLocales);
  if (resolved) {
    return resolved;
  }

  return supportedLocales[0];
}

export interface ISubscriptionConfigState {
  config: TSubscriptionPageRawConfig | null;
  currentLang: TSubscriptionPageLanguageCode;
  isConfigLoaded: boolean;
}

export interface ISubscriptionConfigActions {
  actions: {
    setConfig: (config: TSubscriptionPageRawConfig) => void;
    setLanguage: (lang: TSubscriptionPageLanguageCode) => void;
    getInitialState: () => ISubscriptionConfigState;
    resetState: () => void;
  };
}

const initialState: ISubscriptionConfigState = {
  config: null,
  currentLang: 'ru',
  isConfigLoaded: false,
};

export const useSubscriptionConfigStore = create<
  ISubscriptionConfigActions & ISubscriptionConfigState
>()((set) => ({
  ...initialState,
  actions: {
    setConfig: (config: TSubscriptionPageRawConfig) => {
      const detectedLang = detectLanguage(config.locales);
      set({
        config,
        currentLang: detectedLang,
        isConfigLoaded: true,
      });
    },

    setLanguage: (lang: TSubscriptionPageLanguageCode) => {
      const config = useSubscriptionConfigStore.getState().config;
      const locales = config?.locales ?? [];
      const subpageLang = resolveSubpageLang(lang, locales) ?? locales[0] ?? lang;
      set({ currentLang: subpageLang });
    },

    getInitialState: () => {
      return initialState;
    },

    resetState: () => {
      set({ ...initialState });
    },
  },
}));

export const useSubscriptionConfigStoreActions = () =>
  useSubscriptionConfigStore((store) => store.actions);

export const useSubscriptionConfigNullable = () =>
  useSubscriptionConfigStore((state) => state.config);

export const useSubscriptionConfig = (): TSubscriptionPageRawConfig => {
  const config = useSubscriptionConfigStore((state) => state.config);
  return config as TSubscriptionPageRawConfig;
};

export const useLocales = () => useSubscriptionConfigStore((state) => state.config?.locales);

export const useCurrentLang = () => useSubscriptionConfigStore((state) => state.currentLang);

export const useIsConfigLoaded = () => useSubscriptionConfigStore((state) => state.isConfigLoaded);
