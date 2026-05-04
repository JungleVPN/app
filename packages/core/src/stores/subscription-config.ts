import type { TSubscriptionPageLanguageCode, TSubscriptionPageRawConfig } from '@workspace/types';
import LanguageDetector from 'i18next-browser-languagedetector';
import { create } from 'zustand';

const detector = new LanguageDetector();
detector.init({
  order: ['localStorage', 'navigator', 'htmlTag'],
  caches: ['localStorage'],
});

function detectLanguage(
  supportedLocales: TSubscriptionPageLanguageCode[],
): TSubscriptionPageLanguageCode {
  const detected = detector.detect();

  const lang = Array.isArray(detected) ? detected[0] : detected;
  const shortLang = lang?.split('-')[0];

  if (shortLang && supportedLocales.includes(shortLang as TSubscriptionPageLanguageCode)) {
    detector.cacheUserLanguage(shortLang);
    return shortLang as TSubscriptionPageLanguageCode;
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
      console.log(detectedLang);
      set({
        config,
        currentLang: detectedLang,
        isConfigLoaded: true,
      });
    },

    setLanguage: (lang: TSubscriptionPageLanguageCode) => {
      detector.cacheUserLanguage(lang);
      set({ currentLang: lang });
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
