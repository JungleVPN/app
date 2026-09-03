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
  },
}));
