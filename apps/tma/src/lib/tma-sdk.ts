import {
  backButton,
  closingBehavior,
  initData,
  init as initSDK,
  miniApp,
  retrieveLaunchParams,
  setDebug,
  swipeBehavior,
  themeParams,
  viewport,
} from '@tma.js/sdk-react';

import { bindTelegramDocumentColorScheme } from './sync-telegram-document-theme';

/**
 * Mount/bind must run once: React Strict Mode double-mounts components, and
 * `themeParams.bindCssVars()` / `viewport.bindCssVars()` throw if called again.
 */
let tmaShellInitialized = false;

export const initTma = async (options: {
  debug: boolean;
  eruda: boolean;
  mockForMacOS: boolean;
}) => {
  const launchParams = retrieveLaunchParams();
  if (tmaShellInitialized) {
    return { launchParams };
  }

  setDebug(options.debug);
  initSDK();

  // Add Eruda if needed.
  options.eruda &&
    void import('eruda').then(({ default: eruda }) => {
      eruda.init();
      eruda.position({ x: window.innerWidth - 50, y: 0 });
    });

  backButton.mount.ifAvailable();
  initData.restore();

  swipeBehavior.mount();
  closingBehavior.mount();
  closingBehavior.enableConfirmation();

  if (swipeBehavior.isSupported()) {
    swipeBehavior.disableVertical();
  }

  if (miniApp.mount.isAvailable()) {
    themeParams.mount();
    miniApp.mount();
    themeParams.bindCssVars();
    bindTelegramDocumentColorScheme();
  } else {
    bindTelegramDocumentColorScheme();
  }

  if (viewport.mount.isAvailable()) {
    void viewport.mount().then(() => {
      viewport.expand();
      if (launchParams.tgWebAppPlatform === 'ios' || launchParams.tgWebAppPlatform === 'android') {
        viewport.requestFullscreen();
      }
      viewport.bindCssVars();
    });
  }

  tmaShellInitialized = true;

  return { launchParams };
};
