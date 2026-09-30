import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(cleanup);

// posthog-js reads `window.location` at import time (toolbar hash-param detection),
// which crashes under jsdom's minimal `window.location` mocks used across the test
// suite (e.g. i18n.test.ts). Real init/capture/identify behavior is covered by
// packages/core/src/utils/posthog.test.ts against this same mock shape.
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    get_explicit_consent_status: vi.fn().mockReturnValue('pending'),
    setPersonProperties: vi.fn(),
  },
}));

// jsdom has no `CSS.escape`; react-aria's collections (ComboBox, ListBox) call it
// to look items up by key while a list is open.
if (typeof globalThis.CSS?.escape !== 'function') {
  Object.assign(globalThis, {
    CSS: { ...globalThis.CSS, escape: (value: string) => value.replace(/[^\w-]/g, '\\$&') },
  });
}

// jsdom has no Web Animations API; react-aria's SelectionIndicator (Tabs) calls
// `element.getAnimations()` when the selection moves.
if (typeof Element.prototype.getAnimations !== 'function') {
  Object.assign(Element.prototype, { getAnimations: () => [] });
}
