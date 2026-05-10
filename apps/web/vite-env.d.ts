/// <reference types="vite/client" />

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.svg?react' {
  import type { FunctionComponent, SVGAttributes } from 'react';
  const ReactComponent: FunctionComponent<SVGAttributes<SVGElement>>;
  export default ReactComponent;
}

declare module '*.svg?url' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_REMNAWAVE_URL: string;
  readonly VITE_REMNAWAVE_TOKEN: string;
  readonly VITE_BUY_LINK: string;
  readonly VITE_CRYPTO_LINK: string;
  readonly VITE_REDIRECT_LINK: string;
  readonly VITE_AUTH_API_KEY: string;
  readonly VITE_CUSTOM_SUB_DOMAIN: string;
  readonly VITE_TELEGRAM_BOT_TOKEN: string;
  readonly VITE_FORCE_SNOWFLAKES: string;
  readonly VITE_INTERNAL_SQUADS: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
