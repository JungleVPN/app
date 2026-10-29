import { type ReactNode, useEffect, useRef } from 'react';
import { phCapture } from '../../../utils';

/** Top to bottom, as the sections are stacked on the landing page; the footer closes the page. */
const LANDING_SECTIONS = [
  'hero',
  'trust',
  'countries',
  'platforms',
  'bento_features',
  'how_it_works',
  'pricing',
  'comparison',
  'trial_banner',
  'info',
  'partnership',
  'faq',
  'trial_banner_bottom',
  'footer',
] as const;

export type LandingSection = (typeof LANDING_SECTIONS)[number];

/** A section counts as seen once its top passes into the upper 60% of the viewport, however tall it is. */
const SEEN_ROOT_MARGIN = '0px 0px -40% 0px';

function useReportOnFirstView<T extends Element>({
  section,
  enabled,
}: {
  section: LandingSection;
  enabled: boolean;
}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        phCapture('landing_section_viewed', {
          section,
          section_index: LANDING_SECTIONS.indexOf(section),
        });
      },
      { rootMargin: SEEN_ROOT_MARGIN },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [section, enabled]);

  return ref;
}

type TrackedSectionProps = {
  section: LandingSection;
  children: ReactNode;
};

/** Reports `landing_section_viewed` the first time the wrapped section scrolls into view. */
export function TrackedSection({ section, children }: TrackedSectionProps) {
  const ref = useReportOnFirstView<HTMLDivElement>({ section, enabled: true });

  return <div ref={ref}>{children}</div>;
}

type SectionReachedMarkerProps = {
  section: LandingSection;
  enabled?: boolean;
};

/**
 * A zero-height marker for a section that cannot be wrapped. The sticky footer is
 * pinned to the viewport bottom from the start, so it is reached when the page
 * content above it ends — place the marker as the last child of that content.
 */
export function SectionReachedMarker({ section, enabled = true }: SectionReachedMarkerProps) {
  const ref = useReportOnFirstView<HTMLDivElement>({ section, enabled });

  return <div ref={ref} aria-hidden='true' />;
}
