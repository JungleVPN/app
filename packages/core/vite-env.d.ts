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
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Set by the Tolt tracking script (`cdn.tolt.io/tolt.js`) once a referral is attributed. */
  tolt_referral?: string;
}
