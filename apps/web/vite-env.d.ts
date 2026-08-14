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

interface Window {
  /**
   * Set by the Tolt tracking script (`files.tlt-cdn.com/tlt.js`) once a referral
   * link has been resolved. Both are `null` until its `/clicks` call returns, so
   * reading them synchronously on mount will usually see nothing.
   */
  tolt_referral?: string | null;
  tolt_data?: {
    partner_id?: string;
    click_id?: string;
    program_id?: string;
    customer_id?: string | null;
    cookie_duration?: number;
  } | null;
}
