/// <reference types="vite/client" />

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.svg?url' {
  const content: string;
  export default content;
}

declare module '*.svg?react' {
  import type { FunctionComponent, SVGAttributes } from 'react';
  const ReactComponent: FunctionComponent<SVGAttributes<SVGElement>>;
  export default ReactComponent;
}

declare module '*.lottie?url' {
  const content: string;
  export default content;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

interface ImportMetaEnv {
  readonly VITE_SUBPAGE_CONFIG: string;
  readonly VITE_ALLOWED_AMOUNTS: string;
  readonly VITE_ALLOWED_PERIODS: string;
  readonly VITE_SUPPORT_URL: string;
  readonly VITE_TMA_APP_URL: string;
  readonly VITE_STARS_AMOUNT: string;
  readonly VITE_PAYMENTS_URL: string;
  readonly VITE_BOT_URL: string;
  readonly VITE_SUCCESS_STICKER_FILE_ID: string;
  /** Comma-separated Telegram user ids that have admin access, e.g. "123456,789012" */
  readonly VITE_ADMINS: string;
  /** Display price for one extra device slot, e.g. "199 ₽". */
  readonly VITE_EXTRA_DEVICE_PRICE: string;
  /** Number of Telegram Stars to charge for one extra device slot. */
  readonly VITE_EXTRA_DEVICE_STARS_AMOUNT: string;
  /** Telegram file ID for the extra device purchase page sticker. */
  readonly VITE_EXTRA_DEVICE_STICKER_FILE_ID: string;
  readonly VITE_MENU_STICKER_FILE_ID: string;
  readonly VITE_STRIPE_AMOUNT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
